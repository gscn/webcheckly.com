"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import LanguageSwitcher from "./LanguageSwitcher"
import { getCreditsBalance, type UserCredits } from "@/services/creditsService"
import { getUserSubscription, type Subscription } from "@/services/pricingService"

export default function Header() {
  const { t } = useLanguage()
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(false)

  const loadUserInfo = useCallback(async () => {
    if (!user) return // 如果用户未登录，不加载信息
    
    setLoadingCredits(true)
    try {
      const [creditsData, subscriptionData] = await Promise.all([
        getCreditsBalance(),
        getUserSubscription(),
      ])
      setCredits(creditsData)
      setSubscription(subscriptionData)
    } catch (error) {
      // 静默处理错误（服务函数已经处理了401错误）
      console.error('Failed to load user info:', error)
    } finally {
      setLoadingCredits(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadUserInfo()
    }
  }, [user, loadUserInfo])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-tech-border/20 bg-tech-bg/80 backdrop-blur-md">
      <div className="flex justify-between items-center py-4 px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer select-none">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 border border-tech-cyan/50 rotate-45 group-hover:rotate-90 transition-transform duration-700 ease-in-out"></div>
            <div className="absolute inset-0 border border-tech-cyan/30 -rotate-12 group-hover:rotate-0 transition-transform duration-700 ease-in-out"></div>
            <div className="w-1.5 h-1.5 bg-tech-cyan shadow-neon-cyan animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wider text-white font-sans">
              WEBCHECKLY<span className="text-tech-cyan">{t("header.title").replace("WEBCHECKLY", "")}</span>
            </span>
            <span className="text-[9px] text-tech-cyan/60 font-mono tracking-[0.3em]">{t("header.systemVersion")}</span>
          </div>
        </Link>
        
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <ul className="flex items-center space-x-10 text-xs font-bold font-sans text-gray-300/80">
            <li>
              <Link href="/" className="hover:text-tech-cyan hover:shadow-neon-cyan transition-all duration-300 flex items-center gap-1 group">
                <span className="text-tech-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity">/</span> {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link href="/features" className="hover:text-tech-cyan hover:shadow-neon-cyan transition-all duration-300 flex items-center gap-1 group">
                <span className="text-tech-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity">/</span> {t("nav.features")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-tech-cyan hover:shadow-neon-cyan transition-all duration-300 flex items-center gap-1 group">
                <span className="text-tech-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity">/</span> {t("nav.faq")}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-tech-cyan hover:shadow-neon-cyan transition-all duration-300 flex items-center gap-1 group">
                <span className="text-tech-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity">/</span> {t("nav.pricing")}
              </Link>
            </li>
          </ul>
          {user ? (
            <div className="flex items-center gap-4">
              {/* 余额和订阅状态显示 */}
              {user && !loadingCredits && credits && (
                <div className="hidden lg:flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-gray-400">{t("header.credits")}:</span>
                    <span className="font-semibold text-tech-cyan">{credits.credits}</span>
                  </div>
                  {subscription && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <span className="text-blue-300">
                        {subscription.plan_type === 'basic' ? t("dashboard.subscription.basic") : 
                         subscription.plan_type === 'pro' ? t("dashboard.subscription.pro") : t("dashboard.subscription.enterprise")}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
                >
                  <span className="text-sm">{user.email}</span>
                  <span className="text-xs">▼</span>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-tech-bg/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">
                        {user.email_verified ? t("header.verified") : t("header.notVerified")}
                      </div>
                      {credits && (
                        <div className="px-3 py-2 text-xs border-b border-white/10">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">{t("header.creditsBalance")}:</span>
                            <span className="text-tech-cyan font-semibold">{credits.credits}</span>
                          </div>
                        </div>
                      )}
                      <Link
                        href="/dashboard"
                        onClick={() => setShowMenu(false)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors"
                      >
                        {t('header.menu.dashboard')}
                      </Link>
                      <Link
                        href="/tasks"
                        onClick={() => setShowMenu(false)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors"
                      >
                        {t('header.menu.tasks')}
                      </Link>
                      {subscription && (subscription.plan_type === 'pro' || subscription.plan_type === 'enterprise') && (
                        <Link
                          href="/api"
                          onClick={() => setShowMenu(false)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors"
                        >
                          {t('header.menu.api')}
                        </Link>
                      )}
                      <Link
                        href="/pricing"
                        onClick={() => setShowMenu(false)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors"
                      >
                        {t('header.menu.pricing')}
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setShowMenu(false)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-tech-cyan/20 rounded transition-colors border-t border-white/10 mt-1 pt-2 text-tech-cyan font-semibold"
                        >
                          {t('header.menu.admin')}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout()
                          setShowMenu(false)
                          router.push("/")
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded transition-colors"
                      >
                        {t("header.logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
              >
                {t("auth.login.submit")}
              </Link>
            </div>
          )}
          <LanguageSwitcher />
        </nav>
        
        {/* Mobile: Auth buttons and Language Switcher */}
        <div className="md:hidden flex items-center gap-2">
          {user ? (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-3 py-1.5 text-xs bg-white/10 rounded-lg border border-white/20"
            >
              {user.email.split("@")[0]}
            </button>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 text-xs bg-white/10 rounded-lg">
                {t("auth.login.submit")}
              </Link>
              <Link href="/register" className="px-3 py-1.5 text-xs bg-blue-600 rounded-lg">
                {t("auth.register.submit")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}

