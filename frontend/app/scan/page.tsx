"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ScanResult, 
  Progress, 
  ScanState, 
  ScanOptions, 
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
import { lazy, Suspense } from "react"

// 简单的加载占位符组件
const LoadingPlaceholder = () => (
  <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg animate-pulse">
    <div className="h-4 bg-tech-cyan/20 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-tech-cyan/10 rounded w-1/2"></div>
  </div>
)
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ProgressBar from "@/components/ProgressBar"
import ScanOptionToggle from "@/components/ScanOptionToggle"

// 懒加载大型组件
const AIAnalysisReport = lazy(() => import("@/components/AIAnalysisReport"))
const PerformanceCard = lazy(() => import("@/components/PerformanceCard"))
const SEOComplianceCard = lazy(() => import("@/components/SEOComplianceCard"))
const SecurityPanel = lazy(() => import("@/components/SecurityPanel"))
const AccessibilityCard = lazy(() => import("@/components/AccessibilityCard"))
const ResultTable = lazy(() => import("@/components/ResultTable"))
const ReportSummary = lazy(() => import("@/components/ReportSummary"))
const ReportActions = lazy(() => import("@/components/ReportActions"))
const InfoCard = lazy(() => import("@/components/InfoCard").then(module => ({ default: module.default })))
const ModuleStatus = lazy(() => import("@/components/ModuleStatus"))

// InfoItem 使用频繁，保持直接导入
import { InfoItem } from "@/components/InfoCard"
import { API_BASE_URL, debugError } from "@/utils/config"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { createScanTask, pollTaskStatus, getTaskResults, getTaskStatus, TaskStatusResponse, type CreateTaskResponse } from "@/services/taskService"
import { getCreditsBalance, type UserCredits } from "@/services/creditsService"
import { getUserSubscription, getMonthlyUsage, type Subscription, type SubscriptionUsage } from "@/services/pricingService"
import { getFeaturePricing, type FeaturePricing } from "@/services/pricingService"
import FeaturePricingBadge from "@/components/FeaturePricingBadge"
import { checkFeatureAccess, checkMultipleFeatures, type FeatureAccessResult } from "@/services/featureAccessService"

