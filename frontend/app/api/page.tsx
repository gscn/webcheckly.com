'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApiTokenCard from '@/components/api/ApiTokenCard';
import ApiStatsCard from '@/components/api/ApiStatsCard';
import ApiRecordsTable from '@/components/api/ApiRecordsTable';
import ApiDocsCard from '@/components/api/ApiDocsCard';
import { getAPIAccessStats, type APIAccessStats } from '@/services/apiAccessService';
import { getUserSubscription } from '@/services/pricingService';

export default function ApiPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<APIAccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/api');
      return;
    }
    checkAccessAndLoadData();
  }, [user, authLoading, router]);

  const checkAccessAndLoadData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 检查用户是否有API访问权限
      const subscription = await getUserSubscription();
      if (subscription && subscription.status === 'active') {
        const planType = subscription.plan_type;
        if (planType === 'pro' || planType === 'enterprise') {
          setHasAccess(true);
          // 加载API统计
          const statsData = await getAPIAccessStats();
          setStats(statsData);
        } else {
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
    } catch (err: any) {
      console.error('Failed to load API data:', err);
      setError(err.message || t('api.errors.loadFailed'));
    } finally {
      setLoading(false);
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
                <p className="text-tech-cyan font-mono text-sm">{t('api.loading')}</p>
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
                <p className="text-tech-cyan font-mono text-sm">{t('api.loading')}</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
        <Header />
        <main className="flex-grow p-6 relative w-full">
          <div className="max-w-7xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-8 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-tech-cyan font-mono mb-4">
                  {t('api.noAccess.title')}
                </h2>
                <p className="text-gray-300 font-mono text-sm mb-6">
                  {t('api.noAccess.description')}
                </p>
                <a
                  href="/pricing"
                  className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                >
                  {t('api.noAccess.upgrade')}
                </a>
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

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">
              {t('api.title')}
            </h1>
            <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
              {t('api.subtitle')}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="text-red-400 mr-2">⚠</span> {error}
            </div>
          )}

          {/* API 令牌 */}
          <ApiTokenCard />

          {/* API统计卡片 */}
          {stats && <ApiStatsCard stats={stats} />}

          {/* API访问记录 */}
          <ApiRecordsTable limit={10} />

          {/* API使用文档 */}
          <ApiDocsCard />
        </div>
      </main>

      <Footer />
    </div>
  );
}
