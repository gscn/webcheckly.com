-- 创建 usage_records 表（使用记录）
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    feature_type VARCHAR(100) NOT NULL,
    credits_used INT DEFAULT 0 NOT NULL CHECK (credits_used >= 0),
    is_free BOOLEAN DEFAULT false,
    is_refunded BOOLEAN DEFAULT false,
    scan_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_scan_date ON usage_records(scan_date);
CREATE INDEX IF NOT EXISTS idx_usage_records_feature_type ON usage_records(feature_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_task_id ON usage_records(task_id);

