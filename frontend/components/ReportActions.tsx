"use client"

import { memo, useState } from "react"
import { buildReport } from "@/utils/report"
import { exportJSON, exportMarkdown, exportCSV, exportExcel, exportWord, exportPDF } from "@/utils/export"
import { 
  ScanResult, 
  WebsiteInfo, 
  DomainInfo, 
  SSLInfo, 
  TechStack, 
  AIAnalysis,
  PerformanceMetrics,
  SEOCompliance,
  SecurityRisk,
  AccessibilityInfo
} from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

type ExportType = "json" | "markdown" | "csv" | "excel" | "word" | "pdf"

function ReportActions({
  target,
  results,
  websiteInfo,
  domainInfo,
  sslInfo,
  techStack,
  aiAnalysis,
  performance,
  seo,
  security,
  accessibility,
}: {
  target: string
  results: ScanResult[]
  websiteInfo?: WebsiteInfo | null
  domainInfo?: DomainInfo | null
  sslInfo?: SSLInfo | null
  techStack?: TechStack | null
  aiAnalysis?: AIAnalysis | null
  performance?: PerformanceMetrics | null
  seo?: SEOCompliance | null
  security?: SecurityRisk | null
  accessibility?: AccessibilityInfo | null
}) {
  const { t, locale } = useLanguage()
  const [exporting, setExporting] = useState<ExportType | null>(null)
  const [error, setError] = useState<string>("")

  const handleExport = async (type: ExportType) => {
    try {
      setExporting(type)
      setError("")
      
      const report = buildReport(
        target, 
        results, 
        websiteInfo, 
        domainInfo, 
        sslInfo, 
        techStack, 
        aiAnalysis,
        performance,
        seo,
        security,
        accessibility
      )
      
      switch (type) {
        case "json":
          exportJSON(report)
          break
        case "markdown":
          exportMarkdown(report, locale)
          break
        case "csv":
          exportCSV(report, locale)
          break
        case "excel":
          exportExcel(report, locale)
          break
        case "word":
          await exportWord(report, locale)
          break
        case "pdf":
          await exportPDF(report, locale)
          break
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("scan.exportFailed")
      setError(errorMessage)
      console.error(`[Export] Failed to export ${type}:`, err)
    } finally {
      // 延迟重置状态，让用户看到成功反馈
      setTimeout(() => {
        setExporting(null)
      }, 500)
    }
  }

  const getButtonText = (type: ExportType) => {
    const labels: Record<ExportType, string> = {
      json: t("scan.exportJson"),
      markdown: t("scan.exportMarkdown"),
      csv: t("scan.exportCsv"),
      excel: t("scan.exportExcel"),
      word: t("scan.exportWord"),
      pdf: t("scan.exportPdf"),
    }
    return labels[type]
  }

  const isExporting = (type: ExportType) => exporting === type

  const exportTypes: ExportType[] = ["json", "markdown", "csv", "excel", "word", "pdf"]

  return (
    <div className="border border-tech-border/30 rounded-lg p-6 bg-tech-surface/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-white font-sans">{t("scan.exportReport")}</h3>
        {exporting && (
          <span className="text-tech-cyan/70 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 bg-tech-cyan rounded-full animate-pulse"></span>
            {t("scan.exportingProgress", { type: getButtonText(exporting) })}
          </span>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded text-red-400 font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {exportTypes.map((type) => (
          <button
            key={type}
            onClick={() => handleExport(type)}
            disabled={!!exporting}
            className={`clip-tech-btn border font-mono text-xs font-bold px-5 py-2 transition-all group overflow-hidden relative ${
              isExporting(type)
                ? "bg-tech-cyan/20 border-tech-cyan text-tech-cyan cursor-wait"
                : exporting
                ? "bg-tech-surface/30 border-tech-border/20 text-tech-cyan/30 cursor-not-allowed"
                : "bg-tech-cyan/5 hover:bg-tech-cyan/10 border-tech-cyan/50 text-tech-cyan hover:border-tech-cyan"
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isExporting(type) && (
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {getButtonText(type)}
            </span>
            {!isExporting(type) && !exporting && (
              <div className="absolute inset-0 bg-tech-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(ReportActions)

