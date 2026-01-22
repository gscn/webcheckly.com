'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getSubscriptionsList,
  updateSubscription,
  type AdminSubscription,
  type AdminSubscriptionListResponse,
} from '@/services/adminService';
import IdDisplay from '@/components/admin/IdDisplay';

export default function AdminSubscriptionsPage() {
  const { t } = useLanguage();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, [page, statusFilter, planTypeFilter]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (planTypeFilter) filters.plan_type = planTypeFilter;
      const data: AdminSubscriptionListResponse = await getSubscriptionsList(page, pageSize, filters);
      setSubscriptions(data.subscriptions);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
    try {
      await updateSubscription(subscriptionId, { status: newStatus });
      await loadSubscriptions();
    } catch (err: any) {
      alert(err.message || t('admin.errors.updateFailed'));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
          {t('admin.subscriptions.title')}
        </h1>
        <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
          SUBSCRIPTION_MANAGEMENT_SYSTEM
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
        >
          <option value="">{t('admin.subscriptions.allStatuses')}</option>
          <option value="active">{t('admin.subscriptions.active')}</option>
          <option value="canceled">{t('admin.subscriptions.canceled')}</option>
          <option value="expired">{t('admin.subscriptions.expired')}</option>
          <option value="pending">{t('admin.subscriptions.pending')}</option>
        </select>
        <select
          value={planTypeFilter}
          onChange={(e) => {
            setPlanTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
        >
          <option value="">{t('admin.subscriptions.allPlans')}</option>
          <option value="basic">{t('admin.subscriptions.basic')}</option>
          <option value="pro">{t('admin.subscriptions.pro')}</option>
          <option value="enterprise">{t('admin.subscriptions.enterprise')}</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-tech-cyan font-mono text-sm">{t('admin.loading')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative group mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-tech-border/30">
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.subscriptions.userId')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.subscriptions.planType')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.subscriptions.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.subscriptions.expiresAt')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.subscriptions.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-tech-border/20 hover:bg-tech-surface/30">
                      <td className="px-4 py-3">
                        <IdDisplay id={sub.id} />
                      </td>
                      <td className="px-4 py-3">
                        <IdDisplay id={sub.user_id} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-sm uppercase">{sub.plan_type}</td>
                      <td className="px-4 py-3">
                        <select
                          value={sub.status}
                          onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                          className="bg-tech-surface/50 border border-tech-border/30 rounded px-2 py-1 text-tech-cyan font-mono text-xs focus:outline-none focus:border-tech-cyan"
                        >
                          <option value="active">{t('admin.subscriptions.active')}</option>
                          <option value="canceled">{t('admin.subscriptions.canceled')}</option>
                          <option value="expired">{t('admin.subscriptions.expired')}</option>
                          <option value="pending">{t('admin.subscriptions.pending')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {new Date(sub.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 font-mono text-xs">
                          {sub.auto_renew ? t('admin.subscriptions.autoRenew') : t('admin.subscriptions.manual')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-tech-cyan/70 font-mono text-sm">
              {t('admin.subscriptions.pageInfo', { page, totalPages })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-tech-cyan font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-tech-cyan transition-all"
              >
                {t('admin.subscriptions.previous')}
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-tech-cyan font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-tech-cyan transition-all"
              >
                {t('admin.subscriptions.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

