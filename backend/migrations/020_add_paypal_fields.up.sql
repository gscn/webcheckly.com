-- 添加PayPal相关字段到orders表
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS paypal_payment_id VARCHAR(255) UNIQUE;

-- 添加PayPal相关字段到subscriptions表
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255) UNIQUE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_paypal_payment_id ON orders(paypal_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_subscription_id ON subscriptions(paypal_subscription_id);
