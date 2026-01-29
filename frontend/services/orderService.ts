import { authenticatedFetch } from './authService';

export interface Order {
  id: string;
  user_id: string;
  order_type: string;
  feature?: string;
  amount: number;
  amount_usd?: number;
  credits_amount: number;
  status: string;
  payment_method: string;
  paypal_order_id?: string;
  paypal_payment_id?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 创建订单（默认使用PayPal）
export async function createOrder(
  orderType: 'single_scan' | 'credits_purchase',
  feature?: string,
  amount?: number,
  paymentMethod: 'paypal' = 'paypal'
): Promise<Order> {
  const body: any = { order_type: orderType, payment_method: paymentMethod };
  if (feature) body.feature = feature;
  if (amount) body.amount = amount;

  const response = await authenticatedFetch(`${API_BASE_URL}/api/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(error.error || error.message || 'Failed to create order');
  }

  return response.json();
}

// 获取订单详情
export async function getOrder(orderId: string): Promise<Order> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch order');
  }
  return response.json();
}

// 获取订单列表
export async function getOrders(limit = 20, offset = 0): Promise<Order[]> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/orders?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }
  return response.json();
}

// 取消订单
export async function cancelOrder(orderId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(error.error || error.message || 'Failed to cancel order');
  }
}

// 创建支付会话（仅用于购买积分等一次性支付，不与订阅混用）
export async function createCheckoutSession(
  orderId: string,
  paymentMethod: 'paypal' | 'stripe' = 'paypal'
): Promise<{ order_id?: string; session_id?: string; url: string; provider: 'paypal' | 'stripe' }> {
  const body: any = { order_id: orderId, payment_method: paymentMethod };

  const response = await authenticatedFetch(`${API_BASE_URL}/api/payment/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(error.error || error.message || 'Failed to create checkout session');
  }

  return response.json();
}

