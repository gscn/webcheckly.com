'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSubscription } from '@/services/pricingService';

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 4;

export default function SubscriptionSuccessPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [status, setStatus] = useState<'checking' | 'activated' | 'success'>('checking');
  const [planType, setPlanType] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStatus('success');
      return;
    }

    let attempts = 0;
    const run = async () => {
      while (attempts < POLL_ATTEMPTS) {
        try {
          const sub = await getUserSubscription();
          if (sub?.status === 'active' && sub?.plan_type) {
            setPlanType(sub.plan_type);
            setStatus('activated');
            return;
          }
        } catch {
          /* ignore */
        }
        attempts += 1;
        if (attempts < POLL_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      }
      setStatus('success');
    };

    run();
  }, [user]);

  const planLabel =
    planType === 'basic'
      ? t('pricing.plans.basic')
      : planType === 'pro'
        ? t('pricing.plans.pro')
        : planType === 'enterprise'
          ? t('pricing.plans.enterprise')
          : planType ?? '';

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      <main className="flex-grow p-6 relative w-full">
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000" />
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-8">
              {status === 'checking' && (
                <>
                  <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-tech-cyan font-mono text-sm">{t('payment.subscription.checkingStatus')}</p>
                </>
              )}
              {(status === 'activated' || status === 'success') && (
                <>
                  <div className="text-5xl mb-4">✓</div>
                  <h1 className="text-2xl font-black text-white mb-2">
                    {status === 'activated' ? t('payment.subscription.successActivated') : t('payment.subscription.successTitle')}
                  </h1>
                  <p className="text-gray-400 font-mono text-sm mb-8">
                    {status === 'activated' && planLabel
                      ? t('payment.subscription.successActivatedSubtitle', { plan: planLabel })
                      : t('payment.subscription.successSubtitle')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/pricing"
                      className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-3 transition-all"
                    >
                      {t('payment.success.backToPricing')}
                    </Link>
                    <Link
                      href="/dashboard"
                      className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 text-tech-cyan font-mono text-sm px-6 py-3 transition-all"
                    >
                      {t('payment.success.backToDashboard')}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
