import { authenticatedFetch } from './authService';
import { API_BASE_URL } from '@/utils/config';

// 类型定义
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  email_verified: boolean;
  created_at: string;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminUserDetailResponse {
  user: AdminUser;
  credits?: {
    credits: number;
  };
  subscription?: {
    id: string;
    plan_type: string;
    status: string;
    expires_at: string;
  };
  task_count: number;
}

export interface AdminTask {
  id: string;
  user_id?: string;
  status: string;
  target_url: string;
  created_at: string;
  completed_at?: string;
}

export interface AdminTaskListResponse {
  tasks: AdminTask[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
}

export interface AdminSubscriptionListResponse {
  subscriptions: AdminSubscription[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SystemStatistics {
  total_users: number;
  active_users: number;
  total_tasks: number;
  completed_tasks: number;
  total_subscriptions: number;
  active_subscriptions: number;
  total_credits: number;
  total_revenue: number;
  task_statistics: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  subscription_statistics: {
    basic: number;
    pro: number;
    enterprise: number;
  };
  date_range: {
    start: string;
    end: string;
  };
}

// 用户管理
export async function getUsersList(page = 1, pageSize = 20, search = ''): Promise<AdminUserListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(search && { search }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export async function getUserDetails(userId: string): Promise<AdminUserDetailResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user details');
  }
  return response.json();
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error('Failed to update user role');
  }
}

export async function updateUserStatus(userId: string, emailVerified: boolean): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_verified: emailVerified }),
  });
  if (!response.ok) {
    throw new Error('Failed to update user status');
  }
}

export async function updateUserInfo(userId: string, email: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/info`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update user info');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
}

// 任务管理
export async function getTasksList(
  page = 1,
  pageSize = 20,
  filters: { status?: string; user_id?: string } = {}
): Promise<AdminTaskListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(filters.status && { status: filters.status }),
    ...(filters.user_id && { user_id: filters.user_id }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/tasks?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
}

export async function getTaskDetails(taskId: string): Promise<AdminTask> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/tasks/${taskId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch task details');
  }
  return response.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
}

export async function getTaskStatistics(): Promise<any> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/tasks/statistics`);
  if (!response.ok) {
    throw new Error('Failed to fetch task statistics');
  }
  return response.json();
}

// 订阅管理
export async function getSubscriptionsList(
  page = 1,
  pageSize = 20,
  filters: { status?: string; plan_type?: string } = {}
): Promise<AdminSubscriptionListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(filters.status && { status: filters.status }),
    ...(filters.plan_type && { plan_type: filters.plan_type }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/subscriptions?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch subscriptions');
  }
  return response.json();
}

export async function updateSubscription(subscriptionId: string, updates: { status?: string }): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update subscription');
  }
}

export async function getSubscriptionStatistics(): Promise<any> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/subscriptions/statistics`);
  if (!response.ok) {
    throw new Error('Failed to fetch subscription statistics');
  }
  return response.json();
}

// 积分管理
export async function adjustUserCredits(userId: string, amount: number, reason: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/credits/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount, reason }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Failed to adjust user credits';
    throw new Error(errorMessage);
  }
}

export interface CreditsRecord {
  id: string;
  user_id: string;
  user_email: string;
  task_id?: string;
  feature_type: string;
  credits_used: number;
  is_free: boolean;
  is_refunded: boolean;
  scan_date: string;
  created_at: string;
}

export interface CreditsRecordListResponse {
  records: CreditsRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  statistics?: CreditsStatistics;
}

export interface CreditsStatistics {
  total_users: number;
  total_credits_used: number;
  total_records: number;
  by_feature_type: Record<string, number>;
  by_user: Record<string, number>;
  free_records: number;
  paid_records: number;
  refunded_records: number;
  date_range: {
    start: string;
    end: string;
  };
}

export interface CreditsFilters {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  feature_type?: string;
  is_free?: string;
  is_refunded?: string;
}

export async function getCreditsRecords(
  page = 1,
  pageSize = 20,
  filters: CreditsFilters = {}
): Promise<CreditsRecordListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(filters.start_date && { start_date: filters.start_date }),
    ...(filters.end_date && { end_date: filters.end_date }),
    ...(filters.user_id && { user_id: filters.user_id }),
    ...(filters.feature_type && { feature_type: filters.feature_type }),
    ...(filters.is_free && { is_free: filters.is_free }),
    ...(filters.is_refunded && { is_refunded: filters.is_refunded }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/credits/records?${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Failed to fetch credits records';
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function getCreditsStatistics(filters: CreditsFilters = {}): Promise<CreditsStatistics> {
  const params = new URLSearchParams({
    ...(filters.start_date && { start_date: filters.start_date }),
    ...(filters.end_date && { end_date: filters.end_date }),
    ...(filters.user_id && { user_id: filters.user_id }),
    ...(filters.feature_type && { feature_type: filters.feature_type }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/credits/statistics?${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Failed to fetch credits statistics';
    throw new Error(errorMessage);
  }
  return response.json();
}

// 系统统计
export async function getSystemStatistics(): Promise<SystemStatistics> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/statistics`);
  if (!response.ok) {
    throw new Error('Failed to fetch system statistics');
  }
  return response.json();
}

