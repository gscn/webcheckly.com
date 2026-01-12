"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import KatanaResults from "@/components/deep-scan/KatanaResults"
import { useLanguage } from "@/contexts/LanguageContext"
import { createScanTask, streamTaskStatus, TaskStatusResponse } from "@/services/taskService"
import { authenticatedFetch } from "@/services/authService"
import { TaskResults, KatanaResult, ScanResult } from "@/types/scan"
import { debugError } from "@/utils/config"
import { buildReport } from "@/utils/report"
import { exportJSON, exportMarkdown, exportExcel } from "@/utils/export"

export default function DeepCheckPage() {
  const { t, locale } = useLanguage()

  const [targetUrl, setTargetUrl] = useState<string>("")
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle")
  const [error, setError] = useState<string>("")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [moduleStatuses, setModuleStatuses] = useState<Record<string, any>>({})
  const [results, setResults] = useState<TaskResults | null>(null)
  const stopPollingRef = useRef<(() => void) | null>(null)

  // 清理函数
  const cleanup = useCallback(() => {
    if (stopPollingRef.current) {
      stopPollingRef.current()
      stopPollingRef.current = null
    }
  }, [])

  // 组件卸载时清理SSE连接
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // 使用useCallback优化startScan函数
  const startScan = useCallback(async () => {
    if (!targetUrl.trim()) {
      setError(t("deepCheck.errors.urlRequired"))
      return
    }

    // 验证URL格式
    try {
      new URL(targetUrl)
    } catch {
      setError(t("deepCheck.errors.invalidUrl"))
      return
    }

    setError("")
    setState("running")
    setResults(null)
    setModuleStatuses({})

    try {
      // 创建网站链接深度检查任务（仅使用Katana进行链接深度检查）
      const taskResponse = await createScanTask({
        url: targetUrl,
        options: ["katana"], // 仅使用Katana进行网站链接深度检查
        language: locale,
        ai_mode: "balanced",
      })

      setTaskId(taskResponse.id)

      // 使用SSE流式获取任务状态和结果
      const stopStreaming = streamTaskStatus(
        taskResponse.id,
        // 状态更新
        (status: TaskStatusResponse) => {
          setModuleStatuses(status.modules || {})
          
          if (status.status === "running") {
            setState("running")
          } else if (status.status === "completed") {
            setState("done")
          } else if (status.status === "failed") {
            setState("error")
            setError(status.error || t("errors.scanFailed"))
          }
        },
        // 模块状态更新
        (module: string, moduleStatus: any) => {
          setModuleStatuses((prev) => ({
            ...prev,
            [module]: moduleStatus,
          }))
        },
        // 实时结果更新（katana发现的链接）
        (result: any) => {
          // 如果是katana单个结果，实时更新
          // 后端推送的是KatanaResult结构体，JSON字段名是小写的（url, status等）
          if (result.url || result.URL || (result.request && result.request.endpoint)) {
            setResults((prev) => {
              if (!prev) {
                prev = { summary: { total: 0, alive: 0, dead: 0, avg_response: 0, timeout: false } }
              }
              const currentKatana = (prev.katana_results as KatanaResult[]) || []
              // 检查是否已存在（避免重复）- 使用Set优化查找性能
              const url = result.url || result.URL || result.request?.endpoint
              if (url) {
                // 使用Set优化查找性能（O(1) vs O(n)）
                const urlSet = new Set(currentKatana.map(r => r.url))
                if (!urlSet.has(url)) {
                  // 转换为KatanaResult格式（后端JSON标签是小写，但Go结构体字段是大写）
                  const katanaResult: KatanaResult = {
                    url: url,
                    source: result.source || result.Source || "",
                    method: result.method || result.Method || result.request?.method || "GET",
                    status: result.status || result.Status || result.response?.status_code || result.status_code || 0,
                    title: result.title || result.Title || "",
                    type: result.type || result.Type || "",
                    length: result.length || result.Length || result.response?.content_length || result.content_length || 0,
                    response: result.response || result.Response || result.response_time || result.response?.response_time || "",
                  }
                  // 使用函数式更新，确保状态更新正确
                  return {
                    ...prev,
                    katana_results: [...currentKatana, katanaResult],
                  }
                }
              }
              return prev
            })
          } else if (result.katana_results) {
            // 完整结果更新（批量更新）- 需要去重
            setResults((prev) => {
              const newKatanaResults = result.katana_results as KatanaResult[] || []
              const prevKatanaResults = (prev?.katana_results as KatanaResult[]) || []
              
              // 合并并去重：使用Set确保URL唯一
              const urlSet = new Set<string>()
              const merged: KatanaResult[] = []
              
              // 先添加已有的结果
              for (const item of prevKatanaResults) {
                if (item.url && !urlSet.has(item.url)) {
                  urlSet.add(item.url)
                  merged.push(item)
                }
              }
              
              // 再添加新结果（跳过已存在的URL）
              for (const item of newKatanaResults) {
                if (item.url && !urlSet.has(item.url)) {
                  urlSet.add(item.url)
                  merged.push(item)
                }
              }
              
              return {
                ...prev,
                ...result,
                katana_results: merged,
              }
            })
          }
        },
        // 完成
        (data: any) => {
          setState("done")
          // 最终获取完整结果（确保所有数据都已同步）
          authenticatedFetch(`/api/scans/${taskResponse.id}/results`)
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
              }
              return res.json()
            })
            .then((taskResults) => {
              setResults(taskResults)
            })
            .catch((err) => {
              debugError("[DeepCheckPage] Error getting final results:", err)
              // 即使获取最终结果失败，也不影响已显示的结果
              console.warn("[DeepCheckPage] Failed to fetch final results, but partial results may already be displayed")
            })
        },
        // 错误
        (error: string) => {
          debugError("[DeepCheckPage] Stream error:", error)
          // 只有在没有结果时才设置为错误状态，否则保持done状态并显示部分结果
          if (!results || (results?.katana_results?.length || 0) === 0) {
            setState("error")
            setError(error)
          } else {
            // 有部分结果，只显示警告
            console.warn("[DeepCheckPage] Stream error but partial results available:", error)
          }
        }
      )

      stopPollingRef.current = stopStreaming
    } catch (err: any) {
      debugError("[DeepCheckPage] Error creating task:", err)
      setState("error")
      setError(err.message || t("errors.scanFailed"))
    }
  }, [targetUrl, locale, t, results])

  const handleStop = useCallback(() => {
    cleanup()
    setState("idle")
    setTaskId(null)
  }, [cleanup])

  // 从结果中提取链接检查数据（使用useMemo优化）
  const katanaResultsRaw = useMemo(() => {
    return results?.katana_results as KatanaResult[] | undefined
  }, [results?.katana_results])

  const mergedLinkHealth = useMemo(() => {
    return results?.link_health as ScanResult[] | undefined
  }, [results?.link_health])

  // 使用link_health数据补充katana结果的标题和响应时间
  const katanaResults = useMemo(() => {
    if (!katanaResultsRaw) return undefined
    
    // 创建link_health的URL映射，用于快速查找
    const linkHealthMap = new Map<string, ScanResult>()
    if (mergedLinkHealth) {
      mergedLinkHealth.forEach((item) => {
        linkHealthMap.set(item.url, item)
      })
    }
    
    // 补充katana结果的标题和响应时间
    return katanaResultsRaw.map((katanaResult) => {
      const linkHealth = linkHealthMap.get(katanaResult.url)
      if (linkHealth) {
        // 如果katana结果中没有标题，使用link_health的标题
        if (!katanaResult.title && linkHealth.title) {
          katanaResult = { ...katanaResult, title: linkHealth.title }
        }
        // 如果katana结果中没有响应时间，使用link_health的响应时间
        // 注意：response_time 为 0 时也需要补充（0 是有效的响应时间）
        if (!katanaResult.response && typeof linkHealth.response_time === 'number') {
          katanaResult = { ...katanaResult, response: `${linkHealth.response_time}ms` }
        }
      }
      return katanaResult
    })
  }, [katanaResultsRaw, mergedLinkHealth])

  // 导出功能（使用useCallback优化）
  const handleExport = useCallback((type: "json" | "markdown" | "excel") => {
    if (!results || !targetUrl) return

    try {
      // 构建报告数据
      const report = buildReport(
        targetUrl,
        mergedLinkHealth || [],
        results.website_info || null,
        results.domain_info || null,
        results.ssl_info || null,
        results.tech_stack || null,
        results.ai_analysis || null,
        results.performance || null,
        results.seo_compliance || null,
        results.security_risk || null,
        results.accessibility || null
      )

      // 添加katana结果到报告
      if (katanaResults && katanaResults.length > 0) {
        // 将katana结果转换为ScanResult格式
        const katanaAsScanResults: ScanResult[] = katanaResults.map((k) => ({
          url: k.url,
          status: k.status,
          title: k.title || "",
          response_time: k.response ? (parseInt(k.response.replace(/[^0-9]/g, "")) || 0) : 0,
          ip: "",
          tls: false,
          cdn: false,
        }))
        report.results = [...report.results, ...katanaAsScanResults]
      }

      switch (type) {
        case "json":
          exportJSON(report)
          break
        case "markdown":
          exportMarkdown(report, locale)
          break
        case "excel":
          exportExcel(report, locale)
          break
      }
    } catch (err) {
      debugError("[DeepCheckPage] Export failed:", err)
      setError(err instanceof Error ? err.message : t("errors.scanFailed"))
    }
  }, [results, targetUrl, katanaResults, mergedLinkHealth, locale, t])

  return (
    <div className="min-h-screen flex flex-col bg-tech-bg">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-tech-cyan/20 to-tech-cyan/10 rounded-xl flex items-center justify-center shadow-lg shadow-tech-cyan/20 border border-tech-cyan/30">
              <svg className="w-6 h-6 text-tech-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {t("deepCheck.title")}
              </h1>
              <p className="text-gray-400 text-sm mt-1">{t("deepCheck.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* URL输入区域 */}
        <div className="mb-8 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && state !== "running" && targetUrl.trim()) {
                    e.preventDefault()
                    startScan()
                  }
                }}
                placeholder={t("deepCheck.urlInput.placeholder")}
                disabled={state === "running"}
                className="w-full pl-12 pr-4 py-3 bg-gray-900/80 border border-tech-border/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan/50 focus:ring-2 focus:ring-tech-cyan/20 disabled:opacity-50 transition-all backdrop-blur-sm"
              />
            </div>
            {state === "running" ? (
              <button
                onClick={handleStop}
                className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 text-red-400 rounded-xl hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg shadow-red-500/10 hover:shadow-red-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t("deepCheck.errors.stop")}
              </button>
            ) : (
              <button
                onClick={startScan}
                disabled={!targetUrl.trim()}
                className="px-6 py-3 bg-gradient-to-r from-tech-cyan/20 to-cyan-500/20 border border-tech-cyan/50 text-tech-cyan rounded-xl hover:from-tech-cyan/30 hover:to-cyan-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg shadow-tech-cyan/10 hover:shadow-tech-cyan/20 disabled:shadow-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t("deepCheck.urlInput.startScan")}
              </button>
            )}
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fadeIn flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {state === "error" && (
                  <button
                    onClick={() => {
                      setError("")
                      setState("idle")
                      setResults(null)
                      setModuleStatuses({})
                    }}
                    className="mt-2 text-xs text-red-300 hover:text-red-200 underline transition-colors"
                  >
                    {t("deepCheck.results.tryAgain") || "重试"}
                  </button>
                )}
              </div>
              <button
                onClick={() => setError("")}
                className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
                aria-label="关闭错误提示"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 结果展示区域 - 支持实时流式显示 */}
        {(state === "running" || state === "done") && (
          <div className="space-y-6 animate-fadeIn">
            {/* 导出功能 - 仅在完成且有结果时显示 */}
            {state === "done" && (katanaResults?.length || 0) > 0 && (
              <div className="border border-tech-cyan/20 rounded-xl p-6 bg-gradient-to-br from-tech-cyan/5 to-transparent backdrop-blur-sm animate-slideUp shadow-lg shadow-tech-cyan/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-tech-cyan/20 rounded-lg flex items-center justify-center border border-tech-cyan/30">
                      <svg className="w-5 h-5 text-tech-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{t("deepCheck.export.title")}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t("deepCheck.export.description")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleExport("json")}
                    className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/30 text-tech-cyan rounded-lg hover:bg-tech-cyan/20 hover:border-tech-cyan/50 transition-all duration-200 flex items-center gap-2 text-sm font-medium group"
                    title={t("deepCheck.export.json")}
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {t("deepCheck.export.json")}
                  </button>
                  <button
                    onClick={() => handleExport("markdown")}
                    className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/30 text-tech-cyan rounded-lg hover:bg-tech-cyan/20 hover:border-tech-cyan/50 transition-all duration-200 flex items-center gap-2 text-sm font-medium group"
                    title={t("deepCheck.export.markdown")}
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t("deepCheck.export.markdown")}
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/30 text-tech-cyan rounded-lg hover:bg-tech-cyan/20 hover:border-tech-cyan/50 transition-all duration-200 flex items-center gap-2 text-sm font-medium group"
                    title={t("deepCheck.export.excel")}
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t("deepCheck.export.excel")}
                  </button>
                </div>
              </div>
            )}

            {/* 链接检查结果 - 实时显示 */}
            {katanaResults && katanaResults.length > 0 && (
              <div className="animate-slideUp" key={`katana-results-${katanaResults.length}`}>
                <KatanaResults results={katanaResults} />
              </div>
            )}
            
            {/* 合并后的链接健康检查结果 */}
            {mergedLinkHealth && mergedLinkHealth.length > 0 && (
              <div className="border border-tech-cyan/20 rounded-lg p-4 bg-tech-cyan/5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-tech-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-tech-cyan">{t("deepCheck.results.mergedTitle")}</h3>
                </div>
                <p className="text-xs text-gray-400">
                  {t("deepCheck.results.mergedDesc")} ({mergedLinkHealth.length} {t("deepCheck.results.links")})
                </p>
              </div>
            )}

            {/* 运行中但还没有结果 */}
            {state === "running" && (!katanaResults || katanaResults.length === 0) && (
              <div className="border border-tech-border/20 rounded-xl p-8 bg-gradient-to-br from-tech-bg/50 to-gray-900/30 text-center backdrop-blur-sm animate-pulse-glow">
                <div className="flex flex-col items-center justify-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-tech-cyan/20 border-t-tech-cyan rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-tech-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white mb-1">{t("deepCheck.status.running")}</p>
                    <p className="text-sm text-gray-400">{t("deepCheck.status.discovering")}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-tech-cyan rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-tech-cyan rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-tech-cyan rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            )}

            {/* 无结果提示（仅在完成时显示） */}
            {state === "done" && (!katanaResults || katanaResults.length === 0) && (!mergedLinkHealth || mergedLinkHealth.length === 0) && (
              <div className="border border-tech-border/20 rounded-xl p-8 bg-gradient-to-br from-tech-bg/50 to-gray-900/30 text-center backdrop-blur-sm">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t("deepCheck.results.noResults")}</h3>
                <p className="text-sm text-gray-400 mb-4">{t("deepCheck.results.noResultsDesc")}</p>
                <button
                  onClick={() => {
                    setState("idle")
                    setResults(null)
                    setError("")
                  }}
                  className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/30 text-tech-cyan rounded-lg hover:bg-tech-cyan/20 transition-all duration-200 text-sm font-medium"
                >
                  {t("deepCheck.results.tryAgain") || "重新检查"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 空状态 */}
        {state === "idle" && (
          <div className="text-center py-16 animate-fadeIn">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-tech-cyan/20 to-tech-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-tech-cyan/30 shadow-lg shadow-tech-cyan/10">
                <svg className="w-10 h-10 text-tech-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {t("deepCheck.status.idle")}
              </h3>
              <p className="text-gray-400 mb-6">{t("deepCheck.status.idleDesc")}</p>
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-tech-border/20 rounded-xl p-4 text-left backdrop-blur-sm">
                <p className="text-sm text-gray-300 mb-3 font-semibold">{t("deepCheck.status.features")}:</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-center gap-2 hover:text-tech-cyan transition-colors">
                    <svg className="w-4 h-4 text-tech-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t("deepCheck.status.feature1")}
                  </li>
                  <li className="flex items-center gap-2 hover:text-tech-cyan transition-colors">
                    <svg className="w-4 h-4 text-tech-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t("deepCheck.status.feature2")}
                  </li>
                  <li className="flex items-center gap-2 hover:text-tech-cyan transition-colors">
                    <svg className="w-4 h-4 text-tech-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t("deepCheck.status.feature3")}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
