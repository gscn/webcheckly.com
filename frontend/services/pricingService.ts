import { authenticatedFetch } from './authService';

export interface PricingPlan {
  plan_type: string;
  plan_name: string;
  monthly_price_cny: number;
  monthly_price_usd: number;
  basic_scans_limit: number;
  monthly_credits_limit: number;
  task_history_days: number;
  api_access_limit?: number;
  features: string[];
}

export interface FeaturePricing {
  id: string;
  feature_code: string;
  feature_name: string;
  feature_category: string;
  single_price: number;
  single_price_usd: number;
  credits_cost: number;
  is_premium: boolean;
  is_available: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  paypal_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: string;
  user_id: string;
  subscription_id: string;
  month: string;
  basic_scans_used: number;
  premium_features_used: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 获取套餐列表
export async function getSubscriptionPlans(): Promise<PricingPlan[]> {
  const response = await fetch(`${API_BASE_URL}/api/subscription/plans`);
  if (!response.ok) {
    throw new Error('Failed to fetch subscription plans');
  }
  const data = await response.json();
  return data.plans || [];
}

// 获取功能定价
export async function getFeaturePricing(): Promise<FeaturePricing[]> {
  // 添加时间戳参数和 cache: 'no-store' 确保获取最新数据，避免浏览器缓存
  const timestamp = Date.now();
  const response = await fetch(`${API_BASE_URL}/api/pricing/features?t=${timestamp}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch feature pricing');
  }
  return response.json();
}

// 获取用户订阅状态
export async function getUserSubscription(): Promise<Subscription | null> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription/status`);
    if (!response.ok) {
      if (response.status === 401) {
        // 401是正常的（未登录），静默返回null
        return null;
      }
      throw new Error('Failed to fetch subscription');
    }
    const data = await response.json();
    return data.subscription || null;
  } catch (error) {
    // 401错误是正常的（未登录），不记录错误
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      return null;
    }
    console.error('Error fetching subscription:', error);
    return null;
  }
}

// 获取月度使用记录
export async function getMonthlyUsage(month?: string): Promise<SubscriptionUsage | null> {
  try {
    const url = month 
      ? `${API_BASE_URL}/api/subscription/usage?month=${month}`
      : `${API_BASE_URL}/api/subscription/usage`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch monthly usage');
    }
    const data = await response.json();
    return data.usage || null;
  } catch (error) {
    console.error('Error fetching monthly usage:', error);
    return null;
  }
}

// 创建订阅（默认使用PayPal）
export async function createSubscription(
  planType: string,
  paymentMethod: 'paypal' = 'paypal'
): Promise<{ subscription_id?: string; url: string; provider: 'paypal' }> {
  const body: any = { plan_type: planType, payment_method: paymentMethod };

  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create subscription');
  }

  return response.json();
}

// 取消订阅
export async function cancelSubscription(): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription/cancel`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel subscription');
  }
}

