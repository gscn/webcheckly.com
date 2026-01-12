import { authenticatedFetch, getAccessToken } from './authService';
import { buildApiUrl } from '@/utils/config';
import { fetchWithRetry } from '@/utils/retry';

// 导出 buildApiUrl 以便在其他地方使用
export { buildApiUrl };

// API 服务层 - 集中封装所有 API 请求

// 任务相关 API
export const taskApi = {
  // 获取任务列表
  getTasks: (limit: number, offset: number) => 
    authenticatedFetch(`/api/tasks?limit=${limit}&offset=${offset}`),
  
  // 创建扫描任务
  createScanTask: (data: { url: string; options: string[]; language?: string; ai_mode?: string }) =>
    authenticatedFetch('/api/scans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 获取任务状态
  getTaskStatus: (taskId: string) =>
    authenticatedFetch(`/api/scans/${taskId}`),

  // 获取任务结果
  getTaskResults: (taskId: string) =>
    authenticatedFetch(`/api/scans/${taskId}/results`),

  // 获取任务结果（带重试）
  getTaskResultsWithRetry: (taskId: string) => {
    // 使用带重试机制的 fetch，需要构造完整 URL 并添加认证头
    const token = localStorage.getItem('webcheckly_access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetchWithRetry(buildApiUrl(`/api/scans/${taskId}/results`), { headers });
  },

  // SSE 流式获取任务状态
  streamTaskStatus: (taskId: string) => {
    // 这里需要特别处理，因为 EventSource 不支持认证头
    const token = getAccessToken();
    const streamUrl = token 
      ? `${buildApiUrl(`/api/scans/${taskId}/stream`)}?token=${encodeURIComponent(token)}`
      : buildApiUrl(`/api/scans/${taskId}/stream`);
    return new EventSource(streamUrl);
  },
};

// 用户相关 API
export const userApi = {
  // 获取当前用户信息
  getCurrentUser: () => authenticatedFetch('/api/auth/me'),

  // 获取用户余额
  getCreditsBalance: () => authenticatedFetch('/api/credits/balance'),

  // 获取用户订阅
  getUserSubscription: () => authenticatedFetch('/api/subscription/status'),

  // 获取月度使用情况
  getMonthlyUsage: (month?: string) => {
    const url = month 
      ? `/api/subscription/usage?month=${month}`
      : '/api/subscription/usage';
    return authenticatedFetch(url);
  },
};

// 认证相关 API
export const authApi = {
  // 登录
  login: (data: { email: string; password: string }) =>
    fetch(buildApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 注册
  register: (data: { email: string; password: string }) =>
    fetch(buildApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 刷新 token
  refreshToken: (data: { refresh_token: string }) =>
    fetch(buildApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 验证邮箱
  verifyEmail: (token: string) =>
    fetch(buildApiUrl(`/api/auth/verify-email?token=${token}`), {
      method: 'POST',
    }),

  // 重新发送验证邮件
  resendVerification: (data: { email: string }) =>
    fetch(buildApiUrl('/api/auth/resend-verification'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 忘记密码
  forgotPassword: (data: { email: string }) =>
    fetch(buildApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 重置密码
  resetPassword: (data: { token: string; new_password: string }) =>
    fetch(buildApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),
};

// 订单相关 API
export const orderApi = {
  // 创建订单
  createOrder: (data: { order_type: string; feature?: string; amount?: number; payment_method?: string }) =>
    authenticatedFetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 获取订单
  getOrder: (orderId: string) => authenticatedFetch(`/api/orders/${orderId}`),

  // 获取订单列表
  getOrders: (limit: number, offset: number) => 
    authenticatedFetch(`/api/orders?limit=${limit}&offset=${offset}`),

  // 取消订单
  cancelOrder: (orderId: string) =>
    authenticatedFetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
    }),

  // 创建支付会话
  createCheckoutSession: (data: { order_id: string; payment_method?: string }) =>
    authenticatedFetch('/api/payment/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),
};

// 订阅相关 API
export const subscriptionApi = {
  // 获取套餐计划
  getPlans: () => fetch(buildApiUrl('/api/subscription/plans')),

  // 获取功能定价
  getPricing: () => fetch(buildApiUrl('/api/pricing/features')),

  // 创建订阅
  createSubscription: (data: { plan_type: string; payment_method?: string }) =>
    authenticatedFetch('/api/subscription/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  // 取消订阅
  cancelSubscription: () => 
    authenticatedFetch('/api/subscription/cancel', {
      method: 'POST',
    }),
};

// 管理员相关 API
export const adminApi = {
  // 用户管理
  getUsers: (page: number, pageSize: number, search: string = '') => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search }),
    });
    return authenticatedFetch(`/api/admin/users?${params}`);
  },

  getUserDetails: (userId: string) => authenticatedFetch(`/api/admin/users/${userId}`),

  updateUserRole: (userId: string, role: string) =>
    authenticatedFetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }),

  updateUserStatus: (userId: string, emailVerified: boolean) =>
    authenticatedFetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_verified: emailVerified }),
    }),

  updateUserInfo: (userId: string, email: string) =>
    authenticatedFetch(`/api/admin/users/${userId}/info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),

  deleteUser: (userId: string) =>
    authenticatedFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  // 任务管理
  getTasks: (page: number, pageSize: number, filters: { status?: string; user_id?: string } = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(filters.status && { status: filters.status }),
      ...(filters.user_id && { user_id: filters.user_id }),
    });
    return authenticatedFetch(`/api/admin/tasks?${params}`);
  },

  getTaskDetails: (taskId: string) => authenticatedFetch(`/api/admin/tasks/${taskId}`),

  deleteTask: (taskId: string) =>
    authenticatedFetch(`/api/admin/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  getTaskStatistics: () => authenticatedFetch('/api/admin/tasks/statistics'),

  // 订阅管理
  getSubscriptions: (page: number, pageSize: number, filters: { status?: string; plan_type?: string } = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(filters.status && { status: filters.status }),
      ...(filters.plan_type && { plan_type: filters.plan_type }),
    });
    return authenticatedFetch(`/api/admin/subscriptions?${params}`);
  },

  updateSubscription: (subscriptionId: string, updates: { status?: string }) =>
    authenticatedFetch(`/api/admin/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  getSubscriptionStatistics: () => authenticatedFetch('/api/admin/subscriptions/statistics'),

  // 积分管理
  adjustUserCredits: (userId: string, amount: number, reason: string) =>
    authenticatedFetch('/api/admin/credits/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, amount, reason }),
    }),

  // 系统统计
  getSystemStatistics: () => authenticatedFetch('/api/admin/statistics'),
};

// 仪表盘相关 API
export const dashboardApi = {
  getData: () => authenticatedFetch('/api/dashboard'),
};

// 通用 API 工具函数
export const apiUtils = {
  // 处理 API 响应
  handleResponse: async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  // 处理无内容响应
  handleNoContentResponse: async (response: Response): Promise<void> => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
  },
};