function ScanPageContent() {
  const { t, locale } = useLanguage()
  const { user } = useAuth()
  const params = useSearchParams()
  const router = useRouter()
  const url = params.get("url")
  const taskIdFromUrl = params.get("taskId")
  
  // 用户余额和订阅信息
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [monthlyUsage, setMonthlyUsage] = useState<SubscriptionUsage | null>(null)
  const [featurePricing, setFeaturePricing] = useState<Record<string, FeaturePricing>>({})
  const [loadingUserInfo, setLoadingUserInfo] = useState(false)
  const [featureAccess, setFeatureAccess] = useState<Record<string, FeatureAccessResult>>({})

  const [results, setResults] = useState<ScanResult[]>([])
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 })
  const [state, setState] = useState<ScanState>("idle")
  const [error, setError] = useState<string>("")
  const [scanDuration, setScanDuration] = useState<number>(0)
  const [websiteInfo, setWebsiteInfo] = useState<WebsiteInfo | null>(null)
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null)
  const [sslInfo, setSSLInfo] = useState<SSLInfo | null>(null)
  const [techStack, setTechStack] = useState<TechStack | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [seoCompliance, setSEOCompliance] = useState<SEOCompliance | null>(null)
  const [securityRisk, setSecurityRisk] = useState<SecurityRisk | null>(null)
  const [accessibility, setAccessibility] = useState<AccessibilityInfo | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null) // 用于显示的任务URL
  const [moduleStatuses, setModuleStatuses] = useState<Record<string, any>>({})
  const [scanStartTime, setScanStartTime] = useState<number | undefined>(undefined)
  const stopPollingRef = useRef<(() => void) | null>(null)
  const isScanningRef = useRef<boolean>(false) // 防重复点击标记
  const lastClickTimeRef = useRef<number>(0) // 上次点击时间（用于防抖）
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null) // 防抖定时器
  
  // 从URL参数读取选项（使用useMemo优化）
  const getOptionsFromParams = useCallback((): ScanOptions => {
    const optionsParam = params.getAll("options")
    const hasAnyOption = optionsParam.length > 0
    // 如果没有任何选项，默认启用 link-health
    // 如果有选项，检查是否包含 link-health
    const newOptions = {
      linkHealthCheck: hasAnyOption ? optionsParam.includes("link-health") : true,
      websiteInfo: optionsParam.includes("website-info"),
      domainInfo: optionsParam.includes("domain-info"),
      sslInfo: optionsParam.includes("ssl-info") || optionsParam.includes("ssl"),
      techStack: optionsParam.includes("tech-stack") || optionsParam.includes("techstack"),
      aiAnalysis: optionsParam.includes("ai-analysis"),
      performance: optionsParam.includes("performance") || false,
      seo: optionsParam.includes("seo") || false,
      security: optionsParam.includes("security") || false,
      accessibility: optionsParam.includes("accessibility") || false,
      deepScan: optionsParam.includes("katana") || false,
    }
    return newOptions
  }, [params])

  // 使用useMemo计算初始选项，避免重复计算
  const initialOptions = useMemo<ScanOptions>(() => {
    const optionsParam = params.getAll("options")
    const hasAnyOption = optionsParam.length > 0
    // 如果没有任何选项，默认启用 link-health
    // 如果有选项，检查是否包含 link-health
    return {
      linkHealthCheck: hasAnyOption ? optionsParam.includes("link-health") : true,
      websiteInfo: optionsParam.includes("website-info"),
      domainInfo: optionsParam.includes("domain-info"),
      sslInfo: optionsParam.includes("ssl-info") || optionsParam.includes("ssl"),
      techStack: optionsParam.includes("tech-stack") || optionsParam.includes("techstack"),
      aiAnalysis: optionsParam.includes("ai-analysis"),
      performance: optionsParam.includes("performance") || false,
      seo: optionsParam.includes("seo") || false,
      security: optionsParam.includes("security") || false,
      accessibility: optionsParam.includes("accessibility") || false,
      deepScan: optionsParam.includes("katana") || false,
    }
  }, [params])

  const [options, setOptions] = useState<ScanOptions>(initialOptions)
  const [showOptions, setShowOptions] = useState(false)
  const scanStartTimeRef = useRef<number>(0)
  
  // AI 分析模式：balanced（平衡）| performance（性能优先）| security（安全优先）| seo（SEO优先）
  const [aiMode, setAiMode] = useState<"balanced" | "performance" | "security" | "seo">(() => {
    const mode = params.get("ai_mode")
    if (mode === "performance" || mode === "security" || mode === "seo") {
      return mode
    }
    return "balanced"
  })

  // 当URL参数变化时，更新选项（通过监听URL字符串变化）
  useEffect(() => {
    const newOptions = getOptionsFromParams()
    
    // 只有当选项实际变化时才更新
    setOptions((prev: ScanOptions) => {
      if (
        prev.linkHealthCheck !== newOptions.linkHealthCheck ||
        prev.websiteInfo !== newOptions.websiteInfo ||
        prev.domainInfo !== newOptions.domainInfo ||
        prev.sslInfo !== newOptions.sslInfo ||
        prev.techStack !== newOptions.techStack ||
        prev.aiAnalysis !== newOptions.aiAnalysis ||
        prev.performance !== newOptions.performance ||
        prev.seo !== newOptions.seo ||
        prev.security !== newOptions.security ||
        prev.accessibility !== newOptions.accessibility
      ) {
        return newOptions
      }
      return prev
    })
    
    // 同步更新 AI 分析模式（如果 URL 参数中有）
    const modeFromUrl = params.get("ai_mode")
    if (modeFromUrl === "performance" || modeFromUrl === "security" || modeFromUrl === "seo") {
      setAiMode(modeFromUrl)
    } else if (modeFromUrl === null && newOptions.aiAnalysis) {
      // 如果 URL 中没有 ai_mode 但启用了 AI 分析，保持当前模式（或默认 balanced）
      // 这里不强制重置，让用户的选择保持
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, params.toString()])

  // 使用useCallback优化startScan函数，使用任务模式
  const startScan = useCallback(async () => {
    if (!url) return

    // 防重复点击：如果正在扫描，直接返回
    if (isScanningRef.current) {
      console.log("[startScan] Scan already in progress, ignoring duplicate click")
      return
    }

    // 防抖：如果距离上次点击不到500ms，延迟执行
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    const debounceDelay = 500 // 500ms防抖延迟

    if (timeSinceLastClick < debounceDelay) {
      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      // 设置新的定时器
      debounceTimerRef.current = setTimeout(() => {
        startScan()
      }, debounceDelay - timeSinceLastClick)
      return
    }

    // 更新上次点击时间
    lastClickTimeRef.current = now

    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // 设置扫描中标记
    isScanningRef.current = true

    // 停止之前的轮询
    if (stopPollingRef.current) {
      stopPollingRef.current()
      stopPollingRef.current = null
    }

    // 重置状态
    setResults([])
    setProgress({ current: 0, total: 0 })
    setState("running")
    setError("")
    setScanDuration(0)
    setShowOptions(false)
    setWebsiteInfo(null)
    setDomainInfo(null)
    setSSLInfo(null)
    setTechStack(null)
    setPerformance(null)
    setSEOCompliance(null)
    setSecurityRisk(null)
    setAccessibility(null)
    setAiAnalysis(null)
    setTaskId(null)
    setModuleStatuses({})
    
    // 使用 ref 保存开始时间
    scanStartTimeRef.current = Date.now()

    try {
      // 构建选项数组，同时检查付费功能的访问权限
      const optionsArray: string[] = []
      if (options.linkHealthCheck) optionsArray.push("link-health")
      if (options.websiteInfo) optionsArray.push("website-info")
      if (options.domainInfo) optionsArray.push("domain-info")
      if (options.sslInfo) optionsArray.push("ssl-info")
      if (options.techStack) optionsArray.push("tech-stack")
      
      // 检查付费功能访问权限（在开始扫描前重新验证）
      if (options.performance) {
        let access = featureAccess['performance']
        // 如果访问状态不存在或不可访问，重新检查
        if (!access || access.canAccess !== true) {
          access = await checkFeatureAccess('performance')
          setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'performance': access }))
        }
        if (access.canAccess === true) {
          optionsArray.push("performance")
        } else {
          const errorMsg = access.reason === 'not_logged_in' 
            ? t("scan.loginToUseFeature") || "Login to use this feature"
            : t("scan.goToPricing") || "Go to pricing page to purchase credits"
          setError(`${t("errors.featureAccessDenied") || "Feature access denied"}: Performance. ${errorMsg}`)
          setState("error")
          // 引导用户
          setTimeout(() => {
            if (access.reason === 'not_logged_in') {
              if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            } else if (access.reason === 'insufficient_credits') {
              if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                router.push("/pricing")
              }
            }
          }, 1000)
          isScanningRef.current = false
          return
        }
      }
      if (options.seo) {
        let access = featureAccess['seo']
        // 如果访问状态不存在或不可访问，重新检查
        if (!access || access.canAccess !== true) {
          access = await checkFeatureAccess('seo')
          setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'seo': access }))
        }
        if (access.canAccess === true) {
          optionsArray.push("seo")
        } else {
          const errorMsg = access.reason === 'not_logged_in' 
            ? t("scan.loginToUseFeature") || "Login to use this feature"
            : t("scan.goToPricing") || "Go to pricing page to purchase credits"
          setError(`${t("errors.featureAccessDenied") || "Feature access denied"}: SEO. ${errorMsg}`)
          setState("error")
          // 引导用户
          setTimeout(() => {
            if (access.reason === 'not_logged_in') {
              if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            } else if (access.reason === 'insufficient_credits') {
              if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                router.push("/pricing")
              }
            }
          }, 1000)
          isScanningRef.current = false
          return
        }
      }
      if (options.security) {
        let access = featureAccess['security']
        // 如果访问状态不存在或不可访问，重新检查
        if (!access || access.canAccess !== true) {
          access = await checkFeatureAccess('security')
          setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'security': access }))
        }
        if (access.canAccess === true) {
          optionsArray.push("security")
        } else {
          const errorMsg = access.reason === 'not_logged_in' 
            ? t("scan.loginToUseFeature") || "Login to use this feature"
            : t("scan.goToPricing") || "Go to pricing page to purchase credits"
          setError(`${t("errors.featureAccessDenied") || "Feature access denied"}: Security. ${errorMsg}`)
          setState("error")
          // 引导用户
          setTimeout(() => {
            if (access.reason === 'not_logged_in') {
              if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            } else if (access.reason === 'insufficient_credits') {
              if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                router.push("/pricing")
              }
            }
          }, 1000)
          isScanningRef.current = false
          return
        }
      }
      if (options.accessibility) {
        let access = featureAccess['accessibility']
        // 如果访问状态不存在或不可访问，重新检查
        if (!access || access.canAccess !== true) {
          access = await checkFeatureAccess('accessibility')
          setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'accessibility': access }))
        }
        if (access.canAccess === true) {
          optionsArray.push("accessibility")
        } else {
          const errorMsg = access.reason === 'not_logged_in' 
            ? t("scan.loginToUseFeature") || "Login to use this feature"
            : t("scan.goToPricing") || "Go to pricing page to purchase credits"
          setError(`${t("errors.featureAccessDenied") || "Feature access denied"}: Accessibility. ${errorMsg}`)
          setState("error")
          // 引导用户
          setTimeout(() => {
            if (access.reason === 'not_logged_in') {
              if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            } else if (access.reason === 'insufficient_credits') {
              if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                router.push("/pricing")
              }
            }
          }, 1000)
          isScanningRef.current = false
          return
        }
      }
      if (options.aiAnalysis) {
        let access = featureAccess['ai-analysis']
        // 如果访问状态不存在或不可访问，重新检查
        if (!access || access.canAccess !== true) {
          access = await checkFeatureAccess('ai-analysis')
          setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'ai-analysis': access }))
        }
        if (access.canAccess === true) {
          optionsArray.push("ai-analysis")
        } else {
          const errorMsg = access.reason === 'not_logged_in' 
            ? t("scan.loginToUseFeature") || "Login to use this feature"
            : t("scan.goToPricing") || "Go to pricing page to purchase credits"
          setError(`${t("errors.featureAccessDenied") || "Feature access denied"}: AI Analysis. ${errorMsg}`)
          setState("error")
          // 引导用户
          setTimeout(() => {
            if (access.reason === 'not_logged_in') {
              if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            } else if (access.reason === 'insufficient_credits') {
              if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                router.push("/pricing")
              }
            }
          }, 1000)
          return
        }
      }

      // 创建任务
      let taskResponse: CreateTaskResponse
      try {
        taskResponse = await createScanTask({
          url: url,
          options: optionsArray,
          language: locale,
          ai_mode: options.aiAnalysis ? aiMode : undefined,
        })

        // 创建任务成功后，跳转到任务详情页面
        // 这样可以防止刷新页面时重新创建任务
        const taskId = taskResponse.id
        console.log('[ScanPage] Task created, redirecting to task page:', taskId)
        
        // 重置扫描标记（因为要跳转页面）
        isScanningRef.current = false
        
        // 跳转到任务详情页面
        router.push(`/scan?taskId=${taskId}`)
        return // 不再继续执行后续逻辑
      } catch (err: any) {
        // 发生错误时重置扫描标记
        isScanningRef.current = false
        // 处理403错误（黑名单）
        if (err.status === 403) {
          let errorMessage = err.message || ""
          // 尝试从response中获取错误信息
          try {
            if (err.response && typeof err.response.json === 'function') {
              const errorResponse = await err.response.json()
              errorMessage = errorResponse.message || errorResponse.error || errorMessage
            }
          } catch (e) {
            // 忽略解析错误，使用已有的errorMessage
          }
          
          // 检查是否是黑名单错误
          if (errorMessage.includes("Website blacklisted") || errorMessage.includes("网站被拉黑")) {
            setError(t("errors.websiteBlacklisted") || "该网站已被拉黑，不允许进行检测。如有疑问，请联系客服。")
            setState("error")
            isScanningRef.current = false
            return
          }
          if (errorMessage.includes("User blacklisted") || errorMessage.includes("用户被拉黑")) {
            setError(t("errors.userBlacklisted") || "您的账户已被限制，无法执行检测任务。如有疑问，请联系客服。")
            setState("error")
            isScanningRef.current = false
            return
          }
        }
        // 处理429错误（请求过于频繁，通常是用户锁被占用）
        if (err.status === 429) {
          let errorMessage = err.message || ""
          // 尝试从response中获取错误信息
          try {
            if (err.response && typeof err.response.json === 'function') {
              const errorResponse = await err.response.json()
              errorMessage = errorResponse.message || errorResponse.error || errorMessage
            }
          } catch (e) {
            // 忽略解析错误，使用已有的errorMessage
          }
          
          // 如果是任务创建中的锁被占用，提示用户等待
          if (errorMessage.includes("请求过于频繁") || 
              errorMessage.includes("等待上一个任务") ||
              errorMessage.includes("任务正在创建") ||
              errorMessage.includes("Please wait") ||
              errorMessage.includes("previous task")) {
            setError(t("errors.taskCreating") || errorMessage || "任务正在创建中，请等待几秒钟后再试")
            setState("error")
            isScanningRef.current = false
            return
          }
          // 其他429错误（限流）
          setError(t("errors.tooManyRequests") || "请求过于频繁，请稍后再试")
          setState("error")
          isScanningRef.current = false
          return
        }
        // 处理409错误（重复任务）
        if (err.status === 409) {
          let errorData: any = {}
          try {
            if (err.response && typeof err.response.json === 'function') {
              errorData = await err.response.json()
            } else if (err.message) {
              const jsonMatch = err.message.match(/\{.*\}/)
              if (jsonMatch) {
                errorData = JSON.parse(jsonMatch[0])
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
          
          // 如果后端返回了已有任务的ID，自动跳转到该任务
          if (errorData.task_id) {
            console.log('[ScanPage] Duplicate task detected, redirecting to existing task:', errorData.task_id)
            router.push(`/scan?taskId=${errorData.task_id}`)
            return
          }
          
          // 如果没有task_id，显示错误信息
          setError(errorData.message || t("errors.duplicateTask") || "检测任务已存在，请稍后再试")
          setState("error")
          isScanningRef.current = false
          return
        }
        // 处理402 Credits Required错误
        if (err.status === 402 || (err.message && (err.message.includes("402") || err.message.includes("Payment required") || err.message.includes("Credits required")))) {
          let errorData: any = {}
          try {
            // 尝试从错误对象中获取响应数据
            if (err.response && typeof err.response.json === 'function') {
              errorData = await err.response.json()
            } else if (err.message) {
              // 如果错误消息包含JSON，尝试解析
              const jsonMatch = err.message.match(/\{.*\}/)
              if (jsonMatch) {
                errorData = JSON.parse(jsonMatch[0])
              }
            }
          } catch {
            // 解析失败，使用默认值
          }
          
          const feature = errorData.feature || "premium feature"
          const message = errorData.message || "Insufficient credits or free scans"
          
          setError(
            user 
              ? `${t("errors.paymentRequired")}: ${message}. ${t("errors.pleasePurchaseCredits")}`
              : `${t("errors.paymentRequired")}: ${message}. ${t("errors.pleaseLoginOrPurchase")}`
          )
          setState("error")
          
          // 如果用户未登录，提示登录
          if (!user) {
            setTimeout(() => {
              if (confirm(t("errors.loginToContinue"))) {
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            }, 1000)
          } else {
            // 如果用户已登录但余额不足，提示购买积分
            setTimeout(() => {
              if (confirm(t("errors.goToPricing"))) {
                router.push("/pricing")
              }
            }, 1000)
          }
          isScanningRef.current = false
          return
        }
        // 其他错误继续抛出
        isScanningRef.current = false
        throw err
      }

      // 注意：创建任务成功后应该已经跳转到任务详情页面
      // 以下代码不应该被执行（作为备用保留）
      console.warn('[ScanPage] Warning: Task created but redirect may have failed, starting polling as fallback')
      
      // 开始轮询任务状态（备用逻辑）
      const stopPolling = pollTaskStatus(
        taskResponse.id,
        (status: TaskStatusResponse) => {
          // 更新整体进度
          setProgress(status.progress)
          
          // 更新模块状态
          setModuleStatuses(status.modules)
          
          // 检查是否有模块完成，实时获取结果
          const completedModules = Object.values(status.modules).filter(
            (m: any) => m.status === "completed"
          )
          if (completedModules.length > 0 && state === "running") {
            // 异步获取部分结果（不阻塞轮询）
            getTaskResults(taskResponse.id).then((results) => {
              // 只更新已完成的模块结果，不覆盖未完成的
              if (results.website_info && !websiteInfo) {
                setWebsiteInfo(results.website_info)
              }
              if (results.domain_info && !domainInfo) {
                setDomainInfo(results.domain_info)
              }
              if (results.ssl_info && !sslInfo) {
                setSSLInfo(results.ssl_info)
              }
              if (results.tech_stack && !techStack) {
                setTechStack(results.tech_stack)
              }
              if (results.performance && !performance) {
                setPerformance(results.performance)
              }
              if (results.seo_compliance && !seoCompliance) {
                setSEOCompliance(results.seo_compliance)
              }
              if (results.security_risk && !securityRisk) {
                setSecurityRisk(results.security_risk)
              }
              if (results.accessibility && !accessibility) {
                setAccessibility(results.accessibility)
              }
              if (results.link_health && results.link_health.length > 0) {
                setResults(results.link_health)
              }
              // AI分析只在所有其他模块完成后显示
              if (results.ai_analysis && status.modules['ai-analysis']?.status === "completed") {
                let aiData = results.ai_analysis
                if (typeof aiData === 'string') {
                  try {
                    aiData = JSON.parse(aiData)
                  } catch (err) {
                    debugError("[ScanPage] Failed to parse AI analysis JSON:", err)
                  }
                }
                setAiAnalysis(aiData)
              }
            }).catch((err) => {
              debugError("[ScanPage] Error getting partial results:", err)
            })
          }
          
          // 更新任务状态
          if (status.status === "running") {
            setState("running")
          } else if (status.status === "completed") {
            setState("done")
            // 异步获取任务结果（不阻塞轮询）
            getTaskResults(taskResponse.id).then((results) => {
              // 处理结果数据（即使部分模块失败，也显示可用结果）
              if (results.link_health) {
                setResults(results.link_health)
              }
              if (results.website_info) {
                setWebsiteInfo(results.website_info)
              }
              if (results.domain_info) {
                setDomainInfo(results.domain_info)
              }
              if (results.ssl_info) {
                setSSLInfo(results.ssl_info)
              }
              if (results.tech_stack) {
                setTechStack(results.tech_stack)
              }
              if (results.performance) {
                setPerformance(results.performance)
              }
              if (results.seo_compliance) {
                setSEOCompliance(results.seo_compliance)
              }
              if (results.security_risk) {
                setSecurityRisk(results.security_risk)
              }
              if (results.accessibility) {
                setAccessibility(results.accessibility)
              }
              if (results.ai_analysis) {
                // 确保 AI 分析数据是对象格式
                let aiData = results.ai_analysis
                // 如果是字符串，尝试解析
                if (typeof aiData === 'string') {
                  try {
                    aiData = JSON.parse(aiData)
                  } catch (err) {
                    debugError("[ScanPage] Failed to parse AI analysis JSON:", err)
                  }
                }
                setAiAnalysis(aiData)
              }
              
              // 检查是否有模块失败，显示降级提示
              const failedModules = Object.values(status.modules).filter(
                (m: any) => m.status === "failed"
              )
              if (failedModules.length > 0) {
                // 不设置全局错误，允许显示部分结果
              }
              
              // 计算扫描时长
              const now = Date.now()
              const startTime = scanStartTimeRef.current
              const duration = startTime > 0 ? Math.round((now - startTime) / 1000) : 0
              setScanDuration(Math.max(0, duration))
            }).catch((err) => {
              debugError("[ScanPage] Error getting task results:", err)
              // 即使获取结果失败，也尝试显示部分结果（如果有）
              setError(t("errors.scanFailed"))
            })
            // 停止轮询
            if (stopPollingRef.current) {
              stopPollingRef.current()
              stopPollingRef.current = null
            }
            // 重置扫描标记
            isScanningRef.current = false
            return 0 // 停止轮询
          } else if (status.status === "failed") {
            // 检查是否有部分结果可用
            const hasPartialResults = Object.values(status.modules).some(
              (m: any) => m.status === "completed"
            )
            
            if (hasPartialResults) {
              // 有部分结果，标记为完成但显示警告
              setState("done")
              setError(status.error || t("errors.scanFailed") + " (部分结果可用)")
              // 异步获取部分结果
              getTaskResults(taskResponse.id).then((results) => {
                // 处理可用结果...
                if (results.link_health) {
                  setResults(results.link_health)
                }
                if (results.website_info) setWebsiteInfo(results.website_info)
                if (results.domain_info) setDomainInfo(results.domain_info)
                if (results.ssl_info) setSSLInfo(results.ssl_info)
                if (results.tech_stack) setTechStack(results.tech_stack)
                if (results.performance) setPerformance(results.performance)
                if (results.seo_compliance) setSEOCompliance(results.seo_compliance)
                if (results.security_risk) setSecurityRisk(results.security_risk)
                if (results.accessibility) setAccessibility(results.accessibility)
                if (results.ai_analysis) {
                  // 确保 AI 分析数据是对象格式
                  let aiData = results.ai_analysis
                  if (typeof aiData === 'string') {
                    try {
                      aiData = JSON.parse(aiData)
                    } catch (err) {
                      debugError("[ScanPage] Failed to parse AI analysis JSON:", err)
                    }
                  }
                  setAiAnalysis(aiData)
                }
              }).catch((err) => {
                debugError("[ScanPage] Error getting partial results:", err)
              })
            } else {
              // 完全失败
              setState("error")
              setError(status.error || t("errors.scanFailed"))
            }
            // 停止轮询
            if (stopPollingRef.current) {
              stopPollingRef.current()
              stopPollingRef.current = null
            }
            // 重置扫描标记
            isScanningRef.current = false
            return 0 // 停止轮询
          }
          
          // 返回当前轮询间隔（由上面的逻辑决定）
          // 如果没有明确返回，使用默认值
        },
        1000 // 初始间隔
      )
      
      stopPollingRef.current = stopPolling
    } catch (err: any) {
      // 发生未捕获的错误时重置扫描标记
      isScanningRef.current = false
      debugError("[ScanPage] Error creating task:", err)
      setError(err.message || t("errors.connectionFailed"))
      setState("error")
    }

    // 清理函数：组件卸载时停止轮询
    return () => {
      if (stopPollingRef.current) {
        stopPollingRef.current()
        stopPollingRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, options, aiMode, locale, t, router, user, featureAccess, checkFeatureAccess])

  // 加载用户信息和功能定价
  useEffect(() => {
    const loadUserInfo = async () => {
      setLoadingUserInfo(true)
      try {
        // 并行加载功能定价（公开接口，不需要登录）
        const [pricingData, creditsData, subscriptionData, usageData] = await Promise.all([
          getFeaturePricing().catch((err) => {
            debugError("[ScanPage] Failed to load feature pricing:", err)
            return []
          }),
          user ? getCreditsBalance().catch((err) => {
            debugError("[ScanPage] Failed to load credits:", err)
            return null
          }) : Promise.resolve(null),
          user ? getUserSubscription().catch((err) => {
            debugError("[ScanPage] Failed to load subscription:", err)
            return null
          }) : Promise.resolve(null),
          user ? getMonthlyUsage().catch((err) => {
            debugError("[ScanPage] Failed to load monthly usage:", err)
            return null
          }) : Promise.resolve(null),
        ])

        // 将功能定价转换为对象，方便查找
        const pricingMap: Record<string, FeaturePricing> = {}
        pricingData.forEach((pricing) => {
          pricingMap[pricing.feature_code] = pricing
        })
        setFeaturePricing(pricingMap)

        setCredits(creditsData)
        setSubscription(subscriptionData)
        setMonthlyUsage(usageData)

        // 检查付费功能的访问权限（无论是否登录都要检查）
        const premiumFeatures = ['ai-analysis', 'performance', 'seo', 'security', 'accessibility']
        const accessResults = await checkMultipleFeatures(premiumFeatures).catch((err) => {
          debugError("[ScanPage] Failed to check feature access:", err)
          // 如果检查失败，默认设置为不可访问（安全起见）
          const defaultResults: Record<string, FeatureAccessResult> = {}
          premiumFeatures.forEach(feature => {
            defaultResults[feature] = {
              canAccess: false,
              reason: user ? 'insufficient_credits' : 'not_logged_in',
              message: user ? 'Failed to verify access' : 'Login required'
            }
          })
          return defaultResults
        })
        setFeatureAccess(accessResults)
      } catch (error) {
        debugError("[ScanPage] Error loading user info:", error)
      } finally {
        setLoadingUserInfo(false)
      }
    }

    loadUserInfo()
  }, [user])

  // 组件卸载时清理轮询和防抖定时器
  useEffect(() => {
    return () => {
      if (stopPollingRef.current) {
        stopPollingRef.current()
        stopPollingRef.current = null
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [])

  // 加载已有任务详情（当URL中有taskId参数时）
  useEffect(() => {
    const loadExistingTask = async () => {
      if (!taskIdFromUrl || taskId) {
        // 如果URL中没有taskId，或者已经加载过任务，不重复加载
        return
      }

      try {
        console.log('[ScanPage] Loading existing task:', taskIdFromUrl)
        setState("running") // 显示加载状态
        setTaskId(taskIdFromUrl)

        // 获取任务状态
        const status = await getTaskStatus(taskIdFromUrl)
        console.log('[ScanPage] Task status:', status)

        // 设置任务URL（从任务状态中获取）
        if (status.target_url) {
          setDisplayUrl(status.target_url)
        }

        // 更新模块状态
        if (status.modules) {
          setModuleStatuses(status.modules)
        }

        // 更新进度
        setProgress(status.progress)

        // 根据任务状态设置页面状态
        if (status.status === "completed") {
          setState("done")
          // 加载任务结果
          try {
            const taskResults = await getTaskResults(taskIdFromUrl)
            console.log('[ScanPage] Task results loaded:', taskResults)
            
            // 处理结果数据
            if (taskResults.link_health) {
              setResults(taskResults.link_health)
            }
            if (taskResults.website_info) {
              setWebsiteInfo(taskResults.website_info)
            }
            if (taskResults.domain_info) {
              setDomainInfo(taskResults.domain_info)
            }
            if (taskResults.ssl_info) {
              setSSLInfo(taskResults.ssl_info)
            }
            if (taskResults.tech_stack) {
              setTechStack(taskResults.tech_stack)
            }
            if (taskResults.performance) {
              setPerformance(taskResults.performance)
            }
            if (taskResults.seo_compliance) {
              setSEOCompliance(taskResults.seo_compliance)
            }
            if (taskResults.security_risk) {
              setSecurityRisk(taskResults.security_risk)
            }
            if (taskResults.accessibility) {
              setAccessibility(taskResults.accessibility)
            }
            if (taskResults.ai_analysis) {
              let aiData = taskResults.ai_analysis
              if (typeof aiData === 'string') {
                try {
                  aiData = JSON.parse(aiData)
                } catch (err) {
                  debugError("[ScanPage] Failed to parse AI analysis JSON:", err)
                }
              }
              setAiAnalysis(aiData)
            }
          } catch (err: any) {
            debugError("[ScanPage] Failed to load task results:", err)
            setError(err.message || "加载任务结果失败")
            setState("error")
          }
        } else if (status.status === "running" || status.status === "pending") {
          setState("running")
          // 开始轮询任务状态
          const stopPolling = pollTaskStatus(
            taskIdFromUrl,
            (status: TaskStatusResponse) => {
              setProgress(status.progress)
              if (status.modules) {
                setModuleStatuses(status.modules)
              }
              if (status.target_url) {
                setDisplayUrl(status.target_url)
              }
              
              if (status.status === "completed") {
                setState("done")
                // 加载任务结果
                getTaskResults(taskIdFromUrl).then((results) => {
                  if (results.link_health) setResults(results.link_health)
                  if (results.website_info) setWebsiteInfo(results.website_info)
                  if (results.domain_info) setDomainInfo(results.domain_info)
                  if (results.ssl_info) setSSLInfo(results.ssl_info)
                  if (results.tech_stack) setTechStack(results.tech_stack)
                  if (results.performance) setPerformance(results.performance)
                  if (results.seo_compliance) setSEOCompliance(results.seo_compliance)
                  if (results.security_risk) setSecurityRisk(results.security_risk)
                  if (results.accessibility) setAccessibility(results.accessibility)
                  if (results.ai_analysis) {
                    let aiData = results.ai_analysis
                    if (typeof aiData === 'string') {
                      try {
                        aiData = JSON.parse(aiData)
                      } catch (err) {
                        debugError("[ScanPage] Failed to parse AI analysis JSON:", err)
                      }
                    }
                    setAiAnalysis(aiData)
                  }
                }).catch((err) => {
                  debugError("[ScanPage] Failed to load task results:", err)
                })
                return 0 // 停止轮询
              } else if (status.status === "failed") {
                setState("error")
                setError(status.error || "任务执行失败")
                return 0 // 停止轮询
              }
            }
          )
          stopPollingRef.current = stopPolling
        } else if (status.status === "failed") {
          setState("error")
          setError(status.error || "任务执行失败")
        }
      } catch (err: any) {
        debugError("[ScanPage] Failed to load task:", err)
        setError(err.message || "加载任务失败")
        setState("error")
      }
    }

    loadExistingTask()
  }, [taskIdFromUrl, taskId])

  // 初始化时自动开始扫描（如果url存在且状态为idle且没有打开选项面板）
  useEffect(() => {
    // 如果有taskId，不执行自动扫描逻辑
    if (taskIdFromUrl) {
      return
    }

    if (!url) {
      router.push("/")
      return
    }

    // 只有在idle状态、没有结果、且选项面板未打开时才自动开始
    if (state === "idle" && results.length === 0 && !showOptions) {
      startScan()
    }
  }, [url, taskIdFromUrl, showOptions, state, results.length, startScan, router])

  const getStatusMessage = () => {
    switch (state) {
      case "idle":
        return t("scan.statusIdle")
      case "running":
        if (progress.total === 0) {
          return t("scan.statusRunningParsing")
        }
        if (results.length === 0) {
          return t("scan.statusRunningDetecting")
        }
        return t("scan.statusRunning", { current: progress.current, total: progress.total })
      case "done":
        return t("scan.statusDone", { seconds: scanDuration })
      case "error":
        return t("scan.statusError", { error })
      default:
        return ""
    }
  }

  return (
    <>
      {/* Floating background elements */}
      <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
      <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between mb-3 text-tech-cyan/80 text-[10px] font-mono tracking-widest">
            <span>SCAN_SESSION_ACTIVE</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {state === "running" ? t("scan.realTimeDataStream") : state === "done" ? t("scan.scanComplete") : t("scan.waiting")}
            </span>
          </div>

          <div className="relative group">
            {/* Outer Glow Border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
              
              {/* Decorative Corner Markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

              {/* Scanning Overlay Line */}
              <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-20 ${state === "running" ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                <div className="w-full h-[2px] bg-tech-cyan/80 shadow-[0_0_15px_#00f0ff] animate-scan"></div>
              </div>

              {/* Pulsing Corner Glow */}
              {state === "running" && (
                <>
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan animate-pulse-glow pointer-events-none z-30"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan animate-pulse-glow pointer-events-none z-30"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan animate-pulse-glow pointer-events-none z-30"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan animate-pulse-glow pointer-events-none z-30"></div>
                </>
              )}

              {/* Inner Content */}
              <div className="p-8 md:p-14 relative overflow-hidden z-10">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black mb-2 text-white">
                      {t("scan.targetUrl")}: <span className="text-tech-cyan font-mono text-lg drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">{displayUrl || url || (taskIdFromUrl ? t("scan.loadingTask") || "加载中..." : "")}</span>
                    </h1>
                    <p className="text-tech-cyan font-mono text-sm font-bold">{getStatusMessage()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {state === "idle" && (
                      <button
                        onClick={() => setShowOptions(!showOptions)}
                        className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all group overflow-hidden shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          {showOptions ? t("urlInput.hideOptions") : t("scan.scanOptions")}
                          <svg className={`w-3 h-3 transition-transform ${showOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                        <div className="absolute inset-0 bg-tech-cyan/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                      </button>
                    )}
                    <button
                      onClick={() => router.push("/")}
                      className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-5 py-2 transition-all group overflow-hidden shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {t("urlInput.backToHome")}
                        <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                      <div className="absolute inset-0 bg-tech-cyan/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                  </div>
                </div>

                {/* Scan Options Panel */}
                {showOptions && state === "idle" && (
                  <div className="mb-6 p-6 bg-tech-surface/50 border border-tech-border/30 rounded-lg backdrop-blur-sm animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                        <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{t("urlInput.scanOptions")}</h3>
                      </div>
                      {/* 用户余额信息 */}
                      {user && credits && (
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-tech-surface/60 border border-tech-border/30 rounded">
                            <span className="text-tech-cyan/70">积分:</span>
                            <span className="text-tech-cyan font-bold">{credits.credits}</span>
                          </div>
                          {subscription && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-tech-surface/60 border border-tech-border/30 rounded">
                              <span className="text-tech-cyan/70">订阅:</span>
                              <span className="text-tech-cyan font-bold">{subscription.plan_type}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <ScanOptionToggle
                        id="link-health"
                        label={t("scan.optionLinkHealth")}
                        description="MODULE: LINK HEALTH"
                        checked={options.linkHealthCheck}
                        onChange={(checked: boolean) => {
                          setOptions((prev: ScanOptions) => {
                            const newOptions = { ...prev, linkHealthCheck: checked }
                            // 如果启用页面链接检查，自动禁用全站链接检查
                            if (checked && prev.deepScan) {
                              newOptions.deepScan = false
                            }
                            return newOptions
                          })
                        }}
                        disabled={state !== "idle"}
                        isFree={true}
                      />
                      <ScanOptionToggle
                        id="website-info"
                        label={t("scan.optionWebsiteInfo")}
                        description="MODULE: WEBSITE INFO"
                        checked={options.websiteInfo}
                        onChange={(checked: boolean) => setOptions((prev: ScanOptions) => ({ ...prev, websiteInfo: checked }))}
                        disabled={state !== "idle"}
                        isFree={true}
                      />
                      <ScanOptionToggle
                        id="ssl-info"
                        label={t("scan.optionSSLInfo")}
                        description="MODULE: SSL CERT"
                        checked={options.sslInfo}
                        onChange={(checked: boolean) => setOptions((prev: ScanOptions) => ({ ...prev, sslInfo: checked }))}
                        disabled={state !== "idle"}
                        isFree={true}
                      />
                      <ScanOptionToggle
                        id="domain-info"
                        label={t("scan.optionDomainInfo")}
                        description="MODULE: DOMAIN INFO"
                        checked={options.domainInfo}
                        onChange={(checked: boolean) => setOptions((prev: ScanOptions) => ({ ...prev, domainInfo: checked }))}
                        disabled={state !== "idle"}
                        isFree={true}
                      />
                      <ScanOptionToggle
                        id="tech-stack"
                        label={t("scan.optionTechStack")}
                        description="MODULE: TECH STACK"
                        checked={options.techStack}
                        onChange={(checked: boolean) => setOptions((prev: ScanOptions) => ({ ...prev, techStack: checked }))}
                        disabled={state !== "idle"}
                        isFree={true}
                      />
                      <ScanOptionToggle
                        id="ai-analysis"
                        label={t("scan.optionAIAnalysis")}
                        description="MODULE: AI ANALYSIS"
                        checked={options.aiAnalysis}
                        onChange={async (checked: boolean) => {
                          // 如果尝试开启付费功能，先检查访问权限
                          if (checked) {
                            let access = featureAccess['ai-analysis']
                            
                            // 如果访问状态不存在或不可访问，重新检查
                            if (!access || access.canAccess === false || access.canAccess === undefined) {
                              // 重新检查访问权限
                              access = await checkFeatureAccess('ai-analysis')
                              // 更新访问状态
                              setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'ai-analysis': access }))
                            }
                            
                            // 如果仍然不可访问，触发引导逻辑
                            if (!access.canAccess) {
                              if (access.reason === 'not_logged_in') {
                                if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                                  router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                }
                                return // 不允许开启
                              } else if (access.reason === 'insufficient_credits') {
                                if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                                  router.push("/pricing")
                                }
                                return // 不允许开启
                              } else {
                                // 其他原因，也不允许开启
                                return
                              }
                            }
                          }
                          // 允许切换（关闭或已通过检查的开启）
                          setOptions((prev: ScanOptions) => ({ ...prev, aiAnalysis: checked }))
                        }}
                        disabled={state !== "idle"}
                        creditsCost={featurePricing['ai-analysis']?.credits_cost}
                        isPremium={true}
                        accessDenied={!featureAccess['ai-analysis']?.canAccess || featureAccess['ai-analysis'] === undefined}
                        accessDeniedReason={
                          !featureAccess['ai-analysis'] || featureAccess['ai-analysis']?.canAccess === false
                            ? (featureAccess['ai-analysis']?.reason === 'not_logged_in' ? 'not_logged_in' : featureAccess['ai-analysis']?.reason === 'insufficient_credits' ? 'insufficient_credits' : (!user ? 'not_logged_in' : 'insufficient_credits'))
                            : undefined
                        }
                        onDisabledClick={async () => {
                          let access = featureAccess['ai-analysis']
                          // 如果访问状态不存在，重新检查
                          if (!access) {
                            access = await checkFeatureAccess('ai-analysis')
                            setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'ai-analysis': access }))
                          }
                          
                          if (access.reason === 'not_logged_in' || (!user && !access.canAccess)) {
                            if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                              router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                            }
                          } else if (access.reason === 'insufficient_credits') {
                            if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                              router.push("/pricing")
                            }
                          }
                        }}
                      />
                      <ScanOptionToggle
                        id="performance"
                        label={t("scan.optionPerformance")}
                        description="LIGHTHOUSE: PERFORMANCE"
                        checked={options.performance}
                        onChange={async (checked: boolean) => {
                          // 如果尝试开启付费功能，先检查访问权限
                          if (checked) {
                            let access = featureAccess['performance']
                            
                            // 如果访问状态不存在或不可访问，重新检查
                            if (!access || access.canAccess === false || access.canAccess === undefined) {
                              // 重新检查访问权限
                              access = await checkFeatureAccess('performance')
                              // 更新访问状态
                              setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'performance': access }))
                            }
                            
                            // 如果仍然不可访问，触发引导逻辑
                            if (!access.canAccess) {
                              if (access.reason === 'not_logged_in') {
                                if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                                  router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                }
                                return // 不允许开启
                              } else if (access.reason === 'insufficient_credits') {
                                if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                                  router.push("/pricing")
                                }
                                return // 不允许开启
                              } else {
                                // 其他原因，也不允许开启
                                return
                              }
                            }
                          }
                          // 允许切换（关闭或已通过检查的开启）
                          setOptions((prev: ScanOptions) => ({ ...prev, performance: checked }))
                        }}
                        disabled={state !== "idle"}
                        creditsCost={featurePricing['performance']?.credits_cost}
                        isPremium={true}
                        accessDenied={!featureAccess['performance']?.canAccess || featureAccess['performance'] === undefined}
                        accessDeniedReason={
                          !featureAccess['performance'] || featureAccess['performance']?.canAccess === false
                            ? (featureAccess['performance']?.reason === 'not_logged_in' ? 'not_logged_in' : featureAccess['performance']?.reason === 'insufficient_credits' ? 'insufficient_credits' : (!user ? 'not_logged_in' : 'insufficient_credits'))
                            : undefined
                        }
                        onDisabledClick={async () => {
                          let access = featureAccess['performance']
                          // 如果访问状态不存在，重新检查
                          if (!access) {
                            access = await checkFeatureAccess('performance')
                            setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'performance': access }))
                          }
                          
                          if (access.reason === 'not_logged_in' || (!user && !access.canAccess)) {
                            if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                              router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                            }
                          } else if (access.reason === 'insufficient_credits') {
                            if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                              router.push("/pricing")
                            }
                          }
                        }}
                      />
                      <ScanOptionToggle
                        id="seo"
                        label={t("scan.optionSEO")}
                        description="LIGHTHOUSE: SEO"
                        checked={options.seo}
                        onChange={async (checked: boolean) => {
                          // 如果尝试开启付费功能，先检查访问权限
                          if (checked) {
                            let access = featureAccess['seo']
                            
                            // 如果访问状态不存在或不可访问，重新检查
                            if (!access || access.canAccess === false || access.canAccess === undefined) {
                              // 重新检查访问权限
                              access = await checkFeatureAccess('seo')
                              // 更新访问状态
                              setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'seo': access }))
                            }
                            
                            // 如果仍然不可访问，触发引导逻辑
                            if (!access.canAccess) {
                              if (access.reason === 'not_logged_in') {
                                if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                                  router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                }
                                return // 不允许开启
                              } else if (access.reason === 'insufficient_credits') {
                                if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                                  router.push("/pricing")
                                }
                                return // 不允许开启
                              } else {
                                // 其他原因，也不允许开启
                                return
                              }
                            }
                          }
                          // 允许切换（关闭或已通过检查的开启）
                          setOptions((prev: ScanOptions) => ({ ...prev, seo: checked }))
                        }}
                        disabled={state !== "idle"}
                        creditsCost={featurePricing['seo']?.credits_cost}
                        isPremium={true}
                        accessDenied={!featureAccess['seo']?.canAccess || featureAccess['seo'] === undefined}
                        accessDeniedReason={
                          !featureAccess['seo'] || featureAccess['seo']?.canAccess === false
                            ? (featureAccess['seo']?.reason === 'not_logged_in' ? 'not_logged_in' : featureAccess['seo']?.reason === 'insufficient_credits' ? 'insufficient_credits' : (!user ? 'not_logged_in' : 'insufficient_credits'))
                            : undefined
                        }
                        onDisabledClick={async () => {
                          let access = featureAccess['seo']
                          // 如果访问状态不存在，重新检查
                          if (!access) {
                            access = await checkFeatureAccess('seo')
                            setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'seo': access }))
                          }
                          
                          if (access.reason === 'not_logged_in' || (!user && !access.canAccess)) {
                            if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                              router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                            }
                          } else if (access.reason === 'insufficient_credits') {
                            if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                              router.push("/pricing")
                            }
                          }
                        }}
                      />
                      <ScanOptionToggle
                        id="security"
                        label={t("scan.optionSecurity")}
                        description="LIGHTHOUSE: SECURITY"
                        checked={options.security}
                        onChange={async (checked: boolean) => {
                          // 如果尝试开启付费功能，先检查访问权限
                          if (checked) {
                            let access = featureAccess['security']
                            
                            // 如果访问状态不存在或不可访问，重新检查
                            if (!access || access.canAccess === false || access.canAccess === undefined) {
                              // 重新检查访问权限
                              access = await checkFeatureAccess('security')
                              // 更新访问状态
                              setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'security': access }))
                            }
                            
                            // 如果仍然不可访问，触发引导逻辑
                            if (!access.canAccess) {
                              if (access.reason === 'not_logged_in') {
                                if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                                  router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                }
                                return // 不允许开启
                              } else if (access.reason === 'insufficient_credits') {
                                if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                                  router.push("/pricing")
                                }
                                return // 不允许开启
                              } else {
                                // 其他原因，也不允许开启
                                return
                              }
                            }
                          }
                          // 允许切换（关闭或已通过检查的开启）
                          setOptions((prev: ScanOptions) => ({ ...prev, security: checked }))
                        }}
                        disabled={state !== "idle"}
                        creditsCost={featurePricing['security']?.credits_cost}
                        isPremium={true}
                        accessDenied={!featureAccess['security']?.canAccess || featureAccess['security'] === undefined}
                        accessDeniedReason={
                          !featureAccess['security'] || featureAccess['security']?.canAccess === false
                            ? (featureAccess['security']?.reason === 'not_logged_in' ? 'not_logged_in' : featureAccess['security']?.reason === 'insufficient_credits' ? 'insufficient_credits' : (!user ? 'not_logged_in' : 'insufficient_credits'))
                            : undefined
                        }
                        onDisabledClick={async () => {
                          let access = featureAccess['security']
                          // 如果访问状态不存在，重新检查
                          if (!access) {
                            access = await checkFeatureAccess('security')
                            setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'security': access }))
                          }
                          
                          if (access.reason === 'not_logged_in' || (!user && !access.canAccess)) {
                            if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                              router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                            }
                          } else if (access.reason === 'insufficient_credits') {
                            if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                              router.push("/pricing")
                            }
                          }
                        }}
                      />
                      <ScanOptionToggle
                        id="accessibility"
                        label={t("scan.optionAccessibility")}
                        description="LIGHTHOUSE: A11Y"
                        checked={options.accessibility}
                        onChange={async (checked: boolean) => {
                          // 如果尝试开启付费功能，先检查访问权限
                          if (checked) {
                            let access = featureAccess['accessibility']
                            
                            // 如果访问状态不存在或不可访问，重新检查
                            if (!access || access.canAccess === false || access.canAccess === undefined) {
                              // 重新检查访问权限
                              access = await checkFeatureAccess('accessibility')
                              // 更新访问状态
                              setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'accessibility': access }))
                            }
                            
                            // 如果仍然不可访问，触发引导逻辑
                            if (!access.canAccess) {
                              if (access.reason === 'not_logged_in') {
                                if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                                  router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                }
                                return // 不允许开启
                              } else if (access.reason === 'insufficient_credits') {
                                if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                                  router.push("/pricing")
                                }
                                return // 不允许开启
                              } else {
                                // 其他原因，也不允许开启
                                return
                              }
                            }
                          }
                          // 允许切换（关闭或已通过检查的开启）
                          setOptions((prev: ScanOptions) => ({ ...prev, accessibility: checked }))
                        }}
                        disabled={state !== "idle"}
                        creditsCost={featurePricing['accessibility']?.credits_cost}
                        isPremium={true}
                        accessDenied={!featureAccess['accessibility']?.canAccess || featureAccess['accessibility'] === undefined}
                        accessDeniedReason={
                          !featureAccess['accessibility'] || featureAccess['accessibility']?.canAccess === false
                            ? (featureAccess['accessibility']?.reason === 'not_logged_in' ? 'not_logged_in' : featureAccess['accessibility']?.reason === 'insufficient_credits' ? 'insufficient_credits' : (!user ? 'not_logged_in' : 'insufficient_credits'))
                            : undefined
                        }
                        onDisabledClick={async () => {
                          let access = featureAccess['accessibility']
                          // 如果访问状态不存在，重新检查
                          if (!access) {
                            access = await checkFeatureAccess('accessibility')
                            setFeatureAccess((prev: Record<string, FeatureAccessResult>) => ({ ...prev, 'accessibility': access }))
                          }
                          
                          if (access.reason === 'not_logged_in' || (!user && !access.canAccess)) {
                            if (confirm(t("scan.loginToUseFeature") || "Login to use this feature?")) {
                              router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                            }
                          } else if (access.reason === 'insufficient_credits') {
                            if (confirm(t("scan.goToPricing") || "Go to pricing page to purchase credits?")) {
                              router.push("/pricing")
                            }
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-tech-border/20">
                      <button
                        onClick={() => {
                          setOptions({
                            linkHealthCheck: true,
                            websiteInfo: false,
                            domainInfo: false,
                            sslInfo: false,
                            techStack: false,
                            aiAnalysis: false,
                            performance: false,
                            seo: false,
                            security: false,
                            accessibility: false,
                            deepScan: false,
                          })
                        }}
                        className="px-4 py-2 font-mono text-xs text-tech-cyan/70 hover:text-tech-cyan border border-transparent hover:border-tech-border/30 hover:bg-tech-cyan/5 rounded transition-all"
                      >
                        {t("urlInput.resetDefault")}
                      </button>
                      <button
                        onClick={startScan}
                        disabled={(!options.linkHealthCheck && !options.websiteInfo && !options.domainInfo && !options.sslInfo && !options.techStack && !options.aiAnalysis && !options.performance && !options.seo && !options.security && !options.accessibility) || (state as ScanState) === "running" || isScanningRef.current}
                        className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-tech-cyan"
                      >
                        {((state as ScanState) === "running" || isScanningRef.current) ? t("scan.statusRunning") || "扫描中..." : t("urlInput.startScan")}
                      </button>
                    </div>
                  </div>
                )}

                {state === "running" && (
                  <>
                    <ProgressBar progress={progress} />
                    {Object.keys(moduleStatuses).length > 0 && (
                      <Suspense fallback={<LoadingPlaceholder />}>
                        <ModuleStatus modules={moduleStatuses} />
                      </Suspense>
                    )}
                  </>
                )}

                {/* Scanning Animation Effects */}
                {state === "running" && (
                  <div className="relative mb-6 py-8">
                    <div className="flex flex-col items-center justify-center gap-6">
                      {/* Scanning Radar Effect */}
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        {/* Outer circle */}
                        <div className="absolute inset-0 border-2 border-tech-cyan/30 rounded-full" style={{
                          animation: 'scan-radar 4s linear infinite',
                          transformOrigin: 'center'
                        }}></div>
                        {/* Middle circle */}
                        <div className="absolute inset-[20%] border-2 border-tech-cyan/40 rounded-full" style={{
                          animation: 'scan-radar 3s linear infinite',
                          animationDelay: '-1s',
                          transformOrigin: 'center'
                        }}></div>
                        {/* Inner circle */}
                        <div className="absolute inset-[40%] border-2 border-tech-cyan/50 rounded-full" style={{
                          animation: 'scan-radar 2s linear infinite',
                          animationDelay: '-1.5s',
                          transformOrigin: 'center'
                        }}></div>
                        {/* Center dot */}
                        <div className="absolute w-3 h-3 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse z-10"></div>
                        {/* Scanning line indicator */}
                        <div className="absolute top-0 left-1/2 w-[2px] h-1/2 bg-gradient-to-b from-tech-cyan via-tech-cyan/60 to-transparent origin-bottom" style={{
                          animation: 'scan-radar 4s linear infinite',
                          transformOrigin: 'bottom center'
                        }}></div>
                      </div>
                      
                      {/* Data Stream Lines */}
                      <div className="relative w-full max-w-2xl h-24 overflow-hidden rounded-lg bg-tech-surface/50 border border-tech-border/40 backdrop-blur-sm">
                        <div className="absolute inset-0 flex flex-col justify-center gap-2.5 p-4">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="relative h-1 bg-tech-cyan/10 rounded-full overflow-hidden">
                              <div 
                                className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-transparent via-tech-cyan to-transparent"
                                style={{
                                  animation: `data-stream 2.5s linear infinite`,
                                  animationDelay: `${i * 0.3}s`
                                }}
                              ></div>
                            </div>
                          ))}
                        </div>
                        {/* Grid overlay */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(0, 240, 255, 0.2) 19px, rgba(0, 240, 255, 0.2) 20px)`
                        }}></div>
                      </div>

                      {/* Scanning Status Dots */}
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-tech-cyan font-mono text-sm font-bold tracking-wider">{t("scan.scanning")}</span>
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-tech-cyan rounded-full shadow-neon-cyan" style={{
                            animation: 'scan-dots 1.5s ease-in-out infinite'
                          }}></div>
                          <div className="w-2 h-2 bg-tech-cyan rounded-full shadow-neon-cyan" style={{
                            animation: 'scan-dots 1.5s ease-in-out infinite',
                            animationDelay: '0.2s'
                          }}></div>
                          <div className="w-2 h-2 bg-tech-cyan rounded-full shadow-neon-cyan" style={{
                            animation: 'scan-dots 1.5s ease-in-out infinite',
                            animationDelay: '0.4s'
                          }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm mb-6 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                    <span className="text-red-400 mr-2">⚠</span> {error}
                  </div>
                )}

                {/* Website Info - 单独一行显示（内容较多） */}
                {websiteInfo && (
                  <div className="mt-6 animate-fade-in">
                    <Suspense fallback={<LoadingPlaceholder />}>
                      <InfoCard title={t("scan.cardWebsiteInfo")} icon="🌐">
                        <InfoItem label={t("scan.labelTitle")} value={websiteInfo.title} highlight />
                        <InfoItem label={t("scan.labelDescription")} value={websiteInfo.description} />
                        <InfoItem label={t("scan.labelKeywords")} value={websiteInfo.keywords} />
                        <InfoItem label={t("scan.labelLanguage")} value={websiteInfo.language} />
                        <InfoItem label={t("scan.labelCharset")} value={websiteInfo.charset} />
                        <InfoItem label={t("scan.labelAuthor")} value={websiteInfo.author} />
                        <InfoItem label={t("scan.labelGenerator")} value={websiteInfo.generator} />
                        <InfoItem label={t("scan.labelViewport")} value={websiteInfo.viewport} />
                        <InfoItem label={t("scan.labelRobots")} value={websiteInfo.robots} />
                      </InfoCard>
                    </Suspense>
                  </div>
                )}

                {/* Domain Info, SSL Info, Tech Stack - Show when available */}
                {(domainInfo || sslInfo || techStack) && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-fade-in">
                    {sslInfo && (
                      <Suspense fallback={<LoadingPlaceholder />}>
                        <InfoCard title={t("scan.cardSSLInfo")} icon="🔒">
                        <InfoItem label={t("scan.labelIssuer")} value={sslInfo.issuer} highlight />
                        <InfoItem label={t("scan.labelSubject")} value={sslInfo.subject} />
                        <InfoItem label={t("scan.labelCommonName")} value={sslInfo.common_name} />
                        <InfoItem label={t("scan.labelValidFrom")} value={sslInfo.valid_from} />
                        <InfoItem label={t("scan.labelValidTo")} value={sslInfo.valid_to} />
                        <InfoItem 
                          label={t("scan.labelCertStatus")} 
                          value={sslInfo.is_valid ? t("scan.labelValid") : t("scan.labelInvalid")} 
                          highlight={sslInfo.is_valid}
                        />
                        <InfoItem 
                          label={t("scan.labelDaysRemaining")} 
                          value={sslInfo.days_remaining !== undefined ? `${sslInfo.days_remaining} ${t("scan.labelDays")}` : undefined}
                          highlight={sslInfo.days_remaining !== undefined && sslInfo.days_remaining > 30}
                        />
                        <InfoItem label={t("scan.labelSignatureAlg")} value={sslInfo.signature_alg} />
                        <InfoItem label={t("scan.labelPublicKeyAlg")} value={sslInfo.public_key_alg} />
                        <InfoItem label={t("scan.labelKeySize")} value={sslInfo.key_size ? `${sslInfo.key_size} ${t("scan.labelBits")}` : undefined} />
                        <InfoItem label={t("scan.labelSerialNumber")} value={sslInfo.serial_number} />
                        <InfoItem label={t("scan.labelOrganization")} value={sslInfo.organization} />
                        <InfoItem label={t("scan.labelOrgUnit")} value={sslInfo.organization_unit} />
                        {sslInfo.dns_names && sslInfo.dns_names.length > 0 && (
                          <InfoItem label={t("scan.labelDNSNames")} value={sslInfo.dns_names} />
                        )}
                        {sslInfo.country && (
                          <InfoItem label={t("scan.labelCountry")} value={sslInfo.country} />
                        )}
                        {sslInfo.locality && (
                          <InfoItem label={t("scan.labelLocality")} value={sslInfo.locality} />
                        )}
                        {sslInfo.province && (
                          <InfoItem label={t("scan.labelProvince")} value={sslInfo.province} />
                        )}
                      </InfoCard>
                      </Suspense>
                    )}

                    {domainInfo && (
                      <Suspense fallback={<LoadingPlaceholder />}>
                        <InfoCard title={t("scan.cardDomainInfo")} icon="🌍">
                        <InfoItem label={t("scan.labelDomain")} value={domainInfo.domain} highlight />
                        <InfoItem label={t("scan.labelIP")} value={domainInfo.ip} highlight />
                        <InfoItem label={t("scan.labelIPv4")} value={domainInfo.ipv4} />
                        <InfoItem label={t("scan.labelIPv6")} value={domainInfo.ipv6} />
                        <InfoItem label={t("scan.labelMX")} value={domainInfo.mx} />
                        <InfoItem label={t("scan.labelNS")} value={domainInfo.ns} />
                        <InfoItem label={t("scan.labelTXT")} value={domainInfo.txt} />
                        {domainInfo.asn && (
                          <>
                            <InfoItem label={t("scan.labelASN")} value={domainInfo.asn} />
                            <InfoItem label={t("scan.labelASNName")} value={domainInfo.asn_name} />
                          </>
                        )}
                        {domainInfo.country && (
                          <>
                            <InfoItem label={t("scan.labelCountry")} value={domainInfo.country} />
                            <InfoItem label={t("scan.labelCity")} value={domainInfo.city} />
                          </>
                        )}
                        <InfoItem label={t("scan.labelISP")} value={domainInfo.isp} />
                        <InfoItem label={t("scan.labelOrganization")} value={domainInfo.organization} />
                      </InfoCard>
                      </Suspense>
                    )}

                    {techStack && (
                      <Suspense fallback={<LoadingPlaceholder />}>
                        <InfoCard title={t("scan.cardTechStack")} icon="⚙️">
                        {/* ... existing techStack InfoItem entries ... */}
                        {techStack.server && (
                          <InfoItem label={t("scan.labelWebServer")} value={techStack.server} highlight />
                        )}
                        {techStack.powered_by && (
                          <InfoItem label={t("scan.labelPoweredBy")} value={techStack.powered_by} />
                        )}
                        {techStack.content_type && (
                          <InfoItem label={t("scan.labelContentType")} value={techStack.content_type} />
                        )}
                        {techStack.last_modified && (
                          <InfoItem label={t("scan.labelLastModified")} value={techStack.last_modified} />
                        )}
                        {techStack.etag && (
                          <InfoItem label={t("scan.labelETag")} value={techStack.etag} />
                        )}
                        {techStack.security_headers && Object.keys(techStack.security_headers).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-tech-border/20">
                            <div className="text-tech-cyan/70 font-mono text-xs uppercase tracking-wider mb-2">{t("scan.labelSecurityHeaders")}:</div>
                            {Object.entries(techStack.security_headers).map(([key, value]) => (
                              <InfoItem key={key} label={key} value={value} />
                            ))}
                          </div>
                        )}
                        
                        {/* 技术栈检测 */}
                        {techStack.technologies && techStack.technologies.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-tech-border/20">
                            <InfoItem label={t("scan.labelDetectedTech")} value={techStack.technologies} highlight />
                          </div>
                        )}
                        {techStack.framework && techStack.framework.length > 0 && (
                          <InfoItem label={t("scan.labelFramework")} value={techStack.framework} />
                        )}
                        {techStack.cms && techStack.cms.length > 0 && (
                          <InfoItem label={t("scan.labelCMS")} value={techStack.cms} highlight />
                        )}
                        {techStack.language && techStack.language.length > 0 && (
                          <InfoItem label={t("scan.labelProgrammingLanguage")} value={techStack.language} />
                        )}
                        {techStack.javascript_lib && techStack.javascript_lib.length > 0 && (
                          <InfoItem label={t("scan.labelJSLib")} value={techStack.javascript_lib} />
                        )}
                        {techStack.analytics && techStack.analytics.length > 0 && (
                          <InfoItem label={t("scan.labelAnalytics")} value={techStack.analytics} />
                        )}
                        {techStack.cdn && techStack.cdn.length > 0 && (
                          <InfoItem label={t("scan.labelCDN")} value={techStack.cdn} />
                        )}
                        {techStack.cache && techStack.cache.length > 0 && (
                          <InfoItem label={t("scan.labelCache")} value={techStack.cache} />
                        )}
                        {techStack.database && techStack.database.length > 0 && (
                          <InfoItem label={t("scan.labelDatabase")} value={techStack.database} />
                        )}
                        {techStack.os && (
                          <InfoItem label={t("scan.labelOS")} value={techStack.os} />
                        )}
                        {/* 只显示技术相关的元标签（已排除网站信息中的标准标签） */}
                        {techStack.meta_tags && Object.keys(techStack.meta_tags).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-tech-border/20">
                            <div className="text-tech-cyan/70 font-mono text-xs uppercase tracking-wider mb-2">{t("scan.labelTechMetaTags")}:</div>
                            {Object.entries(techStack.meta_tags).slice(0, 15).map(([key, value]) => (
                              <InfoItem key={key} label={key} value={value} />
                            ))}
                            {Object.keys(techStack.meta_tags).length > 15 && (
                              <div className="text-tech-cyan/50 font-mono text-xs mt-2">
                                {t("scan.labelMoreTags", { count: Object.keys(techStack.meta_tags).length - 15 })}
                              </div>
                            )}
                          </div>
                        )}
                      </InfoCard>
                      </Suspense>
                    )}
                  </div>
                )}

                {/* Performance - 单独一行显示（内容较多） */}
                {performance && (
                  <div className="mt-6 animate-fade-in">
                    <Suspense fallback={<div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg animate-pulse">加载中...</div>}>
                      <PerformanceCard metrics={performance} />
                    </Suspense>
                  </div>
                )}

                {/* SEO, Security - Lighthouse Quality & Experience Metrics */}
                {(seoCompliance || securityRisk) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 animate-fade-in">
                    {seoCompliance && (
                      <Suspense fallback={<div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg animate-pulse">加载中...</div>}>
                        <SEOComplianceCard seo={seoCompliance} />
                      </Suspense>
                    )}
                    {securityRisk && (
                      <Suspense fallback={<div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg animate-pulse">加载中...</div>}>
                        <SecurityPanel security={securityRisk} />
                      </Suspense>
                    )}
                  </div>
                )}

                {/* Accessibility (A11y) - 单独一行显示（内容较多） */}
                {accessibility && (
                  <div className="mt-6 animate-fade-in">
                    <Suspense fallback={<div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg animate-pulse">加载中...</div>}>
                      <AccessibilityCard accessibility={accessibility} />
                    </Suspense>
                  </div>
                )}

                {/* AI 分析报告 */}
                {aiAnalysis && state === "done" && (
                  <Suspense fallback={<LoadingPlaceholder />}>
                    <AIAnalysisReport analysis={aiAnalysis} />
                  </Suspense>
                )}

                {state === "done" && (
                  <div className="space-y-4 animate-fade-in mt-6">
                    <Suspense fallback={<LoadingPlaceholder />}>
                      <ReportSummary results={results} />
                    </Suspense>
                    <Suspense fallback={<LoadingPlaceholder />}>
                      <ResultTable results={results} />
                    </Suspense>
                    <Suspense fallback={<LoadingPlaceholder />}>
                      <ReportActions 
                      target={url!} 
                      results={results}
                      websiteInfo={websiteInfo}
                      domainInfo={domainInfo}
                      sslInfo={sslInfo}
                      techStack={techStack}
                      aiAnalysis={aiAnalysis}
                      performance={performance}
                      seo={seoCompliance}
                      security={securityRisk}
                      accessibility={accessibility}
                    />
                    </Suspense>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          // 构建选项参数，保留当前选项和语言设置
                          const optionsParams = new URLSearchParams()
                          if (options.linkHealthCheck) optionsParams.append("options", "link-health")
                          if (options.websiteInfo) optionsParams.append("options", "website-info")
                          if (options.domainInfo) optionsParams.append("options", "domain-info")
                          if (options.sslInfo) optionsParams.append("options", "ssl-info")
                          if (options.techStack) optionsParams.append("options", "tech-stack")
                          if (options.performance) optionsParams.append("options", "performance")
                          if (options.seo) optionsParams.append("options", "seo")
                          if (options.security) optionsParams.append("options", "security")
                          if (options.accessibility) optionsParams.append("options", "accessibility")
                          if (options.aiAnalysis) {
                            optionsParams.append("options", "ai-analysis")
                            if (aiMode && aiMode !== "balanced") {
                              optionsParams.append("ai_mode", aiMode)
                            }
                            optionsParams.append("lang", locale)
                          }
                          const queryString = optionsParams.toString()
                          const scanUrl = queryString
                            ? `/scan?url=${encodeURIComponent(url!)}&${queryString}`
                            : `/scan?url=${encodeURIComponent(url!)}`
                          router.push(scanUrl)
                        }}
                        className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan relative overflow-hidden group/btn"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          {t("scan.rescan")}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 ease-out"></div>
                      </button>
                      <button
                        onClick={() => router.push("/")}
                        className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-sm font-bold px-6 py-3 transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      >
                        {t("scan.scanAnother")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </>
  )
}

export default function ScanPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      <main className="flex-grow p-6 relative w-full">
        <Suspense fallback={
          <div className="max-w-7xl mx-auto space-y-6 relative z-10">
            <div className="bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-8">
              <div className="text-center text-tech-cyan/70 font-mono">
                <p>Loading scan page...</p>
              </div>
            </div>
          </div>
        }>
          <ScanPageContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

