'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PaymentCancelPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      <main className="flex-grow p-6 relative w-full">
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000" />
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-8">
              <div className="text-5xl mb-4 text-amber-400">○</div>
              <h1 className="text-2xl font-black text-white mb-2">{t('payment.cancel.title')}</h1>
              <p className="text-gray-400 font-mono text-sm mb-8">{t('payment.cancel.subtitle')}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-3 transition-all"
                >
                  {t('payment.cancel.backToPricing')}
                </Link>
                <Link
                  href="/pricing"
                  className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 text-tech-cyan font-mono text-sm px-6 py-3 transition-all"
                >
                  {t('payment.cancel.retry')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
