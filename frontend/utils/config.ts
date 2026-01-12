// 应用配置
export const NORMALIZED_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// 构建完整API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${NORMALIZED_API_BASE_URL}${endpoint}`
}

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

