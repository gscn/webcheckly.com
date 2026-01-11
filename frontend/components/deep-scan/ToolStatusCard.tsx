"use client"

import { memo, useMemo } from "react"
import { ModuleStatus as ModuleStatusType } from "@/services/taskService"
import { useLanguage } from "@/contexts/LanguageContext"

interface ToolStatusCardProps {
  toolName: "katana"
  status: ModuleStatusType | undefined
}

function ToolStatusCard({ toolName, status }: ToolStatusCardProps) {
  const { t } = useLanguage()

  const toolInfo = useMemo(() => ({
    katana: {
      name: t("deepCheck.tools.katana.name"),
      description: t("deepCheck.tools.katana.description"),
    },
  }), [t])

  const info = toolInfo[toolName]
  const currentStatus = status?.status || "pending"
  const progress = status?.progress || { current: 0, total: 0 }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-500/50 bg-green-500/10"
      case "running":
        return "border-tech-cyan/50 bg-tech-cyan/10"
      case "failed":
        return "border-red-500/50 bg-red-500/10"
      case "pending":
        return "border-gray-500/50 bg-gray-500/10"
      default:
        return "border-gray-500/50 bg-gray-500/10"
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t(`deepCheck.tools.${toolName}.completed`)
      case "running":
        return t(`deepCheck.tools.${toolName}.running`)
      case "failed":
        return t(`deepCheck.tools.${toolName}.failed`)
      case "pending":
        return t("common.loading")
      default:
        return ""
    }
  }

  return (
    <div className={`border-2 rounded-xl p-6 ${getStatusColor(currentStatus)} transition-all duration-300 hover:shadow-lg hover:shadow-tech-cyan/10`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentStatus === "completed" ? "bg-green-500/20" : 
              currentStatus === "running" ? "bg-tech-cyan/20 animate-pulse" : 
              currentStatus === "failed" ? "bg-red-500/20" : 
              "bg-gray-500/20"
            }`}>
              <div className={`text-xl ${currentStatus === "completed" ? "text-green-400" : currentStatus === "running" ? "text-tech-cyan" : currentStatus === "failed" ? "text-red-400" : "text-gray-400"}`}>
                {getStatusIcon(currentStatus)}
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{info.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{info.description}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className={`font-medium ${
            currentStatus === "completed" ? "text-green-400" : 
            currentStatus === "running" ? "text-tech-cyan" : 
            currentStatus === "failed" ? "text-red-400" : 
            "text-gray-400"
          }`}>
            {getStatusText(currentStatus)}
          </span>
          {currentStatus === "running" && progress.total > 0 && (
            <span className="text-tech-cyan font-semibold">
              {progress.current}/{progress.total}
            </span>
          )}
        </div>
        {currentStatus === "running" && progress.total > 0 && (
          <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-tech-cyan to-tech-cyan/60 h-full transition-all duration-500 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}
        {status?.error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {status.error}
          </div>
        )}
      </div>
    </div>
  )
}

// 使用memo优化，避免不必要的重渲染
export default memo(ToolStatusCard)
