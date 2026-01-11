/**
 * 重试工具函数
 * 用于网络请求失败时的自动重试
 */

export interface RetryOptions {
  maxRetries?: number // 最大重试次数，默认3次
  retryDelay?: number // 重试延迟（毫秒），默认1000ms
  retryCondition?: (error: any) => boolean // 判断是否应该重试的条件
  onRetry?: (attempt: number, error: any) => void // 重试时的回调
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryCondition' | 'onRetry'>> = {
  maxRetries: 3,
  retryDelay: 1000,
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: any): boolean {
  // 网络错误、超时错误、5xx服务器错误可以重试
  if (!error) return false
  
  // Fetch API 的网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  
  // 响应状态码错误
  if (error.status) {
    // 5xx 服务器错误可以重试
    if (error.status >= 500 && error.status < 600) {
      return true
    }
    // 429 限流错误可以重试
    if (error.status === 429) {
      return true
    }
    // 408 超时错误可以重试
    if (error.status === 408) {
      return true
    }
  }
  
  // 检查错误消息
  const errorMessage = error.message || String(error)
  const retryableMessages = ['network', 'timeout', 'connection', 'ECONNREFUSED', 'ETIMEDOUT']
  if (retryableMessages.some(msg => errorMessage.toLowerCase().includes(msg.toLowerCase()))) {
    return true
  }
  
  return false
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    retryDelay = DEFAULT_OPTIONS.retryDelay,
    retryCondition = isRetryableError,
    onRetry,
  } = options

  let lastError: any
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      attempt++

      // 如果已达到最大重试次数，或者错误不可重试，则抛出错误
      if (attempt > maxRetries || !retryCondition(error)) {
        throw error
      }

      // 执行重试回调
      onRetry?.(attempt, error)

      // 指数退避：每次重试延迟逐渐增加
      const delayMs = retryDelay * Math.pow(2, attempt - 1)
      await delay(delayMs)
    }
  }

  throw lastError
}

/**
 * 带重试的 fetch 请求
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, options)
      
      // 如果响应不成功，抛出错误以便重试机制处理
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        error.response = response
        throw error
      }
      
      return response
    },
    retryOptions
  )
}
