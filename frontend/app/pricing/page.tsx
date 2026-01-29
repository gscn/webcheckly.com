'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSubscriptionPlans, createSubscription, getUserSubscription, getFeaturePricing, type PricingPlan, type Subscription, type FeaturePricing } from '@/services/pricingService';
import { createOrder } from '@/services/orderService';
import { createCheckoutSession } from '@/services/orderService';
import { redirectToPayment } from '@/services/paymentService';
import { getFeatureName, getCategoryName } from '@/utils/featureNames';

export default function PricingPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [featurePricing, setFeaturePricing] = useState<FeaturePricing[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [purchasingCredits, setPurchasingCredits] = useState(false);
  // 积分购买：1美元=100积分，默认10美元=1000积分
  const [creditAmountUSD, setCreditAmountUSD] = useState(10);
  const [error, setError] = useState<string | null>(null);
  // 默认使用PayPal支付
  const paymentMethod: 'paypal' = 'paypal';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, featuresData, subscription] = await Promise.all([
        getSubscriptionPlans(),
        getFeaturePricing(),
        user ? getUserSubscription() : Promise.resolve(null),
      ]);
      setPlans(plansData);
      setFeaturePricing(featuresData);
      setCurrentSubscription(subscription);
    } catch (err: any) {
      console.error('Failed to load pricing data:', err);
      setError(err.message || t('pricing.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubscribe = async (planType: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setSubscribing(planType);
    setError(null);
    try {
      // 订阅流程：仅用 createSubscription，回跳 /subscription/success 或 /subscription/cancel
      const result = await createSubscription(planType, paymentMethod);
      redirectToPayment(result.url, paymentMethod);
    } catch (err: any) {
      console.error('Failed to subscribe:', err);
      setError(err.message || t('pricing.errors.subscribeFailed'));
      setSubscribing(null);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    if (creditAmountUSD <= 0) {
      setError(t('pricing.errors.amountRequired'));
      return;
    }

    setPurchasingCredits(true);
    setError(null);
    try {
      // 购买积分流程：仅用 orders/create + create-checkout，回跳 /payment/success 或 /payment/cancel
      const order = await createOrder('credits_purchase', undefined, creditAmountUSD, paymentMethod);
      const result = await createCheckoutSession(order.id, paymentMethod);
      redirectToPayment(result.url, paymentMethod);
    } catch (err: any) {
      console.error('Failed to purchase credits:', err);
      setError(err.message || t('pricing.errors.purchaseFailed'));
      setPurchasingCredits(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
        <Header />
        <main className="flex-grow p-6 relative w-full">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-tech-cyan font-mono text-sm">{t('pricing.loading')}</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      
      <main className="flex-grow p-6 relative w-full">
        {/* Floating background elements */}
        <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
        <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">
              {t('pricing.title')}
            </h1>
            <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
              {t('pricing.subtitle')}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="text-red-400 mr-2">⚠</span> {error}
            </div>
          )}


          {/* 积分购买卡片 */}
          {user && (
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
                      {t('pricing.credits.title')}
                    </h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label htmlFor="credit-amount" className="block text-sm text-gray-300 font-mono mb-2">
                        {t('pricing.credits.amountLabel')}
                      </label>
                      <input
                        id="credit-amount"
                        type="number"
                        min="1"
                        step="0.01"
                        value={creditAmountUSD}
                        onChange={(e) => setCreditAmountUSD(Number(e.target.value))}
                        placeholder={t('pricing.credits.amountPlaceholder')}
                        className="w-full px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded text-white font-mono focus:outline-none focus:border-tech-cyan"
                      />
                      <p className="mt-1 text-xs text-gray-500 font-mono">
                        {t('pricing.credits.willGet', { credits: Math.round(creditAmountUSD * 100) })}
                      </p>
                    </div>
                    <button
                      onClick={handlePurchaseCredits}
                      disabled={purchasingCredits || creditAmountUSD <= 0}
                      className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] disabled:opacity-50"
                    >
                      {purchasingCredits ? t('pricing.credits.processing') : t('pricing.credits.purchase', { amount: creditAmountUSD.toFixed(2) })}
                    </button>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-400 font-mono">
                    <p>{t('pricing.credits.quickSelect')}</p>
                    <div className="flex gap-2 mt-2">
                      {[5, 10, 20, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCreditAmountUSD(amount)}
                          className="px-3 py-1 bg-tech-surface/50 border border-tech-border/30 rounded hover:border-tech-cyan transition-colors"
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 订阅套餐 */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentSubscription?.plan_type === plan.plan_type;
              const isSubscribing = subscribing === plan.plan_type;
              const isPro = plan.plan_type === 'pro';

              return (
                <div key={plan.plan_type} className="relative group">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000 ${isPro ? 'opacity-60' : ''}`}></div>
                  <div className={`relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel ${isPro ? 'border-tech-cyan/60' : ''}`}>
                    {/* Decorative Corner Markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                    <div className="p-8 relative z-10">
                      {/* Plan Header */}
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-black mb-2 text-white">
                          {plan.plan_type === 'basic' 
                            ? t('pricing.plans.basic')
                            : plan.plan_type === 'pro'
                            ? t('pricing.plans.pro')
                            : t('pricing.plans.enterprise')}
                        </h3>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-4xl font-black text-tech-cyan">${plan.monthly_price_usd}</span>
                          <span className="text-sm text-gray-400 font-mono">{t('pricing.monthly')}</span>
                        </div>
                      </div>

                      {/* Features List */}
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start">
                          <span className="text-tech-cyan mr-2 font-bold">✓</span>
                          <span className="text-gray-300 text-sm">
                            {t('pricing.features.basicScans', { count: plan.basic_scans_limit })}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-tech-cyan mr-2 font-bold">✓</span>
                          <span className="text-gray-300 text-sm">
                            {t('pricing.features.monthlyCredits', { count: plan.monthly_credits_limit })}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-tech-cyan mr-2 font-bold">✓</span>
                          <span className="text-gray-300 text-sm">
                            {t('pricing.features.taskHistory')}{' '}
                            {plan.task_history_days === -1
                              ? t('pricing.features.taskHistoryPermanent')
                              : t('pricing.features.taskHistoryDays', { days: plan.task_history_days })}
                          </span>
                        </li>
                        {plan.api_access_limit && (
                          <li className="flex items-start">
                            <span className="text-tech-cyan mr-2 font-bold">✓</span>
                            <span className="text-gray-300 text-sm">
                              {t('pricing.features.apiAccess', { count: plan.api_access_limit })}
                            </span>
                          </li>
                        )}
                      </ul>

                      {/* Subscribe Button */}
                      <button
                        onClick={() => handleSubscribe(plan.plan_type)}
                        disabled={isCurrentPlan || isSubscribing}
                        className={`w-full clip-tech-btn font-black font-mono text-sm py-3 transition-all ${
                          isCurrentPlan
                            ? 'bg-tech-surface/50 border border-tech-border/30 text-gray-400 cursor-not-allowed'
                            : isPro
                            ? 'bg-tech-cyan hover:bg-[#33f2ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)]'
                            : 'bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        }`}
                      >
                        {isCurrentPlan
                          ? t('pricing.currentPlan')
                          : isSubscribing
                          ? t('pricing.subscribing')
                          : t('pricing.subscribe')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 功能定价表 */}
          {featurePricing.length > 0 && (
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
                      {t('pricing.featurePricing.title')}
                    </h2>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-tech-border/30">
                      <thead className="bg-tech-surface/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('pricing.featurePricing.featureName')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('pricing.featurePricing.category')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('pricing.featurePricing.creditsCost')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-tech-bg/40 divide-y divide-tech-border/20">
                        {featurePricing
                          .filter((fp) => fp.is_available)
                          .sort((a, b) => {
                            // 先按分类排序（basic在前），再按功能代码排序
                            if (a.feature_category !== b.feature_category) {
                              return a.feature_category === 'basic' ? -1 : 1;
                            }
                            return a.feature_code.localeCompare(b.feature_code);
                          })
                          .map((feature) => (
                            <tr key={feature.id} className="hover:bg-tech-surface/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-white font-bold font-mono">
                                    {getFeatureName(feature.feature_code, locale)}
                                  </span>
                                  {feature.is_premium && (
                                    <span className="px-2 py-0.5 bg-tech-cyan/20 text-tech-cyan text-xs font-mono rounded border border-tech-cyan/40 whitespace-nowrap">
                                      PREMIUM
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-400 font-mono">
                                  {getCategoryName(feature.feature_category, locale)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-tech-cyan font-bold font-mono">
                                  {feature.credits_cost === 0 
                                    ? t('pricing.featurePricing.free') 
                                    : `${feature.credits_cost} ${t('pricing.featurePricing.credits')}`}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Login Prompt */}
          {!user && (
            <div className="text-center">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-6">
                  <p className="text-gray-400 font-mono text-sm mb-4">
                    {t('pricing.loginPrompt')}{' '}
                    <Link href="/login" className="text-tech-cyan hover:text-[#33f2ff] underline">
                      {t('pricing.login')}
                    </Link>{' '}
                    {t('pricing.or')}{' '}
                    <Link href="/register" className="text-tech-cyan hover:text-[#33f2ff] underline">
                      {t('pricing.register')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
