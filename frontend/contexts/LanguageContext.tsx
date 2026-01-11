"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Locale, getTranslation, formatTranslation } from "@/utils/i18n"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  mounted: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 初始状态统一使用 "zh"，避免服务器端和客户端不一致
  const [locale, setLocaleState] = useState<Locale>("zh")
  const [mounted, setMounted] = useState(false)

  // 在客户端 hydration 完成后，从 localStorage 读取语言设置
  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("locale") as Locale | null
      if (saved && (saved === "zh" || saved === "en")) {
        setLocaleState(saved)
        document.documentElement.lang = saved === "zh" ? "zh-CN" : "en"
      } else {
        // 根据浏览器语言设置默认值
        const browserLang = navigator.language.toLowerCase()
        const defaultLocale: Locale = browserLang.startsWith("zh") ? "zh" : "en"
        setLocaleState(defaultLocale)
        localStorage.setItem("locale", defaultLocale)
        document.documentElement.lang = defaultLocale === "zh" ? "zh-CN" : "en"
      }
    }
  }, [])

  // 保存语言设置到localStorage
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("locale", locale)
      // 更新HTML lang属性
      document.documentElement.lang = locale === "zh" ? "zh-CN" : "en"
    }
  }, [locale, mounted])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
  }

  const t = (key: string, params?: Record<string, string | number>) => {
    return formatTranslation(locale, key, params)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

