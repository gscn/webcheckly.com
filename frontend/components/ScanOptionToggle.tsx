"use client"

import { memo } from "react"
import FeaturePricingBadge from "./FeaturePricingBadge"

interface ScanOptionToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  creditsCost?: number
  isFree?: boolean
  isPremium?: boolean
}

function ScanOptionToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  creditsCost,
  isFree,
  isPremium
}: ScanOptionToggleProps) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`relative flex items-center gap-3 p-3 cursor-pointer group transition-all duration-300 border rounded-lg backdrop-blur-sm ${
        checked
          ? "bg-tech-surface/80 border-tech-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          : "bg-tech-surface/40 border-tech-border/20 hover:border-tech-border/40"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {/* Toggle Switch */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-12 h-6 rounded-full transition-all duration-300 ${
            checked ? "bg-tech-cyan" : "bg-gray-700"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all duration-300 transform mt-0.5 ${
              checked ? "translate-x-6" : "translate-x-0.5"
            } ${checked ? "shadow-neon-cyan" : ""}`}
          ></div>
        </div>
      </div>

      {/* Label and Description */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <label
            className={`font-sans font-bold text-sm tracking-wide transition-colors ${
              checked ? "text-white" : "text-gray-400"
            }`}
          >
            {label}
          </label>
          {checked && (
            <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan shadow-neon-cyan animate-pulse"></span>
          )}
          <FeaturePricingBadge
            featureCode={id}
            creditsCost={creditsCost}
            isFree={isFree}
            isPremium={isPremium}
          />
        </div>
        {description && (
          <p className="text-[10px] font-mono text-tech-cyan/60 uppercase tracking-wider">
            {description}
          </p>
        )}
      </div>

      {/* Decorative Corner Lines */}
      {checked && (
        <>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tech-cyan/50"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tech-cyan/50"></div>
        </>
      )}
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(ScanOptionToggle)
