'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getTasksList,
  deleteTask,
  type AdminTask,
  type AdminTaskListResponse,
} from '@/services/adminService';
import IdDisplay from '@/components/admin/IdDisplay';

export default function AdminTasksPage() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  useEffect(() => {
    loadTasks();
  }, [page, statusFilter, userIdFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (userIdFilter) filters.user_id = userIdFilter;
      const data: AdminTaskListResponse = await getTasksList(page, pageSize, filters);
      setTasks(data.tasks);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm(t('admin.tasks.confirmDelete'))) {
      return;
    }
    try {
      await deleteTask(taskId);
      await loadTasks();
    } catch (err: any) {
      alert(err.message || t('admin.errors.deleteFailed'));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
          {t('admin.tasks.title')}
        </h1>
        <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
          TASK_MANAGEMENT_SYSTEM
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex gap-4">
        <select
          title={t('admin.tasks.status')}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
        >
          <option value="">{t('admin.tasks.allStatuses')}</option>
          <option value="pending">{t('admin.tasks.pending')}</option>
          <option value="running">{t('admin.tasks.running')}</option>
          <option value="completed">{t('admin.tasks.completed')}</option>
          <option value="failed">{t('admin.tasks.failed')}</option>
        </select>
        <input
          type="text"
          placeholder={t('admin.tasks.userIdPlaceholder')}
          value={userIdFilter}
          onChange={(e) => {
            setUserIdFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
        />
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
                      {t('admin.tasks.id')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.tasks.url')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.tasks.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.tasks.userId')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.tasks.createdAt')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.tasks.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks?.map((task) => (
                    <tr key={task.id} className="border-b border-tech-border/20 hover:bg-tech-surface/30">
                      <td className="px-4 py-3">
                        <IdDisplay id={task.id} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-sm max-w-xs truncate" title={task.target_url}>
                        {task.target_url}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-mono ${
                            task.status === 'completed'
                              ? 'bg-green-950/40 text-green-400 border border-green-500/40'
                              : task.status === 'failed'
                              ? 'bg-red-950/40 text-red-400 border border-red-500/40'
                              : task.status === 'running'
                              ? 'bg-blue-950/40 text-blue-400 border border-blue-500/40'
                              : 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/40'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {task.user_id ? <IdDisplay id={task.user_id} /> : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="px-3 py-1 bg-red-950/40 hover:bg-red-950/60 border border-red-500/40 text-red-400 font-mono text-xs rounded transition-all"
                        >
                          {t('admin.tasks.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-tech-cyan/70 font-mono text-sm">
              {t('admin.tasks.pageInfo', { page, totalPages })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-tech-cyan font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-tech-cyan transition-all"
              >
                {t('admin.tasks.previous')}
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-tech-cyan font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-tech-cyan transition-all"
              >
                {t('admin.tasks.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

