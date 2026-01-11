"use client"

import { memo } from "react"

interface InfoCardProps {
  title: string
  icon?: string
  children: React.ReactNode
}

function InfoCard({ title, icon, children }: InfoCardProps) {
  return (
    <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-tech-border/20">
        {icon && <span className="text-tech-cyan">{icon}</span>}
        <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(InfoCard)

interface InfoItemProps {
  label: string
  value: string | string[] | number | undefined | null
  highlight?: boolean
}

export const InfoItem = memo(function InfoItem({ label, value, highlight = false }: InfoItemProps) {
  if (value === undefined || value === null || value === "") return null

  const displayValue = Array.isArray(value) ? value.join(", ") : String(value)

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 ${highlight ? "bg-tech-cyan/5 p-2 rounded" : ""}`}>
      <span className="text-tech-cyan/70 font-mono text-xs uppercase tracking-wider min-w-[120px]">
        {label}:
      </span>
      <span className={`font-mono text-sm ${highlight ? "text-tech-cyan font-bold" : "text-gray-300"}`}>
        {displayValue}
      </span>
    </div>
  )
})

