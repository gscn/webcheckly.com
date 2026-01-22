'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  createWebsiteBlacklist,
  getWebsiteBlacklistList,
  toggleWebsiteBlacklistStatus,
  deleteWebsiteBlacklist,
  createUserBlacklist,
  getUserBlacklistList,
  toggleUserBlacklistStatus,
  deleteUserBlacklist,
  type BlacklistItem,
  type BlacklistListResponse,
} from '@/services/blacklistService';
import { getUsersList, type AdminUser } from '@/services/adminService';

export default function AdminBlacklistPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'websites' | 'users'>('websites');
  const [websiteItems, setWebsiteItems] = useState<BlacklistItem[]>([]);
  const [userItems, setUserItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTarget, setAddTarget] = useState('');
  const [addMatchType, setAddMatchType] = useState<'exact' | 'domain'>('exact');
  const [addReason, setAddReason] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<AdminUser[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);

  useEffect(() => {
    if (activeTab === 'websites') {
      loadWebsiteBlacklist();
    } else {
      loadUserBlacklist();
      if (showAddModal && availableUsers.length === 0) {
        loadUsers();
      }
    }
  }, [page, search, activeTab]);

  const loadWebsiteBlacklist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: BlacklistListResponse = await getWebsiteBlacklistList(page, pageSize, search);
      setWebsiteItems(data.items);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      console.error('Failed to load website blacklist:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserBlacklist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: BlacklistListResponse = await getUserBlacklistList(page, pageSize, search);
      setUserItems(data.items);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      console.error('Failed to load user blacklist:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsersList(1, 100, '');
      setAvailableUsers(data.users);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  };

  const handleAddWebsite = async () => {
    if (!addTarget.trim()) {
      alert(t('admin.blacklist.targetRequired'));
      return;
    }

    try {
      await createWebsiteBlacklist(addTarget.trim(), addMatchType, addReason.trim() || undefined);
      setShowAddModal(false);
      setAddTarget('');
      setAddMatchType('exact');
      setAddReason('');
      await loadWebsiteBlacklist();
    } catch (err: any) {
      alert(err.message || t('admin.errors.createFailed'));
    }
  };

  const handleAddUser = async () => {
    if (!addUserId) {
      alert(t('admin.blacklist.userRequired'));
      return;
    }

    try {
      await createUserBlacklist(addUserId, addReason.trim() || undefined);
      setShowAddModal(false);
      setAddUserId('');
      setAddReason('');
      await loadUserBlacklist();
    } catch (err: any) {
      alert(err.message || t('admin.errors.createFailed'));
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      if (activeTab === 'websites') {
        await toggleWebsiteBlacklistStatus(id, !currentStatus);
        await loadWebsiteBlacklist();
      } else {
        await toggleUserBlacklistStatus(id, !currentStatus);
        await loadUserBlacklist();
      }
    } catch (err: any) {
      alert(err.message || t('admin.errors.updateFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.blacklist.confirmDelete'))) {
      return;
    }

    try {
      if (activeTab === 'websites') {
        await deleteWebsiteBlacklist(id);
        await loadWebsiteBlacklist();
      } else {
        await deleteUserBlacklist(id);
        await loadUserBlacklist();
      }
    } catch (err: any) {
      alert(err.message || t('admin.errors.deleteFailed'));
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    if (activeTab === 'users' && availableUsers.length === 0) {
      loadUsers();
    }
  };

  const currentItems = activeTab === 'websites' ? websiteItems : userItems;

  return (
    <div className="w-full">
          <h1 className="text-3xl font-black text-tech-cyan font-mono mb-8 uppercase tracking-wider">
            {t('admin.blacklist.title')}
          </h1>

          {/* 标签页 */}
          <div className="flex gap-4 mb-6 border-b border-tech-border/40">
            <button
              onClick={() => {
                setActiveTab('websites');
                setPage(1);
                setSearch('');
              }}
              className={`px-6 py-3 font-mono font-bold transition-all ${
                activeTab === 'websites'
                  ? 'text-tech-cyan border-b-2 border-tech-cyan'
                  : 'text-gray-400 hover:text-tech-cyan'
              }`}
            >
              {t('admin.blacklist.websites')}
            </button>
            <button
              onClick={() => {
                setActiveTab('users');
                setPage(1);
                setSearch('');
              }}
              className={`px-6 py-3 font-mono font-bold transition-all ${
                activeTab === 'users'
                  ? 'text-tech-cyan border-b-2 border-tech-cyan'
                  : 'text-gray-400 hover:text-tech-cyan'
              }`}
            >
              {t('admin.blacklist.users')}
            </button>
          </div>

          {/* 搜索和添加 */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder={t('admin.blacklist.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="flex-1 px-4 py-2 bg-tech-surface border border-tech-border/40 rounded-lg text-tech-cyan placeholder-gray-500 focus:outline-none focus:border-tech-cyan"
            />
            <button
              onClick={openAddModal}
              className="px-6 py-2 bg-tech-cyan text-black font-mono font-bold rounded-lg hover:bg-tech-cyan/80 transition-all"
            >
              {activeTab === 'websites' ? t('admin.blacklist.addWebsite') : t('admin.blacklist.addUser')}
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/60 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* 表格 */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t('admin.blacklist.noItems')}</div>
          ) : (
            <div className="bg-tech-surface/50 border border-tech-border/40 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-tech-surface/80 border-b border-tech-border/40">
                  <tr>
                    {activeTab === 'websites' ? (
                      <>
                        <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.target')}</th>
                        <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.matchType')}</th>
                        <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.reason')}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.user')}</th>
                        <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.reason')}</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.bannedBy')}</th>
                    <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.status')}</th>
                    <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.createdAt')}</th>
                    <th className="px-6 py-4 text-left font-mono font-bold text-tech-cyan">{t('admin.blacklist.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => (
                    <tr key={item.id} className="border-b border-tech-border/20 hover:bg-tech-surface/30">
                      {activeTab === 'websites' ? (
                        <>
                          <td className="px-6 py-4 text-gray-300 font-mono">{item.target}</td>
                          <td className="px-6 py-4 text-gray-300 font-mono">
                            {item.match_type === 'exact' ? t('admin.blacklist.matchTypeExact') : t('admin.blacklist.matchTypeDomain')}
                          </td>
                          <td className="px-6 py-4 text-gray-300 font-mono">{item.reason || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-gray-300 font-mono">{item.user?.email || '-'}</td>
                          <td className="px-6 py-4 text-gray-300 font-mono">{item.reason || '-'}</td>
                        </>
                      )}
                      <td className="px-6 py-4 text-gray-300 font-mono text-sm">{item.banned_by_user?.email || '-'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full font-mono text-xs font-bold ${
                            item.is_active
                              ? 'bg-red-500/20 text-red-400 border border-red-500/60'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/60'
                          }`}
                        >
                          {item.is_active ? t('admin.blacklist.active') : t('admin.blacklist.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleStatus(item.id, item.is_active)}
                            className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all ${
                              item.is_active
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/60 hover:bg-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/60 hover:bg-green-500/30'
                            }`}
                          >
                            {item.is_active ? t('admin.blacklist.unban') : t('admin.blacklist.ban')}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1 rounded font-mono text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/60 hover:bg-red-500/30 transition-all"
                          >
                            {t('admin.blacklist.delete')}
                          </button>
                        </div>
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
                {t('admin.blacklist.previous')}
              </button>
              <span className="px-4 py-2 text-gray-300 font-mono">
                {t('admin.blacklist.page', { page, totalPages })}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-tech-surface border border-tech-border/40 rounded-lg text-tech-cyan font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tech-surface/80"
              >
                {t('admin.blacklist.next')}
              </button>
            </div>
          )}

          {/* 添加模态框 */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-tech-surface border border-tech-border/40 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-black text-tech-cyan font-mono mb-4 uppercase">
                  {activeTab === 'websites' ? t('admin.blacklist.addWebsite') : t('admin.blacklist.addUser')}
                </h2>

                {activeTab === 'websites' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.blacklist.target')}</label>
                      <input
                        type="text"
                        value={addTarget}
                        onChange={(e) => setAddTarget(e.target.value)}
                        placeholder="https://example.com 或 example.com"
                        className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan placeholder-gray-500 focus:outline-none focus:border-tech-cyan"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.blacklist.matchType')}</label>
                      <select
                        value={addMatchType}
                        onChange={(e) => setAddMatchType(e.target.value as 'exact' | 'domain')}
                        className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                      >
                        <option value="exact">{t('admin.blacklist.matchTypeExact')}</option>
                        <option value="domain">{t('admin.blacklist.matchTypeDomain')}</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="mb-4">
                    <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.blacklist.user')}</label>
                    <select
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan focus:outline-none focus:border-tech-cyan"
                    >
                      <option value="">{t('admin.blacklist.selectUser')}</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-gray-300 font-mono text-sm mb-2">{t('admin.blacklist.reason')}</label>
                  <textarea
                    value={addReason}
                    onChange={(e) => setAddReason(e.target.value)}
                    placeholder={t('admin.blacklist.reasonPlaceholder')}
                    rows={3}
                    className="w-full px-4 py-2 bg-tech-bg border border-tech-border/40 rounded-lg text-tech-cyan placeholder-gray-500 focus:outline-none focus:border-tech-cyan"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setAddTarget('');
                      setAddMatchType('exact');
                      setAddReason('');
                      setAddUserId('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500/20 border border-gray-500/60 rounded-lg text-gray-300 font-mono font-bold hover:bg-gray-500/30 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={activeTab === 'websites' ? handleAddWebsite : handleAddUser}
                    className="flex-1 px-4 py-2 bg-tech-cyan text-black font-mono font-bold rounded-lg hover:bg-tech-cyan/80 transition-all"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
