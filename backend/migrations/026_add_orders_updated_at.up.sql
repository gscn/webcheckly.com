-- 为 orders 表添加 updated_at 字段（与 UpdateOrderStatus/UpdateOrderPayPalInfo 使用一致）
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 将已有行的 updated_at 设为 paid_at 或 created_at，便于历史数据一致
UPDATE orders SET updated_at = COALESCE(paid_at, created_at);
