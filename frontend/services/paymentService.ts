import { authenticatedFetch } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 跳转到支付页面。购买积分与订阅均使用 result.url，PayPal 为 Approve URL，Stripe 为 Checkout URL。
export function redirectToPayment(url: string, _provider?: 'paypal' | 'stripe') {
  window.location.href = url;
}

// 验证支付状态（按订单 ID）
export async function verifyPayment(orderId: string): Promise<{
  order_id: string;
  status: string;
  paid_at?: string;
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/payment/verify/${orderId}`);
  if (!response.ok) {
    throw new Error('Failed to verify payment');
  }
  return response.json();
}

// 确认支付（PayPal capture，success 页回调时调用）
export async function confirmPayment(orderId: string): Promise<{
  order_id: string;
  status: string;
  paid_at?: string;
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/payment/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to confirm payment');
  }
  return response.json();
}

// 按 Stripe Checkout session_id 验证支付
export async function verifyPaymentBySessionId(sessionId: string): Promise<{
  order_id: string;
  status: string;
  paid_at?: string;
}> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/payment/verify-session?session_id=${encodeURIComponent(sessionId)}`
  );
  if (!response.ok) {
    throw new Error('Failed to verify session');
  }
  return response.json();
}

// 轮询支付状态（用于支付完成后检查）
export async function pollPaymentStatus(
  orderId: string,
  maxAttempts = 30,
  interval = 2000
): Promise<{ status: string; paid_at?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await verifyPayment(orderId);
      if (result.status === 'paid' || result.status === 'failed' || result.status === 'canceled') {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error('Payment verification timeout');
}

