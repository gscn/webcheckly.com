import { authenticatedFetch } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 跳转到PayPal Checkout
export function redirectToPayPalCheckout(approveURL: string) {
  window.location.href = approveURL;
}

// 跳转到支付页面（默认使用PayPal）
export function redirectToPayment(url: string, provider: 'paypal' = 'paypal') {
  redirectToPayPalCheckout(url);
}

// 验证支付状态
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

