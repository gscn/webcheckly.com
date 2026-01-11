"use client"

import { ScanResult } from "@/types/scan"
import { useState, useMemo, memo, useEffect, useRef } from "react"
import StatusBadge from "./StatusBadge"
import { useLanguage } from "@/contexts/LanguageContext"

type FilterType = "all" | "error" | "slow"

function ResultTable({ results }: { results: ScanResult[] }) {
  const { t } = useLanguage()
  const [filter, setFilter] = useState<FilterType>("all")
  const [isExpanded, setIsExpanded] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const prevResultsLengthRef = useRef<number>(0)

  // 当筛选条件改变时，重置展开状态
  useEffect(() => {
    setIsExpanded(false)
  }, [filter])

  // 当结果数量增加时，自动滚动到底部（仅在"全部"筛选模式下且已展开）
  useEffect(() => {
    if (filter === "all" && results.length > prevResultsLengthRef.current && tableRef.current && isExpanded) {
      // 使用 requestAnimationFrame 确保DOM已更新
      requestAnimationFrame(() => {
        if (tableRef.current) {
          const scrollContainer = tableRef.current.querySelector("table")?.parentElement
          if (scrollContainer) {
            // 平滑滚动到底部
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: "smooth",
            })
          }
        }
      })
    }
    prevResultsLengthRef.current = results.length
  }, [results.length, filter, isExpanded])

  const filteredAndSorted = useMemo(() => {
    let filtered = results

    if (filter === "error") {
      filtered = results.filter((r) => r.status >= 400 || r.status === 0)
    } else if (filter === "slow") {
      filtered = results.filter((r) => r.response_time > 1000)
    }

    // 排序：异常URL优先，然后按响应时间降序
    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) {
        // 异常状态优先
        if (a.status === 0 || a.status >= 400) return -1
        if (b.status === 0 || b.status >= 400) return 1
        return a.status - b.status
      }
      return b.response_time - a.response_time
    })
  }, [results, filter])

  const displayResults = useMemo(() => {
    if (isExpanded) return filteredAndSorted
    return filteredAndSorted.slice(0, 10)
  }, [filteredAndSorted, isExpanded])

  const getResponseTimeColor = (rt: number) => {
    if (rt < 300) return "text-green-400"
    if (rt < 800) return "text-yellow-300"
    return "text-red-400"
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-tech-cyan/70 font-mono">
        <p>&gt; {t("scan.noResults")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 筛选按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`clip-tech-btn px-4 py-2 font-mono text-xs transition-all relative overflow-hidden ${
            filter === "all"
              ? "bg-tech-cyan border-2 border-tech-cyan shadow-neon-cyan font-bold text-[#001a1f]"
              : "bg-tech-surface border border-tech-border/30 text-tech-cyan/60 hover:border-tech-cyan/50 hover:text-tech-cyan/90"
          }`}
        >
          <span className={`relative z-10 ${filter === "all" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : ""}`}>
            {t("scan.filterAll")} ({results.length})
          </span>
          {filter === "all" && (
            <div className="absolute inset-0 bg-white/20"></div>
          )}
        </button>
        <button
          onClick={() => setFilter("error")}
          className={`clip-tech-btn px-4 py-2 font-mono text-xs transition-all relative overflow-hidden ${
            filter === "error"
              ? "bg-tech-cyan border-2 border-tech-cyan shadow-neon-cyan font-bold text-[#001a1f]"
              : "bg-tech-surface border border-tech-border/30 text-tech-cyan/60 hover:border-tech-cyan/50 hover:text-tech-cyan/90"
          }`}
        >
          <span className={`relative z-10 ${filter === "error" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : ""}`}>
            {t("scan.filterError")} ({results.filter((r) => r.status >= 400 || r.status === 0).length})
          </span>
          {filter === "error" && (
            <div className="absolute inset-0 bg-white/20"></div>
          )}
        </button>
        <button
          onClick={() => setFilter("slow")}
          className={`clip-tech-btn px-4 py-2 font-mono text-xs transition-all relative overflow-hidden ${
            filter === "slow"
              ? "bg-tech-cyan border-2 border-tech-cyan shadow-neon-cyan font-bold text-[#001a1f]"
              : "bg-tech-surface border border-tech-border/30 text-tech-cyan/60 hover:border-tech-cyan/50 hover:text-tech-cyan/90"
          }`}
        >
          <span className={`relative z-10 ${filter === "slow" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : ""}`}>
            {t("scan.filterSlowDesc")} ({results.filter((r) => r.response_time > 1000).length})
          </span>
          {filter === "slow" && (
            <div className="absolute inset-0 bg-white/20"></div>
          )}
        </button>
      </div>

      {/* 表格 */}
      <div ref={tableRef} className="overflow-auto border border-tech-border/30 rounded-lg bg-tech-surface/50">
        <table className="w-full text-sm font-mono">
          <thead className="bg-tech-surface border-b border-tech-border/40">
            <tr>
              <th className="p-3 text-left font-semibold text-tech-cyan text-xs">{t("scan.tableUrl")}</th>
              <th className="p-3 text-center font-semibold text-tech-cyan text-xs">{t("scan.tableStatus")}</th>
              <th className="p-3 text-left font-semibold text-tech-cyan text-xs">{t("scan.tableTitle")}</th>
              <th className="p-3 text-center font-semibold text-tech-cyan text-xs">{t("scan.tableResponseTime")}</th>
              <th className="p-3 text-center font-semibold text-tech-cyan text-xs">{t("scan.tableIp")}</th>
              <th className="p-3 text-center font-semibold text-tech-cyan text-xs">{t("scan.tableTls")}</th>
            </tr>
          </thead>
          <tbody>
            {displayResults.map((r, index) => (
              <tr
                key={`${index}-${r.url}`}
                className="border-b border-tech-border/10 hover:bg-tech-surface/60 transition-colors"
              >
                <td className="p-3 max-w-md truncate text-gray-200 font-mono text-xs" title={r.url}>
                  {r.url}
                </td>
                <td className="p-3 text-center">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-3 max-w-xs truncate text-gray-300/80" title={r.title}>
                  {r.title || <span className="text-tech-cyan/40">-</span>}
                </td>
                <td
                  className={`p-3 text-center font-bold font-mono text-xs ${getResponseTimeColor(
                    r.response_time || 0
                  )}`}
                >
                  {r.response_time ? `${r.response_time}ms` : <span className="text-tech-cyan/40">-</span>}
                </td>
                <td className="p-3 text-center text-xs text-tech-cyan/60 font-mono">{r.ip || <span className="text-tech-cyan/40">-</span>}</td>
                <td className="p-3 text-center text-tech-cyan">
                  {r.tls ? <span className="text-green-400">✓</span> : r.status === 0 ? <span className="text-tech-cyan/40">-</span> : <span className="text-red-400">✖</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 加载更多按钮 */}
      {filteredAndSorted.length > 10 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="group flex items-center gap-2 px-6 py-2 bg-tech-cyan/5 hover:bg-tech-cyan/10 border border-tech-cyan/30 hover:border-tech-cyan/60 rounded-full transition-all duration-300 text-tech-cyan font-mono text-xs font-bold"
          >
            <span>{isExpanded ? t("scan.showLess") : t("scan.loadMore")} ({filteredAndSorted.length - 10}+)</span>
            <svg 
              className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : "group-hover:translate-y-0.5"}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(ResultTable)

