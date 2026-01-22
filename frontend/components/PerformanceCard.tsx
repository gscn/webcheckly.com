"use client"

import { PerformanceMetrics } from "@/types/scan"
import { Gauge, Zap, Layout, Clock, Activity, Target } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface PerformanceCardProps {
  metrics: PerformanceMetrics
}

export default function PerformanceCard({ metrics }: PerformanceCardProps) {
  const { t } = useLanguage()
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-500"
    if (score >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const formatMs = (ms: number | undefined) => {
    if (ms === undefined) return "-"
    if (ms < 1000) return `${ms.toFixed(0)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  return (
    <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-tech-border/20">
        <div className="flex items-center gap-2">
          <div className="text-tech-cyan">
            <Gauge size={18} />
          </div>
          <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{t("scan.performanceTitle")}</h3>
        </div>
        <div className={`font-mono font-bold ${getScoreColor(metrics.score || 0)}`}>
          SCORE: {metrics.score ?? "-"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Core Web Vitals & Metrics */}
        <div className="p-4 rounded border border-tech-border/10 bg-tech-cyan/5">
          <div className="flex items-center gap-2 mb-2 text-tech-cyan/70 font-mono text-xs uppercase">
            <Zap size={14} />
            <span>FCP</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-gray-200 font-mono">{formatMs(metrics.fcp)}</div>
            <div className="h-1 w-16 rounded-full bg-tech-border/20 overflow-hidden">
              <div className={`h-full ${getScoreBg(metrics.fcp_score || 0)}`} style={{ width: `${metrics.fcp_score || 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded border border-tech-border/10 bg-tech-cyan/5">
          <div className="flex items-center gap-2 mb-2 text-tech-cyan/70 font-mono text-xs uppercase">
            <Target size={14} />
            <span>LCP</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-gray-200 font-mono">{formatMs(metrics.lcp)}</div>
            <div className="h-1 w-16 rounded-full bg-tech-border/20 overflow-hidden">
              <div className={`h-full ${getScoreBg(metrics.lcp_score || 0)}`} style={{ width: `${metrics.lcp_score || 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded border border-tech-border/10 bg-tech-cyan/5">
          <div className="flex items-center gap-2 mb-2 text-tech-cyan/70 font-mono text-xs uppercase">
            <Layout size={14} />
            <span>CLS</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-gray-200 font-mono">{metrics.cls !== undefined ? metrics.cls.toFixed(3) : "-"}</div>
            <div className="h-1 w-16 rounded-full bg-tech-border/20 overflow-hidden">
              <div className={`h-full ${getScoreBg(metrics.cls_score || 0)}`} style={{ width: `${metrics.cls_score || 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded border border-tech-border/10 bg-tech-cyan/5">
          <div className="flex items-center gap-2 mb-2 text-tech-cyan/70 font-mono text-xs uppercase">
            <Clock size={14} />
            <span>TBT</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-gray-200 font-mono">{formatMs(metrics.tbt)}</div>
            <div className="h-1 w-16 rounded-full bg-tech-border/20 overflow-hidden">
              <div className={`h-full ${getScoreBg(metrics.tbt_score || 0)}`} style={{ width: `${metrics.tbt_score || 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded border border-tech-border/10 bg-tech-cyan/5">
          <div className="flex items-center gap-2 mb-2 text-tech-cyan/70 font-mono text-xs uppercase">
            <Activity size={14} />
            <span>Speed Index</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-gray-200 font-mono">{formatMs(metrics.speed_index)}</div>
            <div className="h-1 w-16 rounded-full bg-tech-border/20 overflow-hidden">
              <div className={`h-full ${getScoreBg(metrics.speed_index_score || 0)}`} style={{ width: `${metrics.speed_index_score || 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {metrics.lcp_element && (
        <div className="mt-6 p-3 border border-tech-cyan/20 rounded bg-tech-cyan/5">
          <h4 className="text-xs font-bold text-tech-cyan uppercase mb-2">{t("scan.lcpDiagnostic")}:</h4>
          <code className="text-[10px] text-gray-400 break-all font-mono block leading-relaxed">{metrics.lcp_element}</code>
        </div>
      )}
    </div>
  )
}

