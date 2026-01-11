"use client"

import { memo, useMemo } from "react"
import { AIAnalysis } from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

interface AIAnalysisReportProps {
  analysis: AIAnalysis
}

function AIAnalysisReport({ analysis }: AIAnalysisReportProps) {
  const { t } = useLanguage()
  
  // 处理可能的 JSON 字符串格式的 analysis
  const processedAnalysis = useMemo(() => {
    // 如果 analysis 是字符串，尝试解析
    if (typeof analysis === 'string') {
      try {
        const parsed = JSON.parse(analysis)
        return parsed
      } catch {
        // 如果解析失败，返回原始对象
        return analysis
      }
    }
    return analysis
  }, [analysis])
  
  // 清理 summary - 处理各种可能的 JSON 格式
  const cleanSummary = useMemo(() => {
    let summary = processedAnalysis?.summary || ""
    if (!summary) return ""
    
    // 如果 summary 是对象，尝试提取文本字段
    if (typeof summary === 'object' && summary !== null) {
      // 如果是对象，尝试提取可能的文本字段
      if ('summary' in summary && typeof (summary as any).summary === 'string') {
        return (summary as any).summary
      }
      if ('text' in summary && typeof (summary as any).text === 'string') {
        return (summary as any).text
      }
      if ('content' in summary && typeof (summary as any).content === 'string') {
        return (summary as any).content
      }
      // 如果无法提取，转换为字符串（但这不是理想情况）
      summary = JSON.stringify(summary)
    }
    
    // 确保 summary 是字符串
    if (typeof summary !== 'string') {
      summary = String(summary)
    }
    
    // 处理代码块中的 JSON（```json ... ```）
    const jsonBlockMatch = summary.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonBlockMatch) {
        try {
          const parsed = JSON.parse(jsonBlockMatch[1])
        // 如果解析后的对象有 summary 字段，使用它
        if (parsed.summary && typeof parsed.summary === 'string') {
          return parsed.summary
        }
        // 否则尝试提取其他文本字段
        if (parsed.text && typeof parsed.text === 'string') return parsed.text
        if (parsed.content && typeof parsed.content === 'string') return parsed.content
        // 如果整个对象就是内容，不显示 JSON，而是提示
        return "AI 分析结果格式异常，请查看详细数据"
      } catch {
        // 解析失败，继续处理原始内容
        }
    }
    
    // 处理纯 JSON 字符串（以 { 开头）
    if (summary.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(summary)
        // 如果解析成功，提取 summary 字段
        if (parsed.summary && typeof parsed.summary === 'string') {
          return parsed.summary
        }
        // 如果解析后的对象就是内容，不显示 JSON
        return "AI 分析结果格式异常，请查看详细数据"
        } catch {
        // 不是有效的 JSON，返回原始内容
        }
      }
    
    return summary
  }, [processedAnalysis?.summary])
  
  // 提取评分（处理可能的字符串格式）
  const extractScore = (value: any): number | undefined => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'number') {
      // 确保是有效的数字
      if (isNaN(value) || !isFinite(value)) return undefined
      return value
    }
    if (typeof value === 'string') {
      const num = parseInt(value, 10)
      if (!isNaN(num) && isFinite(num)) return num
    }
    // 如果是对象，尝试提取数值字段
    if (typeof value === 'object' && value !== null) {
      if ('value' in value && typeof (value as any).value === 'number') {
        return (value as any).value
      }
    }
    return undefined
  }
  
  // 提取评分数据（支持多种字段名格式）
  const scores = useMemo(() => {
    const scoreList = []
    
    // 尝试多种可能的字段名
    const availabilityScore = extractScore(
      processedAnalysis?.availability_score ?? 
      processedAnalysis?.AvailabilityScore ??
      (processedAnalysis as any)?.availabilityScore
    )
    const performanceScore = extractScore(
      processedAnalysis?.performance_score ?? 
      processedAnalysis?.PerformanceScore ??
      (processedAnalysis as any)?.performanceScore
    )
    const securityScore = extractScore(
      processedAnalysis?.security_score ?? 
      processedAnalysis?.SecurityScore ??
      (processedAnalysis as any)?.securityScore
    )
    const seoScore = extractScore(
      processedAnalysis?.seo_score ?? 
      processedAnalysis?.SEOScore ??
      (processedAnalysis as any)?.seoScore
    )
    
    // 只添加有效的评分（非 0 或明确为 0 的值）
    // 注意：0 是有效评分，但如果所有评分都是 0，可能是解析失败
    if (availabilityScore !== undefined && availabilityScore !== null) {
      scoreList.push({ label: t("scan.aiReportAvailability"), value: availabilityScore, icon: "✓" })
    }
    if (performanceScore !== undefined && performanceScore !== null) {
      scoreList.push({ label: t("scan.aiReportPerformance"), value: performanceScore, icon: "⚡" })
    }
    if (securityScore !== undefined && securityScore !== null) {
      scoreList.push({ label: t("scan.aiReportSecurity"), value: securityScore, icon: "🔒" })
    }
    if (seoScore !== undefined && seoScore !== null) {
      scoreList.push({ label: t("scan.aiReportSEO"), value: seoScore, icon: "📈" })
    }
    
    return scoreList
  }, [processedAnalysis, t])
  
  // 提取风险等级
  const riskLevel = useMemo(() => {
    if (typeof processedAnalysis === 'string') {
      try {
        const parsed = JSON.parse(processedAnalysis)
        return parsed.risk_level
      } catch {
        return null
      }
    }
    return processedAnalysis?.risk_level
  }, [processedAnalysis])
  
  // 提取数组字段（处理可能的字符串格式）
  const extractArray = (value: any): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value.filter(item => typeof item === 'string')
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed.filter(item => typeof item === 'string')
      } catch {
        // 不是 JSON，返回空数组
      }
    }
    return []
  }
  
  const highlights = extractArray(processedAnalysis?.highlights)
  const availabilityFindings = extractArray(processedAnalysis?.availability_findings)
  const performanceFindings = extractArray(processedAnalysis?.performance_findings)
  const securityFindings = extractArray(processedAnalysis?.security_findings)
  const seoFindings = extractArray(processedAnalysis?.seo_findings)
  const recommendations = extractArray(processedAnalysis?.recommendations)

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-400 to-emerald-500"
    if (score >= 60) return "from-yellow-400 to-amber-500"
    return "from-red-400 to-rose-500"
  }

  // 获取风险等级样式
  const getRiskLevelStyle = (level: string) => {
    if (!level) return "bg-tech-cyan/20 border-tech-cyan/50 text-tech-cyan"
    const levelLower = level.toLowerCase()
    if (levelLower.includes("低") || levelLower.includes("low")) {
      return "bg-green-500/20 border-green-500/50 text-green-400"
    }
    if (levelLower.includes("中") || levelLower.includes("medium") || levelLower.includes("moderate")) {
      return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
    }
    if (levelLower.includes("高") || levelLower.includes("high")) {
      return "bg-red-500/20 border-red-500/50 text-red-400"
    }
    return "bg-tech-cyan/20 border-tech-cyan/50 text-tech-cyan"
  }

  // 翻译风险等级（支持中英文后端返回）
  const translateRiskLevel = (level: string): string => {
    if (!level) return ""
    const levelLower = level.toLowerCase()
    if (levelLower.includes("低") || levelLower.includes("low")) {
      return t("scan.riskLevelLow")
    }
    if (levelLower.includes("中") || levelLower.includes("medium") || levelLower.includes("moderate")) {
      return t("scan.riskLevelMedium")
    }
    if (levelLower.includes("高") || levelLower.includes("high")) {
      return t("scan.riskLevelHigh")
    }
    return level // 如果无法识别，返回原始值
  }

  return (
    <div className="mt-6 animate-fade-in">
      {/* 主容器 - 带渐变边框和发光效果 */}
      <div className="relative group">
        {/* 外层发光边框 */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 via-tech-purple/30 to-tech-blue/30 rounded-xl blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
        
        {/* 内层容器 */}
        <div className="relative bg-tech-surface/80 backdrop-blur-xl border border-tech-border/40 rounded-xl p-6 md:p-8 overflow-hidden">
          {/* 装饰性角落标记 */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-tech-cyan/50"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-tech-cyan/50"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-tech-cyan/50"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-tech-cyan/50"></div>

          {/* 标题区域 */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-tech-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tech-cyan/20 to-tech-purple/20 border border-tech-cyan/30 flex items-center justify-center text-2xl shadow-neon-cyan">
                🤖
              </div>
              <div>
                <h3 className="text-tech-cyan font-mono text-lg font-black uppercase tracking-wider">
                  {t("scan.aiReportTitle")}
                </h3>
                <p className="text-tech-cyan/60 font-mono text-xs mt-0.5">{t("scan.aiReportPoweredBy")}</p>
              </div>
            </div>
            {riskLevel && (
              <div className={`px-4 py-2 rounded-lg border-2 font-mono text-sm font-bold uppercase tracking-wider ${getRiskLevelStyle(riskLevel)}`}>
                {translateRiskLevel(riskLevel)}
              </div>
            )}
          </div>

          {/* 总体结论 - 突出显示 */}
          {cleanSummary && cleanSummary.trim() && (
            <div className="mb-6 p-5 bg-gradient-to-r from-tech-cyan/10 via-tech-purple/5 to-tech-blue/10 border border-tech-cyan/20 rounded-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-tech-cyan to-tech-purple"></div>
              <div className="flex items-start gap-3 pl-4">
                <span className="text-2xl mt-0.5">💡</span>
                <div className="flex-1">
                  <div className="text-tech-cyan/70 font-mono text-xs uppercase tracking-wider mb-2">{t("scan.aiReportSummary")}</div>
                  <p className="text-gray-200 leading-relaxed font-sans text-sm md:text-base whitespace-pre-wrap">{cleanSummary}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 如果没有 summary 但有其他数据，显示提示 */}
          {!cleanSummary && scores.length === 0 && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ AI 分析数据格式异常，可能返回了原始 JSON 文本。请检查后端日志。
              </p>
            </div>
          )}

          {/* 各维度评分 - 美化卡片 */}
          {scores.length > 0 ? (
            <div className="mb-6">
              <div className="text-tech-cyan/70 font-mono text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-tech-cyan"></span>
                {t("scan.aiReportScores")}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scores.map((score) => (
                  <div
                    key={score.label}
                    className="relative group/score overflow-hidden rounded-lg border border-tech-border/30 bg-tech-surface/60 backdrop-blur-sm hover:border-tech-cyan/50 transition-all duration-300"
                  >
                    {/* 背景渐变 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${getScoreColor(score.value)} opacity-10 group-hover/score:opacity-20 transition-opacity duration-300`}></div>
                    
                    {/* 内容 */}
                    <div className="relative p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{score.icon}</span>
                        <span className={`text-2xl font-black font-mono bg-gradient-to-r ${getScoreColor(score.value)} bg-clip-text text-transparent`}>
                          {score.value}
                        </span>
                      </div>
                      <div className="text-tech-cyan/60 font-mono text-xs uppercase tracking-wider">
                        {score.label}
                      </div>
                      
                      {/* 进度条 */}
                      <div className="mt-3 h-1.5 bg-tech-surface/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getScoreColor(score.value)} animate-score-progress`}
                          style={{ width: `${Math.max(0, Math.min(100, score.value))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ 未获取到评分数据。可能是 AI 分析返回的数据格式不正确，或评分字段缺失。
              </p>
            </div>
          )}

          {/* 详细信息区域 */}
          <div className="space-y-4">
            {/* 关键发现 */}
            {highlights.length > 0 && (
              <DetailSection
                title={t("scan.aiReportHighlights")}
                icon="⭐"
                items={highlights}
                color="from-yellow-400/20 to-amber-500/20"
                borderColor="border-yellow-400/30"
              />
            )}

            {/* 可用性分析 */}
            {availabilityFindings.length > 0 && (
              <DetailSection
                title={t("scan.aiReportAvailabilityFindings")}
                icon="✓"
                items={availabilityFindings}
                color="from-green-400/20 to-emerald-500/20"
                borderColor="border-green-400/30"
              />
            )}

            {/* 性能分析 */}
            {performanceFindings.length > 0 && (
              <DetailSection
                title={t("scan.aiReportPerformanceFindings")}
                icon="⚡"
                items={performanceFindings}
                color="from-blue-400/20 to-cyan-500/20"
                borderColor="border-blue-400/30"
              />
            )}

            {/* 安全分析 */}
            {securityFindings.length > 0 && (
              <DetailSection
                title={t("scan.aiReportSecurityFindings")}
                icon="🔒"
                items={securityFindings}
                color="from-red-400/20 to-rose-500/20"
                borderColor="border-red-400/30"
              />
            )}

            {/* SEO 分析 */}
            {seoFindings.length > 0 && (
              <DetailSection
                title={t("scan.aiReportSEOFindings")}
                icon="📈"
                items={seoFindings}
                color="from-purple-400/20 to-pink-500/20"
                borderColor="border-purple-400/30"
              />
            )}

            {/* 优化建议 */}
            {recommendations.length > 0 && (
              <DetailSection
                title={t("scan.aiReportRecommendations")}
                icon="💡"
                items={recommendations}
                color="from-tech-cyan/20 to-tech-blue/20"
                borderColor="border-tech-cyan/30"
              />
            )}
          </div>
          
          {/* 调试信息（开发环境）- 帮助诊断数据问题 */}
          {(process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.search.includes('debug'))) && (
            <details className="mt-4 p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg">
              <summary className="text-tech-cyan/60 font-mono text-xs cursor-pointer">
                🔍 Debug Info (Development Only)
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-tech-cyan/60 font-mono text-xs">Raw Analysis Type: </span>
                  <span className="text-gray-300 text-xs">{typeof analysis}</span>
                </div>
                <div>
                  <span className="text-tech-cyan/60 font-mono text-xs">Processed Analysis Type: </span>
                  <span className="text-gray-300 text-xs">{typeof processedAnalysis}</span>
                </div>
                <div>
                  <span className="text-tech-cyan/60 font-mono text-xs">Scores Count: </span>
                  <span className="text-gray-300 text-xs">{scores.length}</span>
                </div>
                <pre className="text-xs text-gray-400 overflow-auto max-h-60 border border-tech-border/30 p-2 rounded">
                  {JSON.stringify(processedAnalysis, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// 详细信息部分组件
interface DetailSectionProps {
  title: string
  icon: string
  items: string[]
  color: string
  borderColor: string
}

const DetailSection = memo(function DetailSection({ title, icon, items, color, borderColor }: DetailSectionProps) {
  return (
    <div className={`p-4 rounded-lg border ${borderColor} bg-gradient-to-r ${color} backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h4 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-300 leading-relaxed">
            <span className="text-tech-cyan/60 mt-1.5 flex-shrink-0">▸</span>
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
})

export default memo(AIAnalysisReport)

