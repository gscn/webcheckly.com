"use client"

import { memo } from "react"
import { ModuleStatus as ModuleStatusType } from "@/services/taskService"
import { useLanguage } from "@/contexts/LanguageContext"

interface ModuleStatusProps {
  modules: Record<string, ModuleStatusType>
}

function ModuleStatus({ modules }: ModuleStatusProps) {
  const { t } = useLanguage()

  if (!modules || Object.keys(modules).length === 0) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 border-green-500/50 text-green-400"
      case "running":
        return "bg-tech-cyan/20 border-tech-cyan/50 text-tech-cyan"
      case "failed":
        return "bg-red-500/20 border-red-500/50 text-red-400"
      case "pending":
        return "bg-gray-500/20 border-gray-500/50 text-gray-400"
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓"
      case "running":
        return "⟳"
      case "failed":
        return "✗"
      case "pending":
        return "○"
      default:
        return "○"
    }
  }

  // 获取模块名称的翻译
  const getModuleName = (moduleName: string): string => {
    // 模块名称映射到翻译键（不包含 lighthouse，因为它是内部模块）
    const moduleNameMap: Record<string, string> = {
      "accessibility": t("scan.moduleNameAccessibility"),
      "ai-analysis": t("scan.moduleNameAIAnalysis"),
      "domain-info": t("scan.moduleNameDomainInfo"),
      "link-health": t("scan.moduleNameLinkHealth"),
      "performance": t("scan.moduleNamePerformance"),
      "security": t("scan.moduleNameSecurity"),
      "seo": t("scan.moduleNameSEO"),
      "ssl-info": t("scan.moduleNameSSLInfo"),
      "tech-stack": t("scan.moduleNameTechStack"),
      "website-info": t("scan.moduleNameWebsiteInfo"),
    }
    
    // 如果找到翻译，返回翻译；否则返回原始名称
    return moduleNameMap[moduleName] || moduleName
  }

  // 定义模块显示顺序（按照扫描选项配置的顺序）
  // 基础检测：website-info, domain-info, ssl-info, tech-stack
  // 高级检测：link-health, performance, seo, security, accessibility, ai-analysis
  const moduleDisplayOrder = [
    "website-info",
    "domain-info",
    "ssl-info",
    "tech-stack",
    "link-health",
    "performance",
    "seo",
    "security",
    "accessibility",
    "ai-analysis",
  ]

  // 按顺序排序模块
  const sortedModules = Object.values(modules)
    .filter((module) => module.name !== "lighthouse") // 过滤掉 lighthouse 模块（内部模块，不显示）
    .sort((a, b) => {
      const indexA = moduleDisplayOrder.indexOf(a.name)
      const indexB = moduleDisplayOrder.indexOf(b.name)
      // 如果不在预定义顺序中，放在最后
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

  return (
    <div className="mb-4 p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-1 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
        <span className="text-tech-cyan font-mono text-xs font-bold uppercase tracking-wider">
          {t("scan.moduleStatusTitle")}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {sortedModules.map((module) => (
            <div
              key={module.name}
              className={`px-3 py-2 rounded border text-xs font-mono ${getStatusColor(module.status)}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm ${module.status === "running" ? "animate-rotate inline-block" : ""}`}>
                  {getStatusIcon(module.status)}
                </span>
                <span className="font-bold">{getModuleName(module.name)}</span>
              </div>
              {module.error && (
                <div className="mt-1 text-[10px] opacity-75 truncate" title={module.error}>
                  {(() => {
                    // 检查是否是访问权限相关的错误，显示更友好的提示
                    const errorLower = module.error.toLowerCase()
                    if (errorLower.includes("access denied") || 
                        errorLower.includes("功能访问被拒绝") ||
                        errorLower.includes("insufficient credits") ||
                        errorLower.includes("积分不足") ||
                        errorLower.includes("login required") ||
                        errorLower.includes("需要登录")) {
                      return t("scan.moduleAccessDenied") || "Access denied"
                    }
                    return module.error
                  })()}
                </div>
              )}
              {/* {module.progress.total > 0 && (
                <div className="mt-1 text-[10px] opacity-75">
                  {module.progress.current}/{module.progress.total}
                </div>
              )} */}
            </div>
          ))}
      </div>
    </div>
  )
}

export default memo(ModuleStatus)
