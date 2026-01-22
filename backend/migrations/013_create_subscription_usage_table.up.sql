-- 创建 subscription_usage 表（订阅使用记录）
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    basic_scans_used INT DEFAULT 0 NOT NULL CHECK (basic_scans_used >= 0),
    premium_features_used INT DEFAULT 0 NOT NULL CHECK (premium_features_used >= 0),
    credits_used INT DEFAULT 0 NOT NULL CHECK (credits_used >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_month ON subscription_usage(month);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);

