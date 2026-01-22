"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import {
  User,
  login as loginService,
  logout as logoutService,
  register as registerService,
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
} from "@/services/authService"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化：从localStorage加载用户信息
  useEffect(() => {
    const initAuth = async () => {
      // 先尝试从localStorage加载
      const storedUser = getStoredUser()
      if (storedUser && isAuthenticated()) {
        setUser(storedUser)
        // 验证token是否有效
        try {
          const currentUser = await getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
          } else {
            setUser(null)
          }
        } catch {
          setUser(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await loginService(email, password)
    setUser(response.user)
  }

  const register = async (email: string, password: string) => {
    await registerService(email, password)
    // 注册后自动登录
    await login(email, password)
  }

  const logout = () => {
    logoutService()
    setUser(null)
  }

  const refreshUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

