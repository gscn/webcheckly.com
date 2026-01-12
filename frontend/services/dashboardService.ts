import { authenticatedFetch } from './authService';
import type { UserCredits } from './creditsService';
import type { Subscription, SubscriptionUsage } from './pricingService';
import type { UsageStats } from './creditsService';

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

export interface DashboardData {
  credits: UserCredits | null;
  subscription: Subscription | null;
  monthly_usage: SubscriptionUsage | null;
  usage_stats: UsageStats | null;
  plans: Record<string, PricingPlan>;
}

// 使用统一的 API 基础 URL

// 获取dashboard统一数据
export async function getDashboardData(): Promise<DashboardData> {
  const response = await authenticatedFetch('/api/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

