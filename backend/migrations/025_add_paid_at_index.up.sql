-- 为 orders 表的 paid_at 字段创建索引（优化收入对账查询）
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid_at ON orders(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_status ON orders(payment_method, status);
