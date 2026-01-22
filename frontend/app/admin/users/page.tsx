'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getUsersList,
  getUserDetails,
  updateUserRole,
  updateUserStatus,
  updateUserInfo,
  deleteUser,
  type AdminUser,
  type AdminUserListResponse,
} from '@/services/adminService';
import IdDisplay from '@/components/admin/IdDisplay';

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editEmailVerified, setEditEmailVerified] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: AdminUserListResponse = await getUsersList(page, pageSize, search);
      setUsers(data.users);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || t('admin.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || t('admin.errors.updateFailed'));
    }
  };

  const handleStatusChange = async (userId: string, emailVerified: boolean) => {
    try {
      await updateUserStatus(userId, emailVerified);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || t('admin.errors.updateFailed'));
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditEmailVerified(user.email_verified);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      // 如果邮箱改变了，更新邮箱
      if (editEmail !== editingUser.email) {
        await updateUserInfo(editingUser.id, editEmail);
      }
      // 如果验证状态改变了，更新验证状态
      if (editEmailVerified !== editingUser.email_verified) {
        await updateUserStatus(editingUser.id, editEmailVerified);
      }
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || t('admin.errors.updateFailed'));
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditEmail('');
    setEditEmailVerified(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(t('admin.users.confirmDelete'))) {
      return;
    }
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || t('admin.errors.deleteFailed'));
    }
  };

  const handleViewDetails = async (user: AdminUser) => {
    try {
      const details = await getUserDetails(user.id);
      setSelectedUser(user);
      setUserDetails(details);
      setShowDetails(true);
    } catch (err: any) {
      alert(err.message || t('admin.errors.loadFailed'));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
          {t('admin.users.title')}
        </h1>
        <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
          USER_MANAGEMENT_SYSTEM
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={t('admin.users.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full md:w-96 px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
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
          {/* 用户表格 */}
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
                      {t('admin.users.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.users.role')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.users.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.users.createdAt')}
                    </th>
                    <th className="px-4 py-3 text-left text-tech-cyan font-mono text-xs uppercase">
                      {t('admin.users.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-tech-border/20 hover:bg-tech-surface/30">
                      <td className="px-4 py-3">
                        <IdDisplay id={user.id} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                        {editingUser?.id === user.id ? (
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            aria-label={t('admin.users.email')}
                            title={t('admin.users.email')}
                            placeholder={t('admin.users.email')}
                            className="w-full px-2 py-1 bg-tech-surface/50 border border-tech-border/30 rounded text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={editingUser?.id === user.id}
                          aria-label={t('admin.users.role')}
                          title={t('admin.users.role')}
                          className="bg-tech-surface/50 border border-tech-border/30 rounded px-2 py-1 text-tech-cyan font-mono text-xs focus:outline-none focus:border-tech-cyan disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {editingUser?.id === user.id ? (
                          <label className="flex items-center gap-2 cursor-pointer" title={t('admin.users.status')}>
                            <input
                              type="checkbox"
                              checked={editEmailVerified}
                              onChange={(e) => setEditEmailVerified(e.target.checked)}
                              aria-label={t('admin.users.status')}
                              className="w-4 h-4 text-tech-cyan bg-tech-surface/50 border-tech-border/30 rounded focus:ring-tech-cyan"
                            />
                            <span className="text-xs font-mono text-gray-300">
                              {editEmailVerified ? t('admin.users.verified') : t('admin.users.unverified')}
                            </span>
                          </label>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-mono ${
                              user.email_verified
                                ? 'bg-green-950/40 text-green-400 border border-green-500/40'
                                : 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/40'
                            }`}
                          >
                            {user.email_verified ? t('admin.users.verified') : t('admin.users.unverified')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {editingUser?.id === user.id ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="px-3 py-1 bg-green-950/40 hover:bg-green-950/60 border border-green-500/40 text-green-400 font-mono text-xs rounded transition-all"
                              >
                                {t('admin.users.save')}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 bg-gray-950/40 hover:bg-gray-950/60 border border-gray-500/40 text-gray-400 font-mono text-xs rounded transition-all"
                              >
                                {t('admin.users.cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="px-3 py-1 bg-tech-cyan/10 hover:bg-tech-cyan/20 border border-tech-cyan/60 text-tech-cyan font-mono text-xs rounded transition-all"
                              >
                                {t('admin.users.edit')}
                              </button>
                              <button
                                onClick={() => handleViewDetails(user)}
                                className="px-3 py-1 bg-blue-950/40 hover:bg-blue-950/60 border border-blue-500/40 text-blue-400 font-mono text-xs rounded transition-all"
                              >
                                {t('admin.users.viewDetails')}
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="px-3 py-1 bg-red-950/40 hover:bg-red-950/60 border border-red-500/40 text-red-400 font-mono text-xs rounded transition-all"
                              >
                                {t('admin.users.delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between">
            <div className="text-tech-cyan/70 font-mono text-sm">
              {t('admin.users.pageInfo', { page, totalPages })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-tech-cyan font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-tech-cyan transition-all"
              >
                {t('admin.users.previous')}
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-tech-cyan font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-tech-cyan transition-all"
              >
                {t('admin.users.next')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 用户详情对话框 */}
      {showDetails && selectedUser && userDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative group max-w-3xl w-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative bg-tech-bg/95 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-tech-cyan font-mono uppercase">
                  {t('admin.users.viewDetails')}
                </h2>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedUser(null);
                    setUserDetails(null);
                  }}
                  className="px-3 py-1 bg-gray-950/40 hover:bg-gray-950/60 border border-gray-500/40 text-gray-400 font-mono text-xs rounded transition-all"
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                      ID
                    </label>
                    <IdDisplay id={selectedUser.id} showFull={true} />
                  </div>
                  <div>
                    <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                      {t('admin.users.email')}
                    </label>
                    <div className="text-white font-mono text-sm break-all">{selectedUser.email}</div>
                  </div>
                  <div>
                    <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                      {t('admin.users.role')}
                    </label>
                    <div className="text-white font-mono text-sm uppercase">{selectedUser.role}</div>
                  </div>
                  <div>
                    <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                      {t('admin.users.status')}
                    </label>
                    <span
                      className={`px-2 py-1 rounded text-xs font-mono inline-block ${
                        selectedUser.email_verified
                          ? 'bg-green-950/40 text-green-400 border border-green-500/40'
                          : 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/40'
                      }`}
                    >
                      {selectedUser.email_verified ? t('admin.users.verified') : t('admin.users.unverified')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                      {t('admin.users.createdAt')}
                    </label>
                    <div className="text-white font-mono text-sm">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {userDetails.credits && (
                    <div>
                      <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                        {t('admin.users.credits')}
                      </label>
                      <div className="text-white font-mono text-sm">
                        {userDetails.credits.credits} {t('admin.users.creditsUnit')}
                      </div>
                    </div>
                  )}
                  {userDetails.subscription && (
                    <div>
                      <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                        {t('admin.users.subscription')}
                      </label>
                      <div className="space-y-2">
                        <div className="text-white font-mono text-sm">
                          {t('admin.users.planType')}: {userDetails.subscription.plan_type.toUpperCase()}
                        </div>
                        <div className="text-white font-mono text-sm">
                          {t('admin.users.status')}: {userDetails.subscription.status}
                        </div>
                        <div className="text-white font-mono text-sm">
                          {t('admin.users.expiresAt')}: {new Date(userDetails.subscription.expires_at).toLocaleString()}
                        </div>
                        <div>
                          <label className="text-tech-cyan/70 font-mono text-xs">Subscription ID:</label>
                          <IdDisplay id={userDetails.subscription.id} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-1">
                      {t('admin.users.taskCount')}
                    </label>
                    <div className="text-white font-mono text-sm">{userDetails.task_count || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

