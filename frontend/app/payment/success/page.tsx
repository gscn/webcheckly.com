'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { confirmPayment, verifyPayment, verifyPaymentBySessionId } from '@/services/paymentService';

function PaymentSuccessContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStatus('error');
      setErrorMsg(t('payment.success.error'));
      return;
    }
    if (!orderId && !sessionId) {
      setStatus('error');
      setErrorMsg(t('payment.success.error'));
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        if (orderId) {
          try {
            await confirmPayment(orderId);
          } catch {
            // 已支付或非 PayPal 等，忽略，仅做 verify
          }
          const res = await verifyPayment(orderId);
          if (cancelled) return;
          setStatus(res.status === 'paid' ? 'success' : 'error');
          if (res.status !== 'paid') setErrorMsg(t('payment.success.error'));
        } else if (sessionId) {
          const res = await verifyPaymentBySessionId(sessionId);
          if (cancelled) return;
          setStatus(res.status === 'paid' ? 'success' : 'error');
          if (res.status !== 'paid') setErrorMsg(t('payment.success.error'));
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(t('payment.success.error'));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user, orderId, sessionId, t]);

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      <main className="flex-grow p-6 relative w-full">
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000" />
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-8">
              {status === 'loading' && (
                <>
                  <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-tech-cyan font-mono text-sm">{t('payment.success.verifying')}</p>
                </>
              )}
              {status === 'success' && (
                <>
                  <div className="text-5xl mb-4">✓</div>
                  <h1 className="text-2xl font-black text-white mb-2">{t('payment.success.title')}</h1>
                  <p className="text-gray-400 font-mono text-sm mb-8">{t('payment.success.subtitle')}</p>
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
              {status === 'error' && (
                <>
                  <div className="text-5xl mb-4 text-amber-400">!</div>
                  <h1 className="text-xl font-black text-white mb-2">{t('payment.success.verifyFailedTitle')}</h1>
                  <p className="text-gray-400 font-mono text-sm mb-6">{errorMsg ?? t('payment.success.error')}</p>
                  <Link
                    href="/pricing"
                    className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-3 transition-all"
                  >
                    {t('payment.success.backToPricing')}
                  </Link>
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

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col font-sans">
          <Header />
          <main className="flex-grow flex items-center justify-center p-6">
            <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin" />
          </main>
          <Footer />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
