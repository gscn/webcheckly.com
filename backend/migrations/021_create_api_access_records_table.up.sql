-- 创建 api_access_records 表（API访问记录）
CREATE TABLE IF NOT EXISTS api_access_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status_code INT,
    response_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_access_records_user_id ON api_access_records(user_id);
CREATE INDEX IF NOT EXISTS idx_api_access_records_created_at ON api_access_records(created_at);
CREATE INDEX IF NOT EXISTS idx_api_access_records_user_created ON api_access_records(user_id, created_at);

-- 添加月度API访问统计字段到 subscription_usage 表
ALTER TABLE subscription_usage
ADD COLUMN IF NOT EXISTS api_access_used INT DEFAULT 0 NOT NULL CHECK (api_access_used >= 0);
