"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ScanOptions } from "@/types/scan"
import ScanOptionToggle from "./ScanOptionToggle"
import { useLanguage } from "@/contexts/LanguageContext"
import { getFeaturePricing, type FeaturePricing } from "@/services/pricingService"

export default function UrlInput() {
  const { t, locale } = useLanguage()
  const [url, setUrl] = useState("")
  const [urlError, setUrlError] = useState<string | null>(null)
  const [cursorVisible, setCursorVisible] = useState(true)
  const [showOptions, setShowOptions] = useState(true)
  const [options, setOptions] = useState<ScanOptions>({
    websiteInfo: true,
    domainInfo: true,
    sslInfo: true,
    techStack: true,
    linkHealthCheck: false,
    aiAnalysis: false,
    performance: false,
    seo: false,
    security: false,
    accessibility: false,
    deepScan: false,
  })
  // AI 分析模式：balanced（平衡）| performance（性能优先）| security（安全优先）| seo（SEO优先）
  const [aiMode, setAiMode] = useState<"balanced" | "performance" | "security" | "seo">("balanced")
  const [featurePricing, setFeaturePricing] = useState<Record<string, FeaturePricing>>({})
  const router = useRouter()

  // 加载功能定价信息
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricingData = await getFeaturePricing()
        const pricingMap: Record<string, FeaturePricing> = {}
        pricingData.forEach((pricing) => {
          pricingMap[pricing.feature_code] = pricing
        })
        setFeaturePricing(pricingMap)
        // 调试日志：检查 deep-scan 的积分值
        if (pricingMap['deep-scan']) {
          console.log('[UrlInput] Deep-scan pricing loaded:', {
            feature_code: pricingMap['deep-scan'].feature_code,
            credits_cost: pricingMap['deep-scan'].credits_cost,
          })
        }
      } catch (error) {
        // 静默处理错误，定价信息加载失败不影响使用
        console.error("Failed to load feature pricing:", error)
      }
    }
    loadPricing()
  }, [])

  // Typing effect cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 500)
    return () => clearInterval(interval)
  }, [])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
    } catch (err) {
      // 静默处理剪贴板错误，避免在生产环境显示错误
      // 在生产环境中，剪贴板权限被拒绝是正常的，无需记录
    }
  }

  // URL验证函数
  const validateURL = (urlToValidate: string): string | null => {
    const trimmed = urlToValidate.trim()
    
    // 检查空值
    if (!trimmed) {
      return t("urlInput.errors.empty") || "URL cannot be empty"
    }
    
    // 检查长度限制（前端限制为2000字符，后端限制为2048）
    if (trimmed.length > 2000) {
      return t("urlInput.errors.tooLong") || "URL is too long (maximum 2000 characters)"
    }
    
    if (trimmed.length < 8) {
      return t("urlInput.errors.tooShort") || "URL is too short"
    }
    
    // 基本URL格式验证
    try {
      const urlObj = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") 
        ? trimmed 
        : `https://${trimmed}`)
      
      // 检查协议
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        return t("urlInput.errors.invalidProtocol") || "Only HTTP and HTTPS protocols are allowed"
      }
      
      // 检查主机名
      if (!urlObj.hostname) {
        return t("urlInput.errors.missingHostname") || "Missing hostname"
      }
      
      // 检查是否包含可疑字符
      if (/[\x00-\x1F\x7F]/.test(trimmed)) {
        return t("urlInput.errors.invalidCharacters") || "URL contains invalid characters"
      }
      
    } catch (e) {
      return t("urlInput.errors.invalidFormat") || "Invalid URL format"
    }
    
    return null
  }

  const startScan = () => {
    const validationError = validateURL(url)
    if (validationError) {
      setUrlError(validationError)
      return
    }
    
    setUrlError(null)
    if (!url.trim()) return
    
    // 构建选项参数（基础功能放在前面）
    const optionsParams = new URLSearchParams()
    if (options.linkHealthCheck) optionsParams.append("options", "link-health")
    if (options.websiteInfo) optionsParams.append("options", "website-info")
    if (options.domainInfo) optionsParams.append("options", "domain-info")
    if (options.sslInfo) optionsParams.append("options", "ssl-info")
    if (options.techStack) optionsParams.append("options", "tech-stack")
    // 高级功能
    if (options.performance) optionsParams.append("options", "performance")
    if (options.seo) optionsParams.append("options", "seo")
    if (options.security) optionsParams.append("options", "security")
    if (options.accessibility) optionsParams.append("options", "accessibility")
    if (options.deepScan) optionsParams.append("options", "katana")
    if (options.aiAnalysis) {
      optionsParams.append("options", "ai-analysis")
      // 如果启用了 AI 分析，添加分析模式参数
      if (aiMode && aiMode !== "balanced") {
        optionsParams.append("ai_mode", aiMode)
      }
      // 添加语言参数
      optionsParams.append("lang", locale)
    }

    const queryString = optionsParams.toString()
    const scanUrl = queryString
      ? `/scan?url=${encodeURIComponent(url.trim())}&${queryString}`
      : `/scan?url=${encodeURIComponent(url.trim())}`
    
    router.push(scanUrl)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      startScan()
    }
  }

  return (
    <div className="max-w-3xl mx-auto relative z-20">
      <div className="group">
        <form onSubmit={(e) => { e.preventDefault(); startScan() }} className="relative">
          {/* Outer Glow Border */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          
          <div className="clip-tech-btn bg-black/40 border border-tech-border/30 group-focus-within:border-tech-cyan/80 group-focus-within:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300 flex flex-col sm:flex-row p-1.5 backdrop-blur-sm">
            
            <div className="flex-grow flex items-center px-4 py-3 bg-transparent">
              <span className="text-tech-cyan/80 mr-3 font-mono font-bold text-lg">{'>'}</span>
              <input
                className="w-full bg-transparent border-none text-white font-mono placeholder-tech-cyan/40 focus:ring-0 focus:outline-none text-sm md:text-base"
                placeholder={t("urlInput.placeholder")}
                type="text"
                value={url}
                onChange={(e) => {
                  // 限制输入长度
                  const value = e.target.value
                  if (value.length <= 2000) {
                    setUrl(value)
                  }
                }}
                onKeyPress={handleKeyPress}
                autoComplete="off"
                maxLength={2000}
              />
              <span className={`w-2 h-5 bg-tech-cyan ${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity shadow-neon-cyan`}></span>
            </div>
            {urlError && (
              <div className="mt-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs font-mono">
                {urlError}
              </div>
            )}

            <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="px-3 py-2 font-mono text-xs text-tech-cyan/70 hover:text-tech-cyan border border-transparent hover:border-tech-border/30 hover:bg-tech-cyan/5 rounded transition-all flex items-center gap-1"
                aria-label={showOptions ? t("urlInput.hideOptions") : t("urlInput.advancedOptions")}
              >
                {showOptions ? t("urlInput.hideOptions") : t("urlInput.advancedOptions")}
                <svg className={`w-3 h-3 transition-transform duration-300 ${showOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="px-3 py-2 font-mono text-xs text-tech-cyan/70 hover:text-tech-cyan border border-transparent hover:border-tech-border/30 hover:bg-tech-cyan/5 rounded transition-all"
              >
                {t("urlInput.paste")}
              </button>
              <button
                type="submit"
                disabled={!options.linkHealthCheck && !options.websiteInfo && !options.domainInfo && !options.sslInfo && !options.techStack && !options.aiAnalysis && !options.performance && !options.seo && !options.security && !options.accessibility && !options.deepScan}
                className="bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-8 py-3 clip-tech-btn transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] relative overflow-hidden group/btn border-2 border-tech-cyan disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-tech-cyan"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t("urlInput.startScan")}
                </span>
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 ease-out"></div>
              </button>
            </div>
          </div>
        </form>
        
        {/* Decorative Elements around input */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-tech-cyan/20 hidden md:block"></div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-tech-cyan/20 hidden md:block"></div>
      </div>

      {/* Scan Options Panel */}
      <div className={`mt-4 overflow-hidden transition-all duration-300 ease-in-out ${
        showOptions ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-6 bg-tech-surface/50 border border-tech-border/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
            <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{t("urlInput.scanOptions")}</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="text-tech-cyan/50 hover:text-tech-cyan transition-colors"
              aria-label={t("urlInput.hideOptions")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 基础检测选项（免费，无需注册） */}
          <div className="mb-4">
            <div className="mb-2">
              <div className="text-tech-cyan/60 font-mono text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="w-1 h-3 bg-tech-cyan/50"></span>
                {t("urlInput.sectionBasicTitle")}
              </div>
              <p className="text-tech-cyan/50 text-[10px] font-mono ml-4">
                {t("urlInput.sectionBasicDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ScanOptionToggle
              id="website-info"
              label={t("scan.moduleNameWebsiteInfo")}
              description={t("urlInput.websiteInfoDesc")}
              checked={options.websiteInfo}
              onChange={(checked) => setOptions(prev => ({ ...prev, websiteInfo: checked }))}
              isFree={true}
            />
            <ScanOptionToggle
              id="domain-info"
              label={t("scan.moduleNameDomainInfo")}
              description={t("urlInput.domainInfoDesc")}
              checked={options.domainInfo}
              onChange={(checked) => setOptions(prev => ({ ...prev, domainInfo: checked }))}
              isFree={true}
            />
            <ScanOptionToggle
              id="ssl-info"
              label={t("scan.moduleNameSSLInfo")}
              description={t("urlInput.sslInfoDesc")}
              checked={options.sslInfo}
              onChange={(checked) => setOptions(prev => ({ ...prev, sslInfo: checked }))}
              isFree={true}
            />
            <ScanOptionToggle
              id="tech-stack"
              label={t("scan.moduleNameTechStack")}
              description={t("urlInput.techStackDesc")}
              checked={options.techStack}
              onChange={(checked) => setOptions(prev => ({ ...prev, techStack: checked }))}
              isFree={true}
            />
            <ScanOptionToggle
              id="link-health"
              label={t("scan.moduleNameLinkHealth")}
              description={t("urlInput.linkHealthCheckDesc")}
              checked={options.linkHealthCheck}
              onChange={(checked) => {
                setOptions(prev => {
                  const newOptions = { ...prev, linkHealthCheck: checked }
                  // 如果启用页面链接检查，自动禁用全站链接检查
                  if (checked && prev.deepScan) {
                    newOptions.deepScan = false
                  }
                  return newOptions
                })
              }}
              isFree={true}
            />
            </div>
          </div>
          
          {/* 高级检测选项（需要注册，有免费额度） */}
          <div className="mb-4">
            <div className="mb-2">
              <div className="text-tech-cyan/60 font-mono text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="w-1 h-3 bg-tech-cyan/50"></span>
                {t("urlInput.sectionAdvancedTitle")}
              </div>
              <p className="text-tech-cyan/50 text-[10px] font-mono ml-4">
                {t("urlInput.sectionAdvancedDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ScanOptionToggle
              id="performance"
              label={t("scan.moduleNamePerformance")}
              description={t("urlInput.performanceDesc")}
              checked={options.performance}
              onChange={(checked) => setOptions(prev => ({ ...prev, performance: checked }))}
              creditsCost={featurePricing['performance']?.credits_cost}
              isPremium={true}
            />
            <ScanOptionToggle
              id="seo"
              label={t("scan.moduleNameSEO")}
              description={t("urlInput.seoDesc")}
              checked={options.seo}
              onChange={(checked) => setOptions(prev => ({ ...prev, seo: checked }))}
              creditsCost={featurePricing['seo']?.credits_cost}
              isPremium={true}
            />
            <ScanOptionToggle
              id="security"
              label={t("scan.moduleNameSecurity")}
              description={t("urlInput.securityDesc")}
              checked={options.security}
              onChange={(checked) => setOptions(prev => ({ ...prev, security: checked }))}
              creditsCost={featurePricing['security']?.credits_cost}
              isPremium={true}
            />
            <ScanOptionToggle
              id="accessibility"
              label={t("scan.moduleNameAccessibility")}
              description={t("urlInput.accessibilityDesc")}
              checked={options.accessibility}
              onChange={(checked) => setOptions(prev => ({ ...prev, accessibility: checked }))}
              creditsCost={featurePricing['accessibility']?.credits_cost}
              isPremium={true}
            />
            <ScanOptionToggle
              id="ai-analysis"
              label={t("scan.moduleNameAIAnalysis")}
              description={t("urlInput.aiAnalysisDesc")}
              checked={options.aiAnalysis}
              onChange={(checked) => setOptions(prev => ({ ...prev, aiAnalysis: checked }))}
              creditsCost={featurePricing['ai-analysis']?.credits_cost}
              isPremium={true}
            />
            <ScanOptionToggle
              id="deep-scan"
              label={t("scan.moduleNameDeepScan")}
              description={t("urlInput.deepScanDesc")}
              checked={options.deepScan}
              onChange={(checked) => {
                setOptions(prev => {
                  const newOptions = { ...prev, deepScan: checked }
                  // 如果启用全站链接检查，自动禁用页面链接检查
                  if (checked && prev.linkHealthCheck) {
                    newOptions.linkHealthCheck = false
                  }
                  return newOptions
                })
              }}
              creditsCost={featurePricing['deep-scan']?.credits_cost}
              isPremium={true}
            />
            </div>
          </div>
          
          {/* AI 分析模式选择器（仅在启用 AI 分析时显示） */}
          {options.aiAnalysis && (
            <div className="mb-4 mt-2 p-4 bg-tech-bg/40 border border-tech-cyan/20 rounded-lg animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-1 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                <span className="text-tech-cyan font-mono text-xs font-bold uppercase tracking-wider">{t("urlInput.aiMode")}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: "balanced", label: t("urlInput.aiModeBalanced"), desc: t("urlInput.aiModeBalanced") },
                  { value: "performance", label: t("urlInput.aiModePerformance"), desc: t("urlInput.aiModePerformance") },
                  { value: "security", label: t("urlInput.aiModeSecurity"), desc: t("urlInput.aiModeSecurity") },
                  { value: "seo", label: t("urlInput.aiModeSeo"), desc: t("urlInput.aiModeSeo") },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setAiMode(mode.value as typeof aiMode)}
                    className={`relative px-3 py-2 rounded border-2 font-mono text-xs font-bold transition-all ${
                      aiMode === mode.value
                        ? "bg-tech-cyan/20 border-tech-cyan text-tech-cyan shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                        : "bg-tech-surface/50 border-tech-border/30 text-tech-cyan/70 hover:border-tech-cyan/50 hover:text-tech-cyan"
                    }`}
                  >
                    <div className="font-bold leading-tight">{mode.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5 leading-tight">{mode.desc}</div>
                    {aiMode === mode.value && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-tech-border/20">
            <div className="text-tech-cyan/50 font-mono text-[10px] uppercase tracking-wider">
              {locale === "zh" 
                ? `已选择 ${Object.values(options).filter(Boolean).length} 项检测` 
                : `${Object.values(options).filter(Boolean).length} options selected`}
            </div>
            <button
              type="button"
              onClick={() => {
                setOptions({
                  websiteInfo: true,
                  domainInfo: true,
                  sslInfo: true,
                  techStack: true,
                  linkHealthCheck: false,
                  aiAnalysis: false,
                  performance: false,
                  seo: false,
                  security: false,
                  accessibility: false,
                  deepScan: false,
                })
                setAiMode("balanced")
              }}
              className="px-4 py-2 font-mono text-xs text-tech-cyan/70 hover:text-tech-cyan border border-tech-border/30 hover:border-tech-cyan/50 hover:bg-tech-cyan/5 rounded transition-all"
            >
              {t("urlInput.resetDefault")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

