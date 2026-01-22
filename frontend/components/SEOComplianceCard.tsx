"use client"

import { SEOCompliance } from "@/types/scan"
import { Search, CheckCircle2, XCircle, Info, ExternalLink } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface SEOComplianceCardProps {
  seo: SEOCompliance
}

export default function SEOComplianceCard({ seo }: SEOComplianceCardProps) {
  const { t } = useLanguage()
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const items = [
    { label: t("scan.seoItemTitle"), status: seo.has_title ?? false },
    { label: t("scan.seoItemDesc"), status: seo.has_description ?? false },
    { label: t("scan.seoItemViewport"), status: seo.has_viewport ?? false },
    { label: t("scan.seoItemRobots"), status: seo.has_robots_txt ?? false },
    { label: t("scan.seoItemCanonical"), status: seo.has_canonical ?? false },
    { label: t("scan.seoItemIndexable"), status: seo.indexable ?? false },
  ]

  return (
    <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-tech-border/20">
        <div className="flex items-center gap-2">
          <div className="text-tech-cyan">
            <Search size={18} />
          </div>
          <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{t("scan.seoTitle")}</h3>
        </div>
        <div className={`font-mono font-bold ${getScoreColor(seo.score || 0)}`}>
          SCORE: {seo.score ?? "-"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-1.5 border-b border-tech-border/10 last:border-0">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-tight">{item.label}</span>
            {item.status ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <XCircle size={14} className="text-red-500" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between p-3 bg-tech-cyan/5 border border-tech-cyan/20 rounded">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-tech-cyan" />
          <span className="text-xs font-mono font-bold text-tech-cyan/80 uppercase">{t("scan.spaVisibility")}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1 w-24 bg-tech-border/20 rounded-full overflow-hidden">
            <div 
              className={`h-full ${(seo.spa_visibility ?? 0) > 0.8 ? "bg-green-500" : "bg-yellow-500"}`} 
              style={{ width: `${(seo.spa_visibility ?? 0) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs font-mono font-bold text-gray-200">{((seo.spa_visibility ?? 0) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

