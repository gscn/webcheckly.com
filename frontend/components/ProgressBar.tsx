"use client"

import { memo, useMemo } from "react"
import { Progress } from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

interface ProgressBarProps {
  progress: Progress
  startTime?: number
}

function ProgressBar({ progress, startTime }: ProgressBarProps) {
  const { t } = useLanguage()
  if (!progress.total) return null

  const percent = Math.round((progress.current / progress.total) * 100)

  // 计算预估剩余时间
  const estimatedTimeRemaining = useMemo(() => {
    if (!startTime || progress.current === 0 || progress.current >= progress.total) {
      return null
    }

    const elapsed = Date.now() - startTime
    const avgTimePerItem = elapsed / progress.current
    const remaining = progress.total - progress.current
    const estimated = Math.round(avgTimePerItem * remaining / 1000) // 转换为秒

    if (estimated < 60) {
      return `${estimated}秒`
    } else if (estimated < 3600) {
      return `${Math.round(estimated / 60)}分钟`
    } else {
      return `${Math.round(estimated / 3600)}小时`
    }
  }, [startTime, progress.current, progress.total])

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between text-xs mb-2 text-tech-cyan font-mono">
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 bg-tech-cyan rounded-full animate-pulse shadow-neon-cyan"></span>
          {'>'} {t("scan.progressLabel")}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-tech-cyan/80 font-bold">
            {progress.current} / {progress.total} ({percent}%)
          </span>
          {estimatedTimeRemaining && (
            <span className="text-tech-cyan/60 text-[10px]">
              预计剩余: {estimatedTimeRemaining}
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-tech-surface border border-tech-border/30 h-4 overflow-hidden relative rounded-sm">
        <div
          className="bg-gradient-to-r from-tech-cyan via-tech-blue to-tech-cyan h-4 transition-all duration-300 ease-out relative overflow-hidden"
          style={{ width: `${percent}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-scan"></div>
          {percent < 100 && (
            <div className="absolute inset-0" style={{
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.5)',
              animation: 'pulse-glow 2s ease-in-out infinite'
            }}></div>
          )}
        </div>
        {percent < 100 && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            <span className="text-tech-cyan/50 font-mono text-[9px] tracking-widest font-bold">
              PROCESSING...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(ProgressBar)

