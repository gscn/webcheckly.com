"use client"

import { memo, useMemo } from "react"
import { ScanResult } from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

function ReportSummary({ results }: { results: ScanResult[] }) {
  const { t } = useLanguage()
  
  // 使用useMemo优化计算，避免每次渲染都重新计算
  const stats = useMemo(() => {
    const total = results.length
    const alive = results.filter((r) => r.status > 0 && r.status < 400).length
    const dead = total - alive
    const avg = total > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.response_time || 0), 0) / total)
      : 0
    return { total, alive, dead, avg }
  }, [results])

  return (
    <div className="border border-tech-border/30 rounded-lg p-6 bg-tech-surface/50 space-y-4 backdrop-blur-sm">
      <h3 className="text-xl font-black mb-4 text-white font-sans">{t("scan.reportSummaryTitle")}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-tech-bg/50 border border-tech-border/20 rounded p-4 hover:border-tech-cyan/40 transition-colors">
          <div className="text-xs text-tech-cyan/80 font-mono mb-2">{t("scan.reportSummaryTotal")}</div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
        </div>
        <div className="bg-tech-bg/50 border border-green-500/20 rounded p-4 hover:border-green-500/40 transition-colors">
          <div className="text-xs text-tech-cyan/80 font-mono mb-2">{t("scan.reportSummaryAlive")}</div>
          <div className="text-2xl font-black text-green-400">{stats.alive}</div>
        </div>
        <div className="bg-tech-bg/50 border border-red-500/20 rounded p-4 hover:border-red-500/40 transition-colors">
          <div className="text-xs text-tech-cyan/80 font-mono mb-2">{t("scan.reportSummaryDead")}</div>
          <div className="text-2xl font-black text-red-400">{stats.dead}</div>
        </div>
        <div className="bg-tech-bg/50 border border-tech-cyan/20 rounded p-4 hover:border-tech-cyan/40 transition-colors">
          <div className="text-xs text-tech-cyan/80 font-mono mb-2">{t("scan.reportSummaryAvg")}</div>
          <div className="text-2xl font-black text-tech-cyan">{stats.avg}{t("scan.reportSummaryMs")}</div>
        </div>
      </div>
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(ReportSummary)

