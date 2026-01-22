'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  adjustUserCredits,
  getCreditsRecords,
  getCreditsStatistics,
  type CreditsRecord,
  type CreditsStatistics,
  type CreditsFilters,
} from '@/services/adminService';
import StatCard from '@/components/admin/StatCard';

export default function AdminCreditsPage() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<CreditsRecord[]>([]);
  const [statistics, setStatistics] = useState<CreditsStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 筛选器
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [featureType, setFeatureType] = useState('');
  const [isFree, setIsFree] = useState('');
  const [isRefunded, setIsRefunded] = useState('');
  
  // 调整积分表单
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      case 'custom':
        if (startDate) {
          start = new Date(startDate + 'T00:00:00');
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        }
        if (endDate) {
          end = new Date(endDate + 'T23:59:59');
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [dateRange, startDate, endDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dateRangeValue = getDateRange();
      const filters: CreditsFilters = {
        ...(dateRangeValue.start && { start_date: dateRangeValue.start }),
        ...(dateRangeValue.end && { end_date: dateRangeValue.end }),
        ...(userId && { user_id: userId }),
        ...(featureType && { feature_type: featureType }),
        ...(isFree && { is_free: isFree }),
        ...(isRefunded && { is_refunded: isRefunded }),
      };

      // 并行加载记录列表和统计信息
      const [recordsData, statsData] = await Promise.all([
        getCreditsRecords(page, pageSize, filters),
        getCreditsStatistics(filters),
      ]);

      setRecords(recordsData.records);
      setTotal(recordsData.total);
      setTotalPages(recordsData.total_pages);
      setStatistics(statsData);
    } catch (err: any) {
      console.error('Failed to load credits data:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, userId, featureType, isFree, isRefunded, t, getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount || !adjustReason) {
      setAdjustError(t('admin.credits.fillAllFields'));
      return;
    }

    const amountNum = parseInt(adjustAmount);
    if (isNaN(amountNum) || amountNum === 0) {
      setAdjustError(t('admin.credits.invalidAmount'));
      return;
    }

    try {
      setAdjustLoading(true);
      setAdjustError(null);
      setAdjustSuccess(false);
      await adjustUserCredits(adjustUserId, amountNum, adjustReason);
      setAdjustSuccess(true);
      setAdjustUserId('');
      setAdjustAmount('');
      setAdjustReason('');
      // 重新加载数据
      await loadData();
    } catch (err: any) {
      console.error('Failed to adjust credits:', err);
      setAdjustError(err.message || t('admin.errors.adjustFailed'));
    } finally {
      setAdjustLoading(false);
    }
  };

  const formatFeatureType = (type: string) => {
    const typeMap: Record<string, string> = {
      'link-health': t('admin.credits.featureType.linkHealth'),
      'website-info': t('admin.credits.featureType.websiteInfo'),
      'domain-info': t('admin.credits.featureType.domainInfo'),
      'ssl-info': t('admin.credits.featureType.sslInfo'),
      'tech-stack': t('admin.credits.featureType.techStack'),
      'ai-analysis': t('admin.credits.featureType.aiAnalysis'),
      'performance': t('admin.credits.featureType.performance'),
      'seo': t('admin.credits.featureType.seo'),
      'security': t('admin.credits.featureType.security'),
      'accessibility': t('admin.credits.featureType.accessibility'),
      'deep-scan': t('admin.credits.featureType.deepScan'),
    };
    return typeMap[type] || type;
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-tech-cyan font-mono mb-2 uppercase tracking-wider">
            {t('admin.credits.title')}
          </h1>
          <p className="text-tech-cyan/70 font-mono text-xs">
            CREDITS_MANAGEMENT_SYSTEM
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-tech-cyan/20 border border-tech-cyan/60 rounded-lg text-tech-cyan font-mono text-sm font-bold hover:bg-tech-cyan/30 transition-all disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('admin.refresh')}
          </button>
          <button
            onClick={() => setShowAdjustForm(!showAdjustForm)}
            className="px-4 py-2 bg-tech-cyan/20 border border-tech-cyan/60 rounded-lg text-tech-cyan font-mono text-sm font-bold hover:bg-tech-cyan/30 transition-all"
          >
            {showAdjustForm ? t('admin.credits.hideAdjust') : t('admin.credits.adjustCredits')}
          </button>
        </div>
      </div>

      {/* 调整积分表单 */}
      {showAdjustForm && (
        <div className="mb-6 bg-tech-surface/50 border border-tech-border/40 rounded-lg p-6">
          <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase mb-4">
            {t('admin.credits.adjustCredits')}
          </h2>

          {adjustError && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm mb-4">
              {adjustError}
            </div>
          )}

          {adjustSuccess && (
            <div className="bg-green-950/40 border border-green-500/40 rounded-lg p-4 text-green-400 font-mono text-sm mb-4">
              {t('admin.credits.adjustSuccess')}
            </div>
          )}

          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.userId')}</label>
                <input
                  type="text"
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  placeholder={t('admin.credits.userIdPlaceholder')}
                  className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.amount')}</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder={t('admin.credits.amountPlaceholder')}
                  className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                  required
                />
                <p className="text-tech-cyan/50 font-mono text-xs mt-1">
                  {t('admin.credits.amountHint')}
                </p>
              </div>

              <div>
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.reason')}</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={t('admin.credits.reasonPlaceholder')}
                  className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adjustLoading}
              className="px-4 py-2 bg-tech-cyan/20 border border-tech-cyan/60 rounded-lg text-tech-cyan font-mono text-sm font-bold hover:bg-tech-cyan/30 transition-all disabled:opacity-50"
            >
              {adjustLoading ? t('admin.credits.adjusting') : t('admin.credits.submit')}
            </button>
          </form>
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 时间范围 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.dateRange')}</label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="today">{t('admin.credits.filters.today')}</option>
              <option value="week">{t('admin.credits.filters.week')}</option>
              <option value="month">{t('admin.credits.filters.month')}</option>
              <option value="year">{t('admin.credits.filters.year')}</option>
              <option value="custom">{t('admin.credits.filters.custom')}</option>
            </select>
          </div>

          {/* 自定义日期范围 */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.startDate')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.endDate')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                />
              </div>
            </>
          )}

          {/* 用户ID */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.userId')}</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
              placeholder={t('admin.credits.filters.userIdPlaceholder')}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            />
          </div>

          {/* 功能类型 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.featureType')}</label>
            <select
              value={featureType}
              onChange={(e) => {
                setFeatureType(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="">{t('admin.credits.filters.all')}</option>
              <option value="link-health">{t('admin.credits.featureType.linkHealth')}</option>
              <option value="website-info">{t('admin.credits.featureType.websiteInfo')}</option>
              <option value="domain-info">{t('admin.credits.featureType.domainInfo')}</option>
              <option value="ssl-info">{t('admin.credits.featureType.sslInfo')}</option>
              <option value="tech-stack">{t('admin.credits.featureType.techStack')}</option>
              <option value="ai-analysis">{t('admin.credits.featureType.aiAnalysis')}</option>
              <option value="performance">{t('admin.credits.featureType.performance')}</option>
              <option value="seo">{t('admin.credits.featureType.seo')}</option>
              <option value="security">{t('admin.credits.featureType.security')}</option>
              <option value="accessibility">{t('admin.credits.featureType.accessibility')}</option>
              <option value="deep-scan">{t('admin.credits.featureType.deepScan')}</option>
            </select>
          </div>

          {/* 是否免费 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.isFree')}</label>
            <select
              value={isFree}
              onChange={(e) => {
                setIsFree(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="">{t('admin.credits.filters.all')}</option>
              <option value="true">{t('admin.credits.filters.yes')}</option>
              <option value="false">{t('admin.credits.filters.no')}</option>
            </select>
          </div>

          {/* 是否退款 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.credits.filters.isRefunded')}</label>
            <select
              value={isRefunded}
              onChange={(e) => {
                setIsRefunded(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="">{t('admin.credits.filters.all')}</option>
              <option value="true">{t('admin.credits.filters.yes')}</option>
              <option value="false">{t('admin.credits.filters.no')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/60 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* 统计卡片 */}
      {statistics && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title={t('admin.credits.statistics.totalRecords')}
            value={statistics.total_records}
            icon="📋"
          />
          <StatCard
            title={t('admin.credits.statistics.totalCreditsUsed')}
            value={statistics.total_credits_used}
            icon="💰"
          />
          <StatCard
            title={t('admin.credits.statistics.totalUsers')}
            value={statistics.total_users}
            icon="👥"
          />
          <StatCard
            title={t('admin.credits.statistics.refundedRecords')}
            value={statistics.refunded_records}
            icon="↩️"
          />
        </div>
      )}

      {/* 按功能类型统计 */}
      {statistics && Object.keys(statistics.by_feature_type).length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg p-4">
            <h3 className="text-tech-cyan font-mono font-bold mb-3">{t('admin.credits.statistics.byFeatureType')}</h3>
            <div className="space-y-2">
              {Object.entries(statistics.by_feature_type).map(([type, count]) => (
                <div key={type} className="flex justify-between text-gray-300 font-mono text-sm">
                  <span>{formatFeatureType(type)}</span>
                  <span className="text-tech-cyan font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 按用户统计（前10名） */}
          {Object.keys(statistics.by_user).length > 0 && (
            <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg p-4">
              <h3 className="text-tech-cyan font-mono font-bold mb-3">{t('admin.credits.statistics.topUsers')}</h3>
              <div className="space-y-2">
                {Object.entries(statistics.by_user)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([userKey, credits]) => (
                    <div key={userKey} className="flex justify-between text-gray-300 font-mono text-sm">
                      <span className="text-xs">
                        {userKey.includes('@') ? userKey : `${userKey.substring(0, 8)}...`}
                      </span>
                      <span className="text-tech-cyan font-bold">{credits}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 记录列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('admin.credits.noRecords')}</div>
      ) : (
        <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-tech-border/40 flex justify-between items-center">
            <span className="text-tech-cyan font-mono text-sm font-bold">
              {t('admin.credits.totalRecords')}: {total}
            </span>
            <span className="text-gray-400 font-mono text-xs">
              {t('admin.credits.page', { page, totalPages })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
            <thead className="bg-tech-surface/80 border-b border-tech-border/40">
              <tr>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.recordId')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.userEmail')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.taskId')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.featureType')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.creditsUsed')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.isFree')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.isRefunded')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.scanDate')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.credits.table.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-tech-border/20 hover:bg-tech-surface/30">
                  <td className="px-6 py-4 text-gray-300 font-mono text-xs">{record.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">{record.user_email || '-'}</td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                    {record.task_id ? (
                      <a
                        href={`/admin/tasks?search=${record.task_id}`}
                        className="text-tech-cyan hover:text-[#33f2ff] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {record.task_id.substring(0, 8)}...
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">{formatFeatureType(record.feature_type)}</td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm font-bold text-tech-cyan">
                    {record.credits_used}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full font-mono text-xs font-bold ${
                        record.is_free
                          ? 'bg-green-500/20 text-green-400 border border-green-500/60'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/60'
                      }`}
                    >
                      {record.is_free ? t('admin.credits.yes') : t('admin.credits.no')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full font-mono text-xs font-bold ${
                        record.is_refunded
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/60'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/60'
                      }`}
                    >
                      {record.is_refunded ? t('admin.credits.yes') : t('admin.credits.no')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                    {new Date(record.scan_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                    {new Date(record.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-tech-surface border border-tech-border/40 rounded-lg text-tech-cyan font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tech-surface/80"
          >
            {t('admin.credits.previous')}
          </button>
          <span className="px-4 py-2 text-gray-300 font-mono">
            {t('admin.credits.page', { page, totalPages })}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-tech-surface border border-tech-border/40 rounded-lg text-tech-cyan font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tech-surface/80"
          >
            {t('admin.credits.next')}
          </button>
        </div>
      )}
    </div>
  );
}
