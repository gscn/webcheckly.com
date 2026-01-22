-- 创建 user_credits 表（用户余额和免费额度）
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    credits INT DEFAULT 0 NOT NULL CHECK (credits >= 0),
    free_scans_remaining INT DEFAULT 10 NOT NULL CHECK (free_scans_remaining >= 0),
    free_scans_reset_at TIMESTAMP WITH TIME ZONE,
    monthly_credits_used INT DEFAULT 0 NOT NULL CHECK (monthly_credits_used >= 0),
    monthly_credits_reset_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

