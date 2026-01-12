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
import { redirectToCheckout, redirectToPayment } from '@/services/paymentService';

export default function PricingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [featurePricing, setFeaturePricing] = useState<FeaturePricing[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [purchasingCredits, setPurchasingCredits] = useState(false);
  const [creditAmount, setCreditAmount] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');

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
  }, [user, loadData]);

  const handleSubscribe = async (planType: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setSubscribing(planType);
    setError(null);
    try {
      const result = await createSubscription(planType, paymentMethod);
      // 根据provider选择跳转方式
      if (result.provider === 'paypal') {
        redirectToPayment(result.url, 'paypal');
      } else {
        redirectToPayment(result.session_id || result.url, 'stripe');
      }
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

    if (creditAmount <= 0) {
      setError('积分数量必须大于0');
      return;
    }

    setPurchasingCredits(true);
    setError(null);
    try {
      // 创建订单
      const order = await createOrder('credits_purchase', undefined, creditAmount, paymentMethod);
      
      // 创建支付会话
      const result = await createCheckoutSession(order.id, paymentMethod);
      
      // 跳转到支付页面
      if (result.provider === 'paypal') {
        redirectToPayment(result.url, 'paypal');
      } else {
        redirectToPayment(result.session_id || result.url, 'stripe');
      }
    } catch (err: any) {
      console.error('Failed to purchase credits:', err);
      setError(err.message || '购买积分失败，请重试');
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

          {/* 支付方式选择 */}
          {user && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/20 to-tech-blue/20 rounded-lg blur opacity-20"></div>
              <div className="relative bg-tech-bg/60 backdrop-blur-xl border border-tech-border/30 rounded-lg p-4">
                <label className="block text-sm text-gray-300 font-mono mb-3">
                  选择支付方式
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={paymentMethod === 'stripe'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paypal')}
                      className="w-4 h-4 text-tech-cyan bg-tech-surface border-tech-border focus:ring-tech-cyan focus:ring-2"
                    />
                    <span className="text-sm text-gray-300 font-mono">Stripe (信用卡)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paypal')}
                      className="w-4 h-4 text-tech-cyan bg-tech-surface border-tech-border focus:ring-tech-cyan focus:ring-2"
                    />
                    <span className="text-sm text-gray-300 font-mono">PayPal</span>
                  </label>
                </div>
              </div>
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
                      购买积分
                    </h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label htmlFor="credit-amount" className="block text-sm text-gray-300 font-mono mb-2">
                        积分数量（1积分 = ¥1）
                      </label>
                      <input
                        id="credit-amount"
                        type="number"
                        min="1"
                        step="1"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        placeholder="输入积分数量"
                        className="w-full px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded text-white font-mono focus:outline-none focus:border-tech-cyan"
                      />
                    </div>
                    <button
                      onClick={handlePurchaseCredits}
                      disabled={purchasingCredits || creditAmount <= 0}
                      className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] disabled:opacity-50"
                    >
                      {purchasingCredits ? '处理中...' : `购买 ¥${creditAmount}`}
                    </button>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-400 font-mono">
                    <p>快速选择：</p>
                    <div className="flex gap-2 mt-2">
                      {[50, 100, 200, 500, 1000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCreditAmount(amount)}
                          className="px-3 py-1 bg-tech-surface/50 border border-tech-border/30 rounded hover:border-tech-cyan transition-colors"
                        >
                          ¥{amount}
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
                        <h3 className="text-2xl font-black mb-2 text-white">{plan.plan_name}</h3>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-4xl font-black text-tech-cyan">¥{plan.monthly_price_cny}</span>
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
                        {plan.features && plan.features.length > 0 && (
                          <>
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-tech-cyan mr-2 font-bold">✓</span>
                                <span className="text-gray-300 text-sm">{feature}</span>
                              </li>
                            ))}
                          </>
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
                      功能定价
                    </h2>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-tech-border/30">
                      <thead className="bg-tech-surface/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            功能名称
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            分类
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            积分成本
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-tech-bg/40 divide-y divide-tech-border/20">
                        {featurePricing
                          .filter((fp) => fp.is_available)
                          .map((feature) => (
                            <tr key={feature.id} className="hover:bg-tech-surface/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-white font-bold">{feature.feature_name}</span>
                                {feature.is_premium && (
                                  <span className="ml-2 px-2 py-0.5 bg-tech-cyan/20 text-tech-cyan text-xs font-mono rounded">
                                    PREMIUM
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-400 font-mono">
                                  {feature.feature_category}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-tech-cyan font-bold">
                                  {feature.credits_cost === 0 ? '免费' : `${feature.credits_cost} 积分`}
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
