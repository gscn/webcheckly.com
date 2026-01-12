'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authenticatedFetch } from '@/services/authService';

interface Task {
  id: string;
  status: string;
  target_url: string;
  options: string[];
  created_at: string;
  completed_at?: string;
  error?: string;
}

export default function TasksPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const offset = (page - 1) * limit;
      const response = await authenticatedFetch(
        `/api/tasks?limit=${limit}&offset=${offset}`
      );
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?redirect=/tasks');
          return;
        }
        throw new Error(t('tasks.errors.loadFailed'));
      }
      const data = await response.json();
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.message || t('tasks.errors.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, t, router]);

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/tasks');
      return;
    }
    loadTasks();
  }, [user, page, router, loadTasks]);

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
                            {t('tasks.status')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.createdAt')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                            {t('tasks.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-tech-bg/40 divide-y divide-tech-border/20">
                        {tasks.map((task) => (
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
                              <Link
                                href={`/scan?taskId=${task.id}`}
                                className="text-tech-cyan hover:text-[#33f2ff] font-mono text-sm font-bold transition-colors underline decoration-tech-cyan/50 hover:decoration-tech-cyan"
                              >
                                {t('tasks.viewDetails')}
                              </Link>
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('tasks.previousPage')}
                  </button>
                  <span className="text-tech-cyan font-mono text-sm">
                    {t('tasks.page', { page, total: Math.ceil(total / limit) })}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
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
