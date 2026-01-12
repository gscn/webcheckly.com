"use client"

import { useState, useMemo, memo, useEffect } from "react"
import { KatanaResult } from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

interface KatanaResultsProps {
  results: KatanaResult[] | undefined
}

function KatanaResults({ results }: KatanaResultsProps) {
  const { t } = useLanguage()
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [displayedCount, setDisplayedCount] = useState<number>(50)

  // 当筛选条件改变时，重置显示数量
  useEffect(() => {
    setDisplayedCount(50)
  }, [filterType, filterStatus, searchQuery])

  // 去重：确保每个URL只出现一次（保留第一个出现的）
  const uniqueResults = useMemo(() => {
    if (!results) return []
    const seen = new Set<string>()
    const unique: KatanaResult[] = []
    for (const result of results) {
      const url = result.url || ""
      if (url && !seen.has(url)) {
        seen.add(url)
        unique.push(result)
      }
    }
    return unique
  }, [results])

  const filteredResults = useMemo(() => {
    if (!uniqueResults) return []

    return uniqueResults.filter((result) => {
      // 类型过滤 - 严格匹配，处理空值、undefined和空字符串
      if (filterType !== "all") {
        // 规范化类型值：空值、undefined、空字符串都视为"unknown"
        const resultType = (result.type && result.type.trim()) || "unknown"
        // 严格匹配（区分大小写）
        if (resultType !== filterType) {
          return false
        }
      }

      // 状态过滤 - 修复逻辑：成功(200-399)，错误(>=400)
      if (filterStatus !== "all") {
        if (filterStatus === "success" && (result.status < 200 || result.status >= 400)) return false
        if (filterStatus === "error" && result.status < 400) return false
      }

      // 搜索过滤 - 支持搜索URL、标题、类型、状态码、方法
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return true
        
        // URL搜索
        if (result.url && result.url.toLowerCase().includes(query)) {
          return true
        }
        
        // 标题搜索
        if (result.title && result.title.toLowerCase().includes(query)) {
          return true
        }
        
        // 类型搜索
        if (result.type && result.type.trim().toLowerCase().includes(query)) {
          return true
        }
        
        // 状态码搜索（支持数字字符串）
        if (String(result.status).includes(query)) {
          return true
        }
        
        // 方法搜索
        if (result.method && result.method.toLowerCase().includes(query)) {
          return true
        }
        
        // 来源搜索
        if (result.source && result.source.toLowerCase().includes(query)) {
          return true
        }
        
        return false
      }

      return true
    })
  }, [uniqueResults, filterType, filterStatus, searchQuery])

  // 排序：错误链接置顶，相同状态按URL排序
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      // 错误链接（status >= 400）置顶
      const aIsError = a.status >= 400
      const bIsError = b.status >= 400
      if (aIsError !== bIsError) {
        return aIsError ? -1 : 1
      }
      // 相同状态按URL排序
      return a.url.localeCompare(b.url)
    })
  }, [filteredResults])

  // 分页：只显示前 displayedCount 条
  const displayedResults = useMemo(() => {
    return sortedResults.slice(0, displayedCount)
  }, [sortedResults, displayedCount])

  const hasMore = sortedResults.length > displayedCount

  // 响应时间格式化函数
  const formatResponseTime = (response: string | undefined): string => {
    if (!response || response.trim() === "") return "-"
    
    const trimmed = response.trim()
    
    // 如果已经是带单位的格式（如 "123ms", "1.5s", "123.45ms"），直接返回
    if (/^\d+\.?\d*\s*(ms|s|sec|second|seconds)$/i.test(trimmed)) {
      return trimmed
    }
    
    // 尝试解析为数字（可能是纯数字字符串，如 "123" 或 "123.45"）
    const num = parseFloat(trimmed)
    if (!isNaN(num) && isFinite(num)) {
      // 如果数字很大（可能是秒），转换为秒显示
      if (num >= 1000) {
        const seconds = (num / 1000).toFixed(2)
        return `${seconds}s`
      }
      // 否则显示为毫秒（保留2位小数如果小于1，否则取整）
      if (num < 1) {
        return `${num.toFixed(2)}ms`
      }
      return `${Math.round(num)}ms`
    }
    
    // 无法解析，直接返回原值
    return trimmed
  }

  // 获取所有类型 - 规范化类型值，确保包含unknown类型
  const types = useMemo(() => {
    if (!uniqueResults) return []
    const typeSet = new Set<string>()
    uniqueResults.forEach((r) => {
      // 规范化类型值：空值、undefined、空字符串都视为"unknown"
      const type = (r.type && r.type.trim()) || "unknown"
      typeSet.add(type)
    })
    return Array.from(typeSet).sort()
  }, [uniqueResults])

  // 统计信息 - 基于全部结果（去重后）
  const stats = useMemo(() => {
    if (!uniqueResults) return { total: 0, success: 0, error: 0 }
    const success = uniqueResults.filter((r) => r.status >= 200 && r.status < 400).length
    const error = uniqueResults.filter((r) => r.status >= 400).length
    return { total: uniqueResults.length, success, error }
  }, [uniqueResults])

  // 筛选后的统计信息
  const filteredStats = useMemo(() => {
    if (!sortedResults || sortedResults.length === 0) return { total: 0, success: 0, error: 0 }
    const success = sortedResults.filter((r) => r.status >= 200 && r.status < 400).length
    const error = sortedResults.filter((r) => r.status >= 400).length
    return { total: sortedResults.length, success, error }
  }, [sortedResults])

  if (!uniqueResults || uniqueResults.length === 0) {
    return (
      <div className="border border-tech-border/20 rounded-xl p-6 bg-gradient-to-br from-tech-bg/50 to-gray-900/30 backdrop-blur-sm text-center">
        <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{t("deepCheck.results.katana.title")}</h2>
        <p className="text-gray-400 text-sm">{t("deepCheck.results.katana.noResults")}</p>
      </div>
    )
  }

  return (
    <div className="border border-tech-border/20 rounded-xl p-6 bg-tech-bg/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-tech-cyan/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-tech-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t("deepCheck.results.katana.title")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("deepCheck.results.katana.totalFound").replace("{count}", String(stats.total))}
              {filteredStats.total !== stats.total && (
                <span className="ml-2 text-tech-cyan">
                  ({t("common.showing")} {filteredStats.total} {t("common.results")})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 过滤和搜索 */}
      <div className="bg-gray-900/50 border border-tech-border/10 rounded-lg p-4 mb-6">
        {/* 搜索提示 */}
        {searchQuery && (
          <div className="mb-3 text-xs text-gray-400 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("common.showing")} {filteredStats.total} {t("common.results")} {t("common.filter")} &quot;{searchQuery}&quot;
            <button
              onClick={() => setSearchQuery("")}
              className="ml-2 text-tech-cyan hover:text-tech-cyan/80 transition-colors"
              title={t("common.close")}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t("deepCheck.results.katana.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                // 按ESC键清空搜索
                if (e.key === "Escape") {
                  setSearchQuery("")
                }
              }}
              className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-tech-border/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan/50 focus:ring-1 focus:ring-tech-cyan/20 transition-all"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label={t("deepCheck.results.katana.filterByType")}
            title={t("deepCheck.results.katana.filterByType")}
            className="px-4 py-2 bg-gray-800/50 border border-tech-border/20 rounded-lg text-sm text-white focus:outline-none focus:border-tech-cyan/50 focus:ring-1 focus:ring-tech-cyan/20 transition-all"
          >
            <option value="all">{t("deepCheck.results.katana.filterByType")}</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label={t("deepCheck.results.katana.filterByStatus")}
            title={t("deepCheck.results.katana.filterByStatus")}
            className="px-4 py-2 bg-gray-800/50 border border-tech-border/20 rounded-lg text-sm text-white focus:outline-none focus:border-tech-cyan/50 focus:ring-1 focus:ring-tech-cyan/20 transition-all"
          >
            <option value="all">{t("deepCheck.results.katana.filterByStatus")}</option>
            <option value="success">{t("deepCheck.results.katana.filterSuccess")}</option>
            <option value="error">{t("deepCheck.results.katana.filterError")}</option>
          </select>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border border-tech-border/20 rounded-xl p-4 hover:border-tech-cyan/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400 uppercase tracking-wide">{t("deepCheck.results.katana.statsTotal")}</div>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">
            {filteredStats.total !== stats.total ? (
              <span>
                {filteredStats.total}
                <span className="text-sm text-gray-500 ml-1">/ {stats.total}</span>
              </span>
            ) : (
              stats.total
            )}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-xl p-4 hover:border-green-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400 uppercase tracking-wide">{t("deepCheck.results.katana.statsSuccess")}</div>
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {filteredStats.success !== stats.success ? (
              <span>
                {filteredStats.success}
                <span className="text-sm text-green-500/60 ml-1">/ {stats.success}</span>
              </span>
            ) : (
              stats.success
            )}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-xl p-4 hover:border-red-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400 uppercase tracking-wide">{t("deepCheck.results.katana.statsError")}</div>
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {filteredStats.error !== stats.error ? (
              <span>
                {filteredStats.error}
                <span className="text-sm text-red-500/60 ml-1">/ {stats.error}</span>
              </span>
            ) : (
              stats.error
            )}
          </div>
        </div>
      </div>

      {/* 结果表格 */}
      <div className="overflow-x-auto rounded-lg border border-tech-border/20 shadow-lg">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-900/80 to-gray-800/50 sticky top-0 z-10">
            <tr>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold text-xs uppercase tracking-wider border-b border-tech-border/20">{t("deepCheck.results.katana.tableUrl")}</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold text-xs uppercase tracking-wider border-b border-tech-border/20">{t("deepCheck.results.katana.tableType")}</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold text-xs uppercase tracking-wider border-b border-tech-border/20">{t("deepCheck.results.katana.tableStatus")}</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold text-xs uppercase tracking-wider border-b border-tech-border/20">{t("deepCheck.results.katana.tableTitle")}</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold text-xs uppercase tracking-wider border-b border-tech-border/20">{t("deepCheck.results.katana.tableResponseTime")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tech-border/10">
            {displayedResults.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium mb-1">{t("deepCheck.results.katana.noMatches")}</p>
                  {uniqueResults && uniqueResults.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("deepCheck.results.katana.totalFound").replace("{count}", String(stats.total))}，{t("common.filter")} {t("deepCheck.results.katana.noMatches")}
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              displayedResults.map((result, index) => (
                <tr
                  key={`${result.url}-${index}-${result.status}-${result.method || 'GET'}`}
                  className="hover:bg-gray-900/40 transition-colors border-b border-tech-border/5"
                >
                  <td className="py-3 px-4">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-tech-cyan hover:text-tech-cyan/80 break-all hover:underline transition-colors flex items-center gap-1 group"
                      title={result.url}
                    >
                      <svg className="w-3 h-3 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="truncate max-w-[500px] sm:max-w-[600px] block">{result.url}</span>
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-gray-800/50 border border-tech-border/20 rounded-md text-xs font-medium text-gray-300">
                      {(result.type && result.type.trim()) || "unknown"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 ${
                        result.status >= 200 && result.status < 400
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {result.status >= 200 && result.status < 400 ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {result.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300 max-w-xs">
                    {result.title ? (
                      <span className="text-gray-300 truncate block" title={result.title}>{result.title}</span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    <span 
                      className="font-mono text-xs"
                      title={result.response ? `响应时间: ${result.response}` : undefined}
                    >
                      {formatResponseTime(result.response)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setDisplayedCount((prev) => Math.min(prev + 50, sortedResults.length))}
            className="px-6 py-2.5 bg-tech-cyan/10 border border-tech-cyan/30 text-tech-cyan rounded-lg hover:bg-tech-cyan/20 hover:border-tech-cyan/50 transition-all duration-200 flex items-center gap-2 mx-auto font-medium shadow-lg shadow-tech-cyan/5 hover:shadow-tech-cyan/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {t("common.loadMore")} ({sortedResults.length - displayedCount} {t("common.remaining")})
          </button>
        </div>
      )}

      {/* 显示总数信息 */}
      {sortedResults.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-400">
          {t("common.showing")} {displayedResults.length} / {sortedResults.length} {t("common.results")}
        </div>
      )}
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(KatanaResults)
