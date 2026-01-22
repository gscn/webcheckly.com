import { API_BASE_URL } from "@/utils/config"

// 用户信息
export interface User {
  id: string
  email: string
  role?: string
  email_verified: boolean
  created_at: string
}

// 登录响应
export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

// 注册请求
export interface RegisterRequest {
  email: string
  password: string
}

// 登录请求
export interface LoginRequest {
  email: string
  password: string
}

// Token存储键名
const ACCESS_TOKEN_KEY = "webcheckly_access_token"
const REFRESH_TOKEN_KEY = "webcheckly_refresh_token"
const USER_KEY = "webcheckly_user"

// 获取存储的access token
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

// 获取存储的refresh token
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

// 存储token
function setTokens(accessToken: string, refreshToken: string, user: User) {
  if (typeof window === "undefined") return
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

// 清除token
export function clearTokens() {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// 获取存储的用户信息
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr) as User
  } catch {
    return null
  }
}

// 创建带认证头的fetch请求
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  let response = await fetch(url, {
    ...options,
    headers,
  })

  // 如果token过期，尝试刷新
  if (response.status === 401) {
    const token = getAccessToken()
    // 如果有token，尝试刷新
    if (token) {
      const refreshed = await refreshToken()
      if (refreshed) {
        // 重试请求
        const newToken = getAccessToken()
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`)
          response = await fetch(url, {
            ...options,
            headers,
          })
        }
      } else {
        // 刷新失败，清除token（可能是无效token）
        clearTokens()
      }
    }
    // 如果没有token，401是正常的（未登录用户），直接返回
  }

  return response
}

// 刷新token
async function refreshToken(): Promise<boolean> {
  const refreshTokenValue = getRefreshToken()
  if (!refreshTokenValue) return false

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshTokenValue,
      }),
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const data: LoginResponse = await response.json()
    setTokens(data.access_token, data.refresh_token, data.user)
    return true
  } catch (error) {
    console.error("Failed to refresh token:", error)
    clearTokens()
    return false
  }
}

// 用户注册
export async function register(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Registration failed")
  }

  const user: User = await response.json()
  return user
}

// 用户登录
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Login failed")
  }

  const data: LoginResponse = await response.json()
  setTokens(data.access_token, data.refresh_token, data.user)
  return data
}

// 用户登出
export function logout() {
  clearTokens()
}

// 验证邮箱
export async function verifyEmail(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email?token=${token}`, {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Email verification failed")
  }
}

// 重新发送验证邮件
export async function resendVerificationEmail(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to resend verification email")
  }
}

// 请求密码重置
export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to send password reset email")
  }
}

// 重置密码
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, new_password: newPassword }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Password reset failed")
  }
}

// 获取当前用户信息
export async function getCurrentUser(): Promise<User | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/me`)

    if (!response.ok) {
      if (response.status === 401) {
        clearTokens()
      }
      return null
    }

    const user: User = await response.json()
    // 更新存储的用户信息
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user
  } catch (error) {
    console.error("Failed to get current user:", error)
    return null
  }
}

// 检查用户是否已登录
export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

