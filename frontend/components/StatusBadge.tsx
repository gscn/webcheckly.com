"use client"

import { memo } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

function StatusBadge({ status }: { status: number }) {
  const { t } = useLanguage()
  let color = "bg-tech-surface text-gray-300 border-tech-border/30"
  let displayStatus = status.toString()

  if (status === 0) {
    color = "bg-red-950/60 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
    displayStatus = t("scan.statusFailed")
  } else if (status >= 200 && status < 300) {
    color = "bg-green-950/60 text-green-400 border-green-500/40 shadow-[0_0_8px_rgba(74,222,128,0.3)]"
  } else if (status >= 300 && status < 400) {
    color = "bg-tech-blue/20 text-tech-blue border-tech-blue/40 shadow-[0_0_8px_rgba(45,90,240,0.3)]"
  } else if (status >= 400 && status < 500) {
    color = "bg-orange-950/60 text-orange-400 border-orange-500/40 shadow-[0_0_8px_rgba(251,146,60,0.3)]"
  } else if (status >= 500) {
    color = "bg-red-950/60 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
  }

  return (
    <span
      className={`${color} px-2 py-1 rounded border text-xs font-bold font-mono inline-block min-w-[50px] text-center`}
    >
      {displayStatus}
    </span>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(StatusBadge)

