import { authenticatedFetch } from './authService';

// 使用统一的 API 基础 URL

// 跳转到Stripe Checkout
export function redirectToCheckout(checkoutSessionId: string) {
  window.location.href = `https://checkout.stripe.com/pay/${checkoutSessionId}`;
}

// 跳转到PayPal Checkout
export function redirectToPayPalCheckout(approveURL: string) {
  window.location.href = approveURL;
}

// 通用跳转函数（根据provider自动选择）
export function redirectToPayment(url: string, provider: 'stripe' | 'paypal' = 'stripe') {
  if (provider === 'paypal') {
    redirectToPayPalCheckout(url);
  } else {
    // 如果是Stripe，url应该是session_id，需要构建完整URL
    if (!url.startsWith('http')) {
      redirectToCheckout(url);
    } else {
      window.location.href = url;
    }
  }
}

// 验证支付状态
export async function verifyPayment(orderId: string): Promise<{
  order_id: string;
  status: string;
  paid_at?: string;
}> {
  const response = await authenticatedFetch(`/api/payment/verify/${orderId}`);
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

