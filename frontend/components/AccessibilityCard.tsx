"use client"

import { AccessibilityInfo } from "@/types/scan"
import { Eye, CheckCircle2, AlertTriangle, List } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface AccessibilityCardProps {
  accessibility: AccessibilityInfo
}

export default function AccessibilityCard({ accessibility }: AccessibilityCardProps) {
  const { t } = useLanguage()
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-tech-border/20">
        <div className="flex items-center gap-2">
          <div className="text-tech-cyan">
            <Eye size={18} />
          </div>
          <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{t("scan.accessibilityTitle")}</h3>
        </div>
        <div className={`font-mono font-bold ${getScoreColor(accessibility.score || 0)}`}>
          SCORE: {accessibility.score ?? "-"}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-tech-cyan/80">
          <List size={14} />
          <span className="text-xs font-mono font-bold uppercase tracking-tight">{t("scan.accessibilityFindings")} / RECOMMENDATIONS</span>
        </div>

        {accessibility.findings && accessibility.findings.length > 0 ? (
          <div className="space-y-3">
            {accessibility.findings.map((finding, index) => (
              <div key={index} className="flex gap-3 p-3 bg-tech-cyan/5 border border-tech-border/10 rounded">
                <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 font-mono leading-relaxed">
                  {finding}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-tech-cyan/5 border border-tech-border/10 rounded border-dashed">
            <CheckCircle2 size={24} className="text-green-500 mb-2 opacity-50" />
            <p className="text-xs text-gray-500 font-mono uppercase tracking-tight">{t("scan.noAccessibilityIssues")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

