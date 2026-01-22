-- 回滚：删除索引
DROP INDEX IF EXISTS idx_orders_paid_at;
DROP INDEX IF EXISTS idx_orders_status_paid_at;
DROP INDEX IF EXISTS idx_orders_payment_method_status;
