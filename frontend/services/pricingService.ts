import { subscriptionApi, apiUtils, userApi } from '@/services/apiService';

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
  stripe_subscription_id?: string;
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

// 使用统一的 API 基础 URL

// 获取套餐列表
export async function getSubscriptionPlans(): Promise<PricingPlan[]> {
  const response = await fetch('/api/subscription/plans', {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch subscription plans');
  }
  const data = await response.json();
  return data.plans || [];
}

// 获取功能定价
export async function getFeaturePricing(): Promise<FeaturePricing[]> {
  const response = await fetch('/api/pricing/features', {
    headers: {
      'Content-Type': 'application/json',
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
    try {
      const response = await userApi.getUserSubscription();
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
      ? `/api/subscription/usage?month=${month}`
      : '/api/subscription/usage';
    const response = await userApi.getMonthlyUsage(month);
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

// 创建订阅
export async function createSubscription(
  planType: string,
  paymentMethod?: 'stripe' | 'paypal'
): Promise<{ session_id?: string; subscription_id?: string; url: string; provider: 'stripe' | 'paypal' }> {
  const body: any = { plan_type: planType };
  if (paymentMethod) body.payment_method = paymentMethod;

  const response = await subscriptionApi.createSubscription(body);
  return apiUtils.handleResponse<{ session_id?: string; subscription_id?: string; url: string; provider: 'stripe' | 'paypal' }>(response);
}

// 取消订阅
export async function cancelSubscription(): Promise<void> {
  const response = await subscriptionApi.cancelSubscription();
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel subscription');
  }
}

