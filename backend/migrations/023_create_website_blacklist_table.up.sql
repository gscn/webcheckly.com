-- 创建 website_blacklist 表（网站黑名单）
CREATE TABLE IF NOT EXISTS website_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(500) NOT NULL,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('exact', 'domain')),
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_website_blacklist_target ON website_blacklist(target);
CREATE INDEX IF NOT EXISTS idx_website_blacklist_match_type ON website_blacklist(match_type);
CREATE INDEX IF NOT EXISTS idx_website_blacklist_is_active ON website_blacklist(is_active);
CREATE INDEX IF NOT EXISTS idx_website_blacklist_target_active ON website_blacklist(target, is_active);
