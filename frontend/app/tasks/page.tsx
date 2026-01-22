'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authenticatedFetch } from '@/services/authService';
import { getUserSubscription, getSubscriptionPlans, type Subscription, type PricingPlan } from '@/services/pricingService';

interface Task {
  id: string;
  status: string;
  target_url: string;
  options: string[];
  created_at: string;
  completed_at?: string;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const limit = 20;

  const loadSubscriptionInfo = useCallback(async () => {
    try {
      const [sub, plansData] = await Promise.all([
        getUserSubscription(),
        getSubscriptionPlans(),
      ]);
      setSubscription(sub);
      setPlans(plansData);
    } catch (err) {
      console.error('Failed to load subscription info:', err);
    }
  }, []);

  const loadTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const offset = (page - 1) * limit;
      let url = `${API_BASE_URL}/api/tasks?limit=${limit}&offset=${offset}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      console.log('[TasksPage] Loading tasks from:', url);
      const response = await authenticatedFetch(url);
      
      console.log('[TasksPage] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('[TasksPage] Unauthorized, redirecting to login');
          router.push('/login?redirect=/tasks');
          return;
        }
        
        // 尝试解析错误响应
        let errorMessage = t('tasks.errors.loadFailed') || '加载任务失败，请刷新重试';
        try {
          const errorData = await response.json();
          console.error('[TasksPage] Error response:', errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.details) {
            errorMessage = `${errorMessage}: ${errorData.details}`;
          }
        } catch (e) {
          console.error('[TasksPage] Failed to parse error response:', e);
          // 如果无法解析JSON，使用状态码信息
          if (response.status === 500) {
            errorMessage = '服务器错误，请稍后重试';
          } else if (response.status === 403) {
            errorMessage = '无权访问任务列表';
          } else if (response.status === 404) {
            errorMessage = '接口不存在';
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('[TasksPage] Received data:', data);
      
      // 确保tasks是数组
      if (!Array.isArray(data.tasks)) {
        console.warn('[TasksPage] tasks is not an array:', data.tasks);
        setTasks([]);
      } else {
        setTasks(data.tasks);
      }
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('[TasksPage] Failed to load tasks:', err);
      setError(err.message || t('tasks.errors.loadFailed') || '加载任务失败，请刷新重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, statusFilter, searchQuery, t, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/tasks');
      return;
    }
    loadTasks();
    loadSubscriptionInfo();
  }, [user, authLoading, router, loadTasks, loadSubscriptionInfo]);

  const getRetentionPeriod = () => {
    if (!subscription || subscription.status !== 'active') {
      return { days: 24, unit: 'hours', text: '24小时' };
    }
    const plan = plans.find((p: PricingPlan) => p.plan_type === subscription.plan_type);
    if (!plan) {
      return { days: 24, unit: 'hours', text: '24小时' };
    }
    if (plan.task_history_days === -1) {
      return { days: -1, unit: 'permanent', text: '永久' };
    }
    return { days: plan.task_history_days, unit: 'days', text: `${plan.task_history_days}天` };
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-tech-cyan';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('tasks.statusCompleted');
      case 'failed':
        return t('tasks.statusFailed');
      case 'running':
        return t('tasks.statusRunning');
      case 'pending':
        return t('tasks.statusPending');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t('tasks.confirmDelete') || '确定要删除此任务吗？')) {
      return;
    }

    setDeletingTaskId(taskId);
    setError(null);
    try {
      console.log('[DeleteTask] Attempting to delete task:', taskId);
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/tasks/${taskId}`,
        { method: 'DELETE' }
      );
      
      console.log('[DeleteTask] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage = t('tasks.errors.deleteFailed') || '删除任务失败';
        let errorDetails = '';
        try {
          const errorData = await response.json();
          console.log('[DeleteTask] Error response:', errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.details) {
            errorDetails = errorData.details;
          }
        } catch (e) {
          console.error('[DeleteTask] Failed to parse error response:', e);
          // 如果无法解析JSON，使用状态码信息
          if (response.status === 401) {
            errorMessage = t('tasks.errors.unauthorized') || '未授权，请重新登录';
          } else if (response.status === 403) {
            errorMessage = '无权删除此任务';
          } else if (response.status === 404) {
            errorMessage = '任务不存在';
          } else if (response.status === 500) {
            errorMessage = '服务器错误，请稍后重试';
          }
        }
        const finalError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        throw new Error(finalError);
      }
      
      const result = await response.json();
      console.log('[DeleteTask] Success:', result);
      
      // 重新加载任务列表
      await loadTasks(true);
    } catch (err: any) {
      console.error('[DeleteTask] Failed to delete task:', err);
      setError(err.message || t('tasks.errors.deleteFailed') || '删除任务失败');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleSearch = () => {
    setPage(1); // 重置到第一页
    loadTasks();
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1); // 重置到第一页
  };

  const getOptionName = (option: string) => {
    const optionMap: Record<string, string> = {
      'link-health': '页面链接检查',
      'website-info': '网站信息',
      'domain-info': '域名信息',
      'ssl-info': 'SSL证书',
      'tech-stack': '技术栈',
      'performance': '性能检测',
      'seo': 'SEO检测',
      'security': '安全检测',
      'accessibility': '可访问性',
      'ai-analysis': 'AI分析',
      'deep-scan': '全站链接检查',
    };
    return optionMap[option] || option;
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
                <p className="text-tech-cyan font-mono text-sm">{t('tasks.loading')}</p>
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
                <p className="text-tech-cyan font-mono text-sm">{t('tasks.loading')}</p>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
                {t('tasks.title')}
              </h1>
              <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
                TASK_HISTORY_SYSTEM
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadTasks(true)}
                disabled={refreshing}
                className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all group overflow-hidden shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {refreshing ? t('tasks.loading') : t('tasks.refresh')}
                  {!refreshing && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </span>
                <div className="absolute inset-0 bg-tech-cyan/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
              <Link
                href="/"
                className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)]"
              >
                {t('tasks.createNewTask')}
              </Link>
            </div>
          </div>

          {/* 任务保留期限提示 */}
          {user && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/20 to-tech-blue/20 rounded-lg blur opacity-20"></div>
              <div className="relative bg-tech-bg/60 backdrop-blur-xl border border-tech-border/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                  <span className="text-tech-cyan">ℹ️</span>
                  <span>
                    {t('tasks.retentionInfo') || '任务历史保留期限'}：
                    <span className="text-tech-cyan ml-1">{getRetentionPeriod().text}</span>
                    {subscription && subscription.status === 'active' && (
                      <span className="text-gray-500 ml-2">
                        ({t('tasks.currentPlan') || '当前套餐'}：{subscription.plan_type === 'basic' ? t('pricing.features.taskHistoryDays', { days: 30 }) : subscription.plan_type === 'pro' ? t('pricing.features.taskHistoryDays', { days: 90 }) : t('pricing.features.taskHistoryPermanent')})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 筛选和搜索 */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* 状态筛选 */}
                <div>
                  <label className="block text-sm text-gray-300 font-mono mb-2">
                    {t('tasks.filterByStatus') || '按状态筛选'}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="w-full px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded text-white font-mono focus:outline-none focus:border-tech-cyan"
                  >
                    <option value="">{t('tasks.allStatuses') || '全部状态'}</option>
                    <option value="pending">{t('tasks.statusPending')}</option>
                    <option value="running">{t('tasks.statusRunning')}</option>
                    <option value="completed">{t('tasks.statusCompleted')}</option>
                    <option value="failed">{t('tasks.statusFailed')}</option>
                  </select>
                </div>
                {/* 搜索 */}
                <div>
                  <label className="block text-sm text-gray-300 font-mono mb-2">
                    {t('tasks.searchUrl') || '搜索URL'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder={t('tasks.searchPlaceholder') || '输入URL关键词...'}
                      className="flex-1 px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded text-white font-mono focus:outline-none focus:border-tech-cyan"
                    />
                    <button
                      onClick={handleSearch}
                      className="clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-4 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)]"
                    >
                      {t('tasks.search') || '搜索'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm mb-6 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="text-red-400 mr-2">⚠</span> {error}
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
                {/* Decorative Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

                <div className="p-12 text-center relative z-10">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-400 font-mono text-lg mb-6">{t('tasks.noTasks')}</p>
                  <Link
                    href="/"
                    className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)]"
                  >
                    {t('tasks.createNewTask')}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tasks Table */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel overflow-hidden">
                  {/* Decorative Corner Markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50 z-10"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50 z-10"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50 z-10"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50 z-10"></div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-tech-border/30">
                      <thead className="bg-tech-surface/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.taskId')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.targetUrl')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.options') || '检测项'}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.status')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.createdAt')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.completedAt')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-tech-bg/40 divide-y divide-tech-border/20">
                        {tasks.map((task: Task) => (
                          <tr key={task.id} className="hover:bg-tech-surface/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-mono text-tech-cyan/80">
                                {task.id.substring(0, 8)}...
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-300 max-w-md truncate" title={task.target_url}>
                                {task.target_url}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {task.options && task.options.length > 0 ? (
                                  task.options.slice(0, 3).map((opt: string) => (
                                    <span
                                      key={opt}
                                      className="text-xs px-2 py-0.5 bg-tech-cyan/20 text-tech-cyan rounded font-mono"
                                    >
                                      {getOptionName(opt)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-500 font-mono">-</span>
                                )}
                                {task.options && task.options.length > 3 && (
                                  <span className="text-xs text-gray-500 font-mono">
                                    +{task.options.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-bold font-mono ${getStatusColor(task.status)}`}>
                                {getStatusText(task.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-400 font-mono">
                                {formatDate(task.created_at)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {task.completed_at ? (
                                <span className="text-sm text-gray-400 font-mono">
                                  {formatDate(task.completed_at)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-600 font-mono">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Link
                                  href={`/scan?taskId=${task.id}`}
                                  className="text-tech-cyan hover:text-[#33f2ff] font-mono text-sm font-bold transition-colors underline decoration-tech-cyan/50 hover:decoration-tech-cyan"
                                >
                                  {t('tasks.viewDetails')}
                                </Link>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={deletingTaskId === task.id}
                                  className="text-red-400 hover:text-red-300 font-mono text-sm font-bold transition-colors disabled:opacity-50"
                                  title={t('tasks.delete') || '删除'}
                                >
                                  {deletingTaskId === task.id ? '...' : '×'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('tasks.previousPage')}
                  </button>
                  <span className="text-tech-cyan font-mono text-sm">
                    {t('tasks.page', { page, total: Math.ceil(total / limit) })}
                  </span>
                  <button
                    onClick={() => setPage((p: number) => p + 1)}
                    disabled={page >= Math.ceil(total / limit)}
                    className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('tasks.nextPage')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
