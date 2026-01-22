import { authenticatedFetch } from './authService';
import { API_BASE_URL } from '@/utils/config';

// 类型定义
export interface RevenueOrder {
  id: string;
  user_id: string;
  user_email: string;
  order_type: string;
  feature?: string;
  amount: number;
  amount_usd?: number;
  credits_amount: number;
  status: string;
  payment_method: string;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  paypal_order_id?: string;
  paypal_payment_id?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
}

export interface RevenueStatistics {
  total_revenue: number;
  total_orders: number;
  average_order_amount: number;
  by_payment_method: Record<string, number>;
  by_order_type: Record<string, number>;
  by_status: Record<string, number>;
  refunded_amount: number;
  refunded_orders: number;
  date_range: {
    start: string;
    end: string;
  };
}

export interface RevenueOrderListResponse {
  orders: RevenueOrder[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  statistics?: RevenueStatistics;
}

export interface RevenueFilters {
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  order_type?: string;
  status?: string;
  user_id?: string;
}

// 获取收入订单列表
export async function getRevenueOrders(
  page = 1,
  pageSize = 20,
  filters: RevenueFilters = {}
): Promise<RevenueOrderListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(filters.start_date && { start_date: filters.start_date }),
    ...(filters.end_date && { end_date: filters.end_date }),
    ...(filters.payment_method && { payment_method: filters.payment_method }),
    ...(filters.order_type && { order_type: filters.order_type }),
    ...(filters.status && { status: filters.status }),
    ...(filters.user_id && { user_id: filters.user_id }),
  });
  const url = `${API_BASE_URL}/api/admin/revenue/orders?${params}`;
  console.log('[revenueService] Fetching orders from:', url);
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[revenueService] Failed to fetch revenue orders:', response.status, errorText);
    throw new Error(`Failed to fetch revenue orders: ${response.status} ${errorText}`);
  }
  return response.json();
}

// 获取收入统计信息
export async function getRevenueStatistics(filters: RevenueFilters = {}): Promise<RevenueStatistics> {
  const params = new URLSearchParams({
    ...(filters.start_date && { start_date: filters.start_date }),
    ...(filters.end_date && { end_date: filters.end_date }),
    ...(filters.payment_method && { payment_method: filters.payment_method }),
    ...(filters.order_type && { order_type: filters.order_type }),
    ...(filters.user_id && { user_id: filters.user_id }),
  });
  const url = `${API_BASE_URL}/api/admin/revenue/statistics?${params}`;
  console.log('[revenueService] Fetching statistics from:', url);
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[revenueService] Failed to fetch revenue statistics:', response.status, errorText);
    throw new Error(`Failed to fetch revenue statistics: ${response.status} ${errorText}`);
  }
  return response.json();
}

// 导出订单数据
export async function exportRevenueOrders(filters: RevenueFilters = {}): Promise<Blob> {
  const params = new URLSearchParams({
    ...(filters.start_date && { start_date: filters.start_date }),
    ...(filters.end_date && { end_date: filters.end_date }),
    ...(filters.payment_method && { payment_method: filters.payment_method }),
    ...(filters.order_type && { order_type: filters.order_type }),
    ...(filters.status && { status: filters.status }),
    ...(filters.user_id && { user_id: filters.user_id }),
  });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/revenue/export?${params}`);
  if (!response.ok) {
    throw new Error('Failed to export revenue orders');
  }
  return response.blob();
}
