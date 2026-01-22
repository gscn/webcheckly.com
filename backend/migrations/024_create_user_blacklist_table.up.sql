-- 创建 user_blacklist 表（用户黑名单）
CREATE TABLE IF NOT EXISTS user_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_blacklist_user_id ON user_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blacklist_is_active ON user_blacklist(is_active);
CREATE INDEX IF NOT EXISTS idx_user_blacklist_user_active ON user_blacklist(user_id, is_active);

-- 创建唯一约束：一个用户只能有一条生效的黑名单记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_blacklist_user_active_unique 
ON user_blacklist(user_id) 
WHERE is_active = true;
