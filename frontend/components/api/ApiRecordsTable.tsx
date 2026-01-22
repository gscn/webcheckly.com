'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAPIAccessRecords, type APIAccessRecord } from '@/services/apiAccessService';

interface ApiRecordsTableProps {
  limit?: number;
}

export default function ApiRecordsTable({ limit = 20 }: ApiRecordsTableProps) {
  const { t, locale } = useLanguage();
  const [records, setRecords] = useState<APIAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const data = await getAPIAccessRecords(limit, offset);
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Failed to load API records:', err);
      setError(err.message || t('api.records.loadFailed'));
      setRecords([]); // 确保 records 始终是数组
    } finally {
      setLoading(false);
    }
  }, [page, limit, t]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(
      locale === 'en' ? 'en-US' : 'zh-CN',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }
    );
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'text-gray-400';
    if (statusCode >= 200 && statusCode < 300) return 'text-green-400';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-400';
    if (statusCode >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  // 确保 records 始终是数组
  const safeRecords = Array.isArray(records) ? records : [];

  if (loading && safeRecords.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-tech-cyan font-mono text-sm">{t('api.records.loading')}</p>
      </div>
    );
  }

  if (error && safeRecords.length === 0) {
    return (
      <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm">
        <span className="text-red-400 mr-2">⚠</span> {error}
      </div>
    );
  }

  if (safeRecords.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 font-mono text-sm">
        {t('api.records.noRecords')}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
      <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel overflow-hidden">
        {/* Decorative Corner Markers */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50 z-10"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50 z-10"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50 z-10"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50 z-10"></div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
            <h3 className="text-lg font-bold text-tech-cyan font-mono uppercase tracking-wider">
              {t('api.records.title')}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-tech-border/30">
              <thead className="bg-tech-surface/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                    {t('api.records.endpoint')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                    {t('api.records.method')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                    {t('api.records.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                    {t('api.records.time')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-tech-cyan uppercase tracking-wider font-mono">
                    {t('api.records.createdAt')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-tech-bg/40 divide-y divide-tech-border/20">
                {safeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-tech-surface/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300 font-mono max-w-xs truncate block" title={record.api_endpoint}>
                        {record.api_endpoint}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 bg-tech-cyan/20 text-tech-cyan rounded font-mono">
                        {record.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {record.status_code ? (
                        <span className={`text-sm font-bold font-mono ${getStatusColor(record.status_code)}`}>
                          {record.status_code}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {record.response_time_ms ? (
                        <span className="text-sm text-gray-400 font-mono">
                          {record.response_time_ms}ms
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-400 font-mono">
                        {formatDate(record.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-tech-border/30">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('api.records.previous')}
            </button>
            <span className="text-tech-cyan font-mono text-sm">
              {t('api.records.page', { page, totalPages: Math.ceil(total / limit) || 1 })}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total || loading}
              className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('api.records.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
