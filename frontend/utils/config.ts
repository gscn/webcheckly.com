// 应用配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// 规范化 API 基础 URL，确保没有尾随斜杠
export const normalizeBaseUrl = (baseUrl: string): string => {
  if (!baseUrl) return ""
  // 移除尾随的 /api 和 /，避免双重路径
  return baseUrl.replace(/\/api\/?$/, "").replace(/\/?$/, "")
}

export const NORMALIZED_API_BASE_URL = normalizeBaseUrl(API_BASE_URL)

// 是否是生产环境
export const IS_PRODUCTION = process.env.NODE_ENV === "production"

// 调试日志函数（生产环境禁用）
export const debugLog = (...args: any[]) => {
  if (!IS_PRODUCTION) {
    console.log(...args)
  }
}

export const debugError = (...args: any[]) => {
  if (!IS_PRODUCTION) {
    console.error(...args)
  }
}

