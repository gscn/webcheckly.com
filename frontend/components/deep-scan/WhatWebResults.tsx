"use client"

import { useState } from "react"
import { WhatWebResult } from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

interface WhatWebResultsProps {
  result: WhatWebResult | undefined
}

type TabType = "all" | "framework" | "cms" | "language" | "javascript" | "database" | "cdn" | "analytics"

export default function WhatWebResults({ result }: WhatWebResultsProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabType>("all")

  if (!result) {
    return (
      <div className="border border-tech-border/20 rounded-lg p-6 bg-tech-bg/50">
        <h2 className="text-lg font-bold text-white mb-2">{t("deepScan.results.whatweb.title")}</h2>
        <p className="text-gray-400 text-sm">{t("common.loading")}</p>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "all", label: t("deepScan.results.whatweb.technologies"), count: Object.keys(result.technologies || {}).length },
    { id: "framework", label: t("deepScan.results.whatweb.framework"), count: result.framework?.length || 0 },
    { id: "cms", label: t("deepScan.results.whatweb.cms"), count: result.cms?.length || 0 },
    { id: "language", label: t("deepScan.results.whatweb.language"), count: result.language?.length || 0 },
    { id: "javascript", label: t("deepScan.results.whatweb.javascript"), count: result.javascript?.length || 0 },
    { id: "database", label: t("deepScan.results.whatweb.database"), count: result.database?.length || 0 },
    { id: "cdn", label: t("deepScan.results.whatweb.cdn"), count: result.cdn?.length || 0 },
    { id: "analytics", label: t("deepScan.results.whatweb.analytics"), count: result.analytics?.length || 0 },
  ]

  const getTabContent = () => {
    switch (activeTab) {
      case "all":
        return Object.entries(result.technologies || {}).map(([tech, version]) => (
          <div key={tech} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{tech}</span>
              {version && <span className="text-xs text-gray-400">{version}</span>}
            </div>
          </div>
        ))
      case "framework":
        return result.framework?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      case "cms":
        return result.cms?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      case "language":
        return result.language?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      case "javascript":
        return result.javascript?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      case "database":
        return result.database?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      case "cdn":
        return result.cdn?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      case "analytics":
        return result.analytics?.map((item, index) => (
          <div key={index} className="p-3 bg-gray-900/50 border border-tech-border/20 rounded">
            <span className="text-sm text-white">{item}</span>
          </div>
        ))
      default:
        return null
    }
  }

  const hasContent = () => {
    switch (activeTab) {
      case "all":
        return Object.keys(result.technologies || {}).length > 0
      case "framework":
        return (result.framework?.length || 0) > 0
      case "cms":
        return (result.cms?.length || 0) > 0
      case "language":
        return (result.language?.length || 0) > 0
      case "javascript":
        return (result.javascript?.length || 0) > 0
      case "database":
        return (result.database?.length || 0) > 0
      case "cdn":
        return (result.cdn?.length || 0) > 0
      case "analytics":
        return (result.analytics?.length || 0) > 0
      default:
        return false
    }
  }

  return (
    <div className="border border-tech-border/20 rounded-lg p-6 bg-tech-bg/50">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">{t("deepScan.results.whatweb.title")}</h2>
        {result.server && (
          <div className="text-sm text-gray-400">
            {t("deepScan.results.whatweb.server")}: <span className="text-white">{result.server}</span>
          </div>
        )}
        {result.os && (
          <div className="text-sm text-gray-400">
            {t("deepScan.results.whatweb.os")}: <span className="text-white">{result.os}</span>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-tech-border/20 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-tech-cyan/20 text-tech-cyan border border-tech-cyan/50"
                : "bg-gray-900/50 text-gray-400 border border-tech-border/20 hover:border-tech-cyan/30"
            }`}
          >
            {tab.label} {tab.count !== undefined && tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      {hasContent() ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {getTabContent()}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          {t("deepScan.results.whatweb.noTechnologies")}
        </div>
      )}
    </div>
  )
}
