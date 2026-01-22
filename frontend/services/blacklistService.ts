import { authenticatedFetch } from './authService';
import { API_BASE_URL } from '@/utils/config';

// 类型定义
export interface BlacklistItem {
  id: string;
  target?: string; // 网站黑名单使用
  match_type?: string; // 网站黑名单使用
  user_id?: string; // 用户黑名单使用
  reason?: string;
  banned_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  }; // 用户黑名单使用
  banned_by_user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface BlacklistListResponse {
  items: BlacklistItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 网站黑名单
export async function createWebsiteBlacklist(
  target: string,
  matchType: 'exact' | 'domain',
  reason?: string
): Promise<BlacklistItem> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/websites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, match_type: matchType, reason }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create website blacklist');
  }
  return response.json();
}

export async function getWebsiteBlacklistList(
  page = 1,
  pageSize = 20,
  search = ''
): Promise<BlacklistListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/websites?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch website blacklist');
  }
  return response.json();
}

export async function toggleWebsiteBlacklistStatus(id: string, isActive: boolean): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/websites/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update website blacklist status');
  }
}

export async function deleteWebsiteBlacklist(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/websites/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete website blacklist');
  }
}

// 用户黑名单
export async function createUserBlacklist(userId: string, reason?: string): Promise<BlacklistItem> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, reason }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create user blacklist');
  }
  return response.json();
}

export async function getUserBlacklistList(
  page = 1,
  pageSize = 20,
  search = ''
): Promise<BlacklistListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/users?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user blacklist');
  }
  return response.json();
}

export async function toggleUserBlacklistStatus(id: string, isActive: boolean): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/users/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update user blacklist status');
  }
}

export async function deleteUserBlacklist(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/blacklist/users/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete user blacklist');
  }
}
