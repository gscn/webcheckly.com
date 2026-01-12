import { adminApi, apiUtils } from '@/services/apiService';

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
  const response = await adminApi.getUsers(page, pageSize, search);
  return apiUtils.handleResponse<AdminUserListResponse>(response);
}

export async function getUserDetails(userId: string): Promise<AdminUserDetailResponse> {
  const response = await adminApi.getUserDetails(userId);
  return apiUtils.handleResponse<AdminUserDetailResponse>(response);
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const response = await adminApi.updateUserRole(userId, role);
  if (!response.ok) {
    throw new Error('Failed to update user role');
  }
}

export async function updateUserStatus(userId: string, emailVerified: boolean): Promise<void> {
  const response = await adminApi.updateUserStatus(userId, emailVerified);
  if (!response.ok) {
    throw new Error('Failed to update user status');
  }
}

export async function updateUserInfo(userId: string, email: string): Promise<void> {
  const response = await adminApi.updateUserInfo(userId, email);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update user info');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await adminApi.deleteUser(userId);
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
  const response = await adminApi.getTasks(page, pageSize, filters);
  return apiUtils.handleResponse<AdminTaskListResponse>(response);
}

export async function getTaskDetails(taskId: string): Promise<AdminTask> {
  const response = await adminApi.getTaskDetails(taskId);
  return apiUtils.handleResponse<AdminTask>(response);
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await adminApi.deleteTask(taskId);
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
}

export async function getTaskStatistics(): Promise<any> {
  const response = await adminApi.getTaskStatistics();
  return apiUtils.handleResponse<any>(response);
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
  const response = await adminApi.getSubscriptions(page, pageSize, filters);
  return apiUtils.handleResponse<AdminSubscriptionListResponse>(response);
}

export async function updateSubscription(subscriptionId: string, updates: { status?: string }): Promise<void> {
  const response = await adminApi.updateSubscription(subscriptionId, updates);
  if (!response.ok) {
    throw new Error('Failed to update subscription');
  }
}

export async function getSubscriptionStatistics(): Promise<any> {
  const response = await adminApi.getSubscriptionStatistics();
  return apiUtils.handleResponse<any>(response);
}

// 积分管理
export async function adjustUserCredits(userId: string, amount: number, reason: string): Promise<void> {
  const response = await adminApi.adjustUserCredits(userId, amount, reason);
  if (!response.ok) {
    throw new Error('Failed to adjust user credits');
  }
}

// 系统统计
export async function getSystemStatistics(): Promise<SystemStatistics> {
  const response = await adminApi.getSystemStatistics();
  return apiUtils.handleResponse<SystemStatistics>(response);
}

