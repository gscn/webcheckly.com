-- 回滚PayPal字段添加
DROP INDEX IF EXISTS idx_subscriptions_paypal_subscription_id;
DROP INDEX IF EXISTS idx_orders_paypal_payment_id;
DROP INDEX IF EXISTS idx_orders_paypal_order_id;

ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS paypal_subscription_id;

ALTER TABLE orders 
DROP COLUMN IF EXISTS paypal_payment_id,
DROP COLUMN IF EXISTS paypal_order_id;
