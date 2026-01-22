'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getDashboardData, type DashboardData, type PricingPlan } from '@/services/dashboardService';
import type { UserCredits } from '@/services/creditsService';
import type { Subscription, SubscriptionUsage } from '@/services/pricingService';
import type { UsageStats } from '@/services/creditsService';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const dashboardData = await getDashboardData();
      setData(dashboardData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || t('dashboard.errors.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  const getPlanLimit = (planType: string | undefined, plans: Record<string, PricingPlan>): number => {
    if (!planType) return 0;
    const plan = plans[planType];
    return plan?.basic_scans_limit || 0;
  };

  const getMonthlyCreditsLimit = (planType: string | undefined, plans: Record<string, PricingPlan>): number => {
    if (!planType) return 0;
    const plan = plans[planType];
    return plan?.monthly_credits_limit || 0;
  };

  const getPlanName = (planType: string | undefined): string => {
    if (!planType) return '';
    switch (planType) {
      case 'basic':
        return t('dashboard.subscription.basic');
      case 'pro':
        return t('dashboard.subscription.pro');
      case 'enterprise':
        return t('dashboard.subscription.enterprise');
      default:
        return planType;
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
        <Header />
        <main className="flex-grow p-6 relative w-full">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-tech-cyan font-mono text-sm">{t('dashboard.loading')}</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
        <Header />
        <main className="flex-grow p-6 relative w-full">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-tech-cyan font-mono text-sm">{t('dashboard.loading')}</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
        <Header />
        <main className="flex-grow p-6 relative w-full">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-6 text-center">
              <p className="text-red-400 font-mono mb-4">{error}</p>
              <button
                onClick={() => loadData()}
                className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)]"
              >
                {t('dashboard.refresh')}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const credits = data?.credits;
  const subscription = data?.subscription;
  const monthlyUsage = data?.monthly_usage;
  const apiAccessStats = data?.api_access_stats;
  const usageStats = data?.usage_stats;
  const plans = data?.plans || {};

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      
      <main className="flex-grow p-6 relative w-full">
        {/* Floating background elements */}
        <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
        <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
                {t('dashboard.title')}
              </h1>
              <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
                USER_DASHBOARD_SYSTEM
              </p>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all group overflow-hidden shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center gap-2">
                {refreshing ? t('dashboard.loading') : t('dashboard.refresh')}
                {!refreshing && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </span>
              <div className="absolute inset-0 bg-tech-cyan/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm mb-6 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="text-red-400 mr-2">⚠</span> {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* 余额信息卡片 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
                {/* Decorative Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
                      {t('dashboard.credits.title')}
                    </h2>
                  </div>
                  
                  {credits ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-tech-surface/50 border border-tech-border/30 rounded">
                        <span className="text-gray-300 font-mono text-sm">{t('dashboard.credits.balance')}</span>
                        <span className="font-bold text-tech-cyan text-xl">{credits.credits}</span>
                      </div>
                      
                      {subscription && (
                        <div className="p-3 bg-tech-surface/50 border border-tech-border/30 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300 font-mono text-sm">{t('dashboard.credits.monthlyCreditsUsed')}</span>
                            <span className="font-bold text-tech-cyan">
                              {credits.monthly_credits_used} / {getMonthlyCreditsLimit(subscription.plan_type, plans)}
                            </span>
                          </div>
                          <div className="w-full bg-tech-surface/80 rounded-full h-2 mt-2">
                            <div
                              className="bg-tech-cyan h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, (credits.monthly_credits_used / getMonthlyCreditsLimit(subscription.plan_type, plans)) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      <Link
                        href="/pricing"
                        className="block text-center mt-4 clip-tech-btn bg-tech-cyan/10 hover:bg-tech-cyan/20 border border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan font-mono text-xs font-bold py-2 transition-all"
                      >
                        {t('dashboard.actions.purchaseCredits')}
                      </Link>
                    </div>
                  ) : (
                    <div className="text-gray-400 font-mono text-sm text-center py-8">
                      {t('dashboard.loading')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 订阅状态卡片 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
                {/* Decorative Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
                      {t('dashboard.subscription.title')}
                    </h2>
                  </div>
                  
                  {subscription ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-tech-surface/50 border border-tech-border/30 rounded">
                        <span className="text-gray-300 font-mono text-sm">{t('dashboard.subscription.planType')}</span>
                        <span className="font-bold text-tech-cyan">{getPlanName(subscription.plan_type)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-tech-surface/50 border border-tech-border/30 rounded">
                        <span className="text-gray-300 font-mono text-sm">{t('dashboard.subscription.status')}</span>
                        <span className={`font-bold ${subscription.status === 'active' ? 'text-green-400' : 'text-gray-400'}`}>
                          {subscription.status === 'active' ? t('dashboard.subscription.active') : t('dashboard.subscription.inactive')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-tech-surface/50 border border-tech-border/30 rounded">
                        <span className="text-gray-300 font-mono text-sm">{t('dashboard.subscription.expiresAt')}</span>
                        <span className="text-tech-cyan font-mono text-sm">
                          {new Date(subscription.expires_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN')}
                        </span>
                      </div>
                      
                      <Link
                        href="/pricing"
                        className="block text-center mt-4 clip-tech-btn bg-tech-cyan/10 hover:bg-tech-cyan/20 border border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan font-mono text-xs font-bold py-2 transition-all"
                      >
                        {t('dashboard.subscription.manage')}
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 font-mono text-sm mb-4">{t('dashboard.subscription.noSubscription')}</p>
                      <Link
                        href="/pricing"
                        className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                      >
                        {t('dashboard.subscription.viewPlans')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 月度使用情况 */}
          {subscription && monthlyUsage && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
                {/* Decorative Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
                      {t('dashboard.monthlyUsage.title')}
                    </h2>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.monthlyUsage.basicScans')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">
                        {monthlyUsage.basic_scans_used}{t('dashboard.monthlyUsage.of')}{getPlanLimit(subscription.plan_type, plans)}
                      </div>
                      <div className="w-full bg-tech-surface/80 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-tech-cyan h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (monthlyUsage.basic_scans_used / getPlanLimit(subscription.plan_type, plans)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.monthlyUsage.premiumFeatures')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">{monthlyUsage.premium_features_used}</div>
                    </div>
                    
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.monthlyUsage.creditsUsed')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">{monthlyUsage.credits_used}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API访问统计 */}
          {subscription && subscription.plan_type !== 'basic' && apiAccessStats && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
                {/* Decorative Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
                      {t('dashboard.apiAccess.title')}
                    </h2>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.apiAccess.totalRequests')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">{apiAccessStats.total_requests}</div>
                    </div>
                    
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.apiAccess.monthlyRequests')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">
                        {apiAccessStats.monthly_requests}
                        {apiAccessStats.monthly_limit && ` / ${apiAccessStats.monthly_limit}`}
                      </div>
                      {apiAccessStats.monthly_limit && (
                        <div className="w-full bg-tech-surface/80 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-tech-cyan h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (apiAccessStats.monthly_requests / apiAccessStats.monthly_limit) * 100)}%`
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                    
                    {apiAccessStats.remaining_requests !== undefined && (
                      <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                        <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.apiAccess.remainingRequests')}</div>
                        <div className={`text-2xl font-bold ${apiAccessStats.remaining_requests > 0 ? 'text-tech-cyan' : 'text-red-400'}`}>
                          {apiAccessStats.remaining_requests}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 使用统计 */}
          {usageStats && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
                {/* Decorative Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                <div className="p-6 relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
                      {t('dashboard.usageStats.title')}
                    </h2>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.usageStats.totalScans')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">{usageStats.total_scans}</div>
                    </div>
                    
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.usageStats.paidScans')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">{usageStats.paid_scans}</div>
                    </div>
                    
                    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                      <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">{t('dashboard.usageStats.totalCreditsUsed')}</div>
                      <div className="text-2xl font-bold text-tech-cyan">{usageStats.total_credits_used}</div>
                    </div>
                  </div>
                  
                  {Object.keys(usageStats.feature_usage).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-tech-border/30">
                      <h3 className="font-bold text-tech-cyan font-mono text-sm uppercase mb-4">{t('dashboard.usageStats.featureUsage')}</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {Object.entries(usageStats.feature_usage).map(([feature, count]) => (
                          <div key={feature} className="flex justify-between items-center p-3 bg-tech-surface/50 border border-tech-border/30 rounded">
                            <span className="text-gray-300 font-mono text-sm">{feature}</span>
                            <span className="font-bold text-tech-cyan">{count} {t('dashboard.usageStats.times')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {usageStats.date_range && (
                    <div className="mt-4 pt-4 border-t border-tech-border/30">
                      <div className="text-tech-cyan/70 font-mono text-xs">
                        {t('dashboard.usageStats.dateRange')}: {new Date(usageStats.date_range.start).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN')} - {new Date(usageStats.date_range.end).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 快速操作 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/pricing"
              className="relative group p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg hover:border-tech-cyan/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tech-cyan/10 rounded flex items-center justify-center">
                  <span className="text-tech-cyan text-xl">💰</span>
                </div>
                <div>
                  <div className="text-tech-cyan font-mono text-sm font-bold">{t('dashboard.actions.purchaseCredits')}</div>
                  <div className="text-gray-400 text-xs">{t('dashboard.actions.purchaseCreditsDesc')}</div>
                </div>
              </div>
            </Link>
            
            <Link
              href="/tasks"
              className="relative group p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg hover:border-tech-cyan/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tech-cyan/10 rounded flex items-center justify-center">
                  <span className="text-tech-cyan text-xl">📋</span>
                </div>
                <div>
                  <div className="text-tech-cyan font-mono text-sm font-bold">{t('dashboard.actions.viewTasks')}</div>
                  <div className="text-gray-400 text-xs">{t('dashboard.actions.viewTasksDesc')}</div>
                </div>
              </div>
            </Link>
            
            <Link
              href="/pricing"
              className="relative group p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg hover:border-tech-cyan/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tech-cyan/10 rounded flex items-center justify-center">
                  <span className="text-tech-cyan text-xl">📊</span>
                </div>
                <div>
                  <div className="text-tech-cyan font-mono text-sm font-bold">{t('dashboard.actions.viewPricing')}</div>
                  <div className="text-gray-400 text-xs">{t('dashboard.actions.viewPricingDesc')}</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
