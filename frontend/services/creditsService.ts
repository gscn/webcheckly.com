import { authenticatedFetch } from './authService';

export interface UserCredits {
  id: string;
  user_id: string;
  credits: number;
  monthly_credits_used: number;
  monthly_credits_reset_at?: string;
  last_daily_reward_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  task_id?: string;
  feature_type: string;
  credits_used: number;
  is_free: boolean;
  is_refunded: boolean;
  scan_date: string;
  created_at: string;
}

export interface UsageStats {
  total_scans: number;
  free_scans: number;
  paid_scans: number;
  total_credits_used: number;
  feature_usage: Record<string, number>;
  date_range: {
    start: string;
    end: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 获取余额
export async function getCreditsBalance(): Promise<UserCredits | null> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/credits/balance`);
    if (!response.ok) {
      if (response.status === 401) {
        // 401是正常的（未登录），静默返回null
        return null;
      }
      throw new Error('Failed to fetch credits balance');
    }
    return response.json();
  } catch (error) {
    // 401错误是正常的（未登录），不记录错误
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      return null;
    }
    console.error('Error fetching credits balance:', error);
    return null;
  }
}

// 购买积分
export async function purchaseCredits(amount: number): Promise<any> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/credits/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to purchase credits');
  }

  return response.json();
}

// 获取使用记录
export async function getUsageRecords(limit = 20, offset = 0): Promise<UsageRecord[]> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/credits/usage?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch usage records');
  }
  return response.json();
}

// 获取使用统计
export async function getUsageStats(
  startDate?: string,
  endDate?: string
): Promise<UsageStats> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/credits/stats?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch usage stats');
  }
  return response.json();
}

