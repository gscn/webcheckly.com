'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getRevenueOrders,
  getRevenueStatistics,
  exportRevenueOrders,
  type RevenueOrder,
  type RevenueStatistics,
  type RevenueFilters,
} from '@/services/revenueService';
import StatCard from '@/components/admin/StatCard';

export default function AdminRevenuePage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<RevenueOrder[]>([]);
  const [statistics, setStatistics] = useState<RevenueStatistics | null>(null);
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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderType, setOrderType] = useState('');
  const [status, setStatus] = useState('paid'); // 默认只显示已支付订单
  const [exporting, setExporting] = useState(false);

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
      const filters: RevenueFilters = {
        ...(dateRangeValue.start && { start_date: dateRangeValue.start }),
        ...(dateRangeValue.end && { end_date: dateRangeValue.end }),
        ...(paymentMethod && { payment_method: paymentMethod }),
        ...(orderType && { order_type: orderType }),
        ...(status && { status: status }),
      };

      // 并行加载订单列表和统计信息
      const [ordersData, statsData] = await Promise.all([
        getRevenueOrders(page, pageSize, filters),
        getRevenueStatistics(filters),
      ]);

      setOrders(ordersData.orders || []);
      setTotal(ordersData.total || 0);
      setTotalPages(ordersData.total_pages || 1);
      setStatistics(statsData);
    } catch (err: any) {
      console.error('Failed to load revenue data:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, paymentMethod, orderType, status, t, getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      const dateRangeValue = getDateRange();
      const filters: RevenueFilters = {
        ...(dateRangeValue.start && { start_date: dateRangeValue.start }),
        ...(dateRangeValue.end && { end_date: dateRangeValue.end }),
        ...(paymentMethod && { payment_method: paymentMethod }),
        ...(orderType && { order_type: orderType }),
        ...(status && { status: status }),
      };

      const blob = await exportRevenueOrders(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue_orders_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || t('admin.revenue.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatOrderType = (type: string) => {
    const typeMap: Record<string, string> = {
      credits_purchase: t('admin.revenue.orderType.credits'),
      subscription: t('admin.revenue.orderType.subscription'),
      single_scan: t('admin.revenue.orderType.singleScan'),
    };
    return typeMap[type] || type;
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      paid: t('admin.revenue.status.paid'),
      pending: t('admin.revenue.status.pending'),
      failed: t('admin.revenue.status.failed'),
      refunded: t('admin.revenue.status.refunded'),
      canceled: t('admin.revenue.status.canceled'),
    };
    return statusMap[status] || status;
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-tech-cyan font-mono mb-2 uppercase tracking-wider">
          {t('admin.revenue.title')}
        </h1>
        <p className="text-tech-cyan/70 font-mono text-xs">
          REVENUE_RECONCILIATION_SYSTEM
        </p>
      </div>

      {/* 筛选器 */}
      <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 时间范围 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.revenue.filters.dateRange')}</label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="today">{t('admin.revenue.filters.today')}</option>
              <option value="week">{t('admin.revenue.filters.week')}</option>
              <option value="month">{t('admin.revenue.filters.month')}</option>
              <option value="year">{t('admin.revenue.filters.year')}</option>
              <option value="custom">{t('admin.revenue.filters.custom')}</option>
            </select>
          </div>

          {/* 自定义日期范围 */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.revenue.filters.startDate')}</label>
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
                <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.revenue.filters.endDate')}</label>
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

          {/* 支付方式 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.revenue.filters.paymentMethod')}</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="">{t('admin.revenue.filters.all')}</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          {/* 订单类型 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.revenue.filters.orderType')}</label>
            <select
              value={orderType}
              onChange={(e) => {
                setOrderType(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="">{t('admin.revenue.filters.all')}</option>
              <option value="credits_purchase">{t('admin.revenue.orderType.credits')}</option>
              <option value="subscription">{t('admin.revenue.orderType.subscription')}</option>
              <option value="single_scan">{t('admin.revenue.orderType.singleScan')}</option>
            </select>
          </div>

          {/* 订单状态 */}
          <div>
            <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.revenue.filters.status')}</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
            >
              <option value="">{t('admin.revenue.filters.all')}</option>
              <option value="paid">{t('admin.revenue.status.paid')}</option>
              <option value="pending">{t('admin.revenue.status.pending')}</option>
              <option value="failed">{t('admin.revenue.status.failed')}</option>
              <option value="refunded">{t('admin.revenue.status.refunded')}</option>
              <option value="canceled">{t('admin.revenue.status.canceled')}</option>
            </select>
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-4 py-2 bg-green-500/20 border border-green-500/60 rounded-lg text-green-400 font-mono text-sm font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
          >
            {exporting ? t('admin.revenue.exporting') : t('admin.revenue.exportCSV')}
          </button>
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
            title={t('admin.revenue.statistics.totalRevenue')}
            value={formatCurrency(statistics.total_revenue)}
            icon="💰"
          />
          <StatCard
            title={t('admin.revenue.statistics.totalOrders')}
            value={statistics.total_orders.toString()}
            icon="📋"
          />
          <StatCard
            title={t('admin.revenue.statistics.averageOrder')}
            value={formatCurrency(statistics.average_order_amount)}
            icon="📊"
          />
          <StatCard
            title={t('admin.revenue.statistics.refundedAmount')}
            value={formatCurrency(statistics.refunded_amount)}
            icon="↩️"
          />
        </div>
      )}

      {/* 按支付方式统计 */}
      {statistics && Object.keys(statistics.by_payment_method).length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg p-4">
            <h3 className="text-tech-cyan font-mono font-bold mb-3">{t('admin.revenue.statistics.byPaymentMethod')}</h3>
            <div className="space-y-2">
              {Object.entries(statistics.by_payment_method).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-gray-300 font-mono text-sm">
                  <span className="uppercase">{method}</span>
                  <span className="text-tech-cyan font-bold">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 按订单类型统计 */}
          <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg p-4">
            <h3 className="text-tech-cyan font-mono font-bold mb-3">{t('admin.revenue.statistics.byOrderType')}</h3>
            <div className="space-y-2">
              {Object.entries(statistics.by_order_type).map(([type, amount]) => (
                <div key={type} className="flex justify-between text-gray-300 font-mono text-sm">
                  <span>{formatOrderType(type)}</span>
                  <span className="text-tech-cyan font-bold">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 订单列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('admin.revenue.noOrders')}</div>
      ) : (
        <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-tech-border/40 flex justify-between items-center">
            <span className="text-tech-cyan font-mono text-sm font-bold">
              {t('admin.revenue.totalOrders')}: {total}
            </span>
          </div>
          <table className="w-full">
            <thead className="bg-tech-surface/80 border-b border-tech-border/40">
              <tr>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.orderId')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.userEmail')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.orderType')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.amount')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.paymentMethod')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.status')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.createdAt')}</th>
                <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.revenue.table.paidAt')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-tech-border/20 hover:bg-tech-surface/30">
                  <td className="px-6 py-4 text-gray-300 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">{order.user_email || '-'}</td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">{formatOrderType(order.order_type)}</td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm font-bold text-tech-cyan">
                    {formatCurrency(order.amount)}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm uppercase">{order.payment_method}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full font-mono text-xs font-bold ${
                        order.status === 'paid'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/60'
                          : order.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/60'
                          : order.status === 'failed'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/60'
                          : order.status === 'refunded'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/60'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/60'
                      }`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                    {order.paid_at ? new Date(order.paid_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            {t('admin.revenue.previous')}
          </button>
          <span className="px-4 py-2 text-gray-300 font-mono">
            {t('admin.revenue.page', { page, totalPages })}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-tech-surface border border-tech-border/40 rounded-lg text-tech-cyan font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tech-surface/80"
          >
            {t('admin.revenue.next')}
          </button>
        </div>
      )}
    </div>
  );
}
