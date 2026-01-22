'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSystemStatistics, type SystemStatistics } from '@/services/adminService';
import StatCard from '@/components/admin/StatCard';

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<SystemStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemStatistics();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-tech-cyan font-mono text-sm">{t('admin.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-6 text-center">
        <p className="text-red-400 font-mono mb-4">{error}</p>
        <button
          onClick={loadStatistics}
          className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)]"
        >
          {t('admin.refresh')}
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
          {t('admin.dashboard.title')}
        </h1>
        <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
          ADMIN_DASHBOARD_SYSTEM
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t('admin.dashboard.totalUsers')}
          value={stats.total_users}
          icon="👥"
        />
        <StatCard
          title={t('admin.dashboard.activeUsers')}
          value={stats.active_users}
          icon="✅"
        />
        <StatCard
          title={t('admin.dashboard.totalTasks')}
          value={stats.total_tasks}
          icon="📋"
        />
        <StatCard
          title={t('admin.dashboard.completedTasks')}
          value={stats.completed_tasks}
          icon="✓"
        />
        <StatCard
          title={t('admin.dashboard.totalSubscriptions')}
          value={stats.total_subscriptions}
          icon="💳"
        />
        <StatCard
          title={t('admin.dashboard.activeSubscriptions')}
          value={stats.active_subscriptions}
          icon="🟢"
        />
        <StatCard
          title={t('admin.dashboard.totalCredits')}
          value={stats.total_credits}
          icon="💰"
        />
        <StatCard
          title={t('admin.dashboard.totalRevenue')}
          value={`$${stats.total_revenue.toFixed(2)}`}
          icon="💵"
        />
      </div>

      {/* 任务统计 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-6">
            <h3 className="text-xl font-bold text-tech-cyan font-mono uppercase mb-4">
              {t('admin.dashboard.taskStatistics')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.pending')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.task_statistics.pending}
                </div>
              </div>
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.running')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.task_statistics.running}
                </div>
              </div>
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.completed')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.task_statistics.completed}
                </div>
              </div>
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.failed')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.task_statistics.failed}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 订阅统计 */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-6">
            <h3 className="text-xl font-bold text-tech-cyan font-mono uppercase mb-4">
              {t('admin.dashboard.subscriptionStatistics')}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.basic')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.subscription_statistics.basic}
                </div>
              </div>
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.pro')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.subscription_statistics.pro}
                </div>
              </div>
              <div>
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                  {t('admin.dashboard.enterprise')}
                </div>
                <div className="text-2xl font-bold text-tech-cyan">
                  {stats.subscription_statistics.enterprise}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

