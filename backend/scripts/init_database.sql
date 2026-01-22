-- ============================================
-- WebCheckly 数据库全量初始化脚本
-- ============================================
-- 版本：v1.0
-- 创建日期：2026-01-22
-- 
-- 说明：此脚本用于初始化全新的数据库，包含所有表结构、索引、触发器和初始数据
-- 
-- 包含内容：
--   - 13 个核心表结构
--   - 50+ 个索引
--   - 触发器和函数
--   - 11 个功能定价初始数据
--   - 19 个迁移记录
--
-- 使用方式：
--   psql -d your_database -f backend/scripts/init_database.sql
--   或者：\i backend/scripts/init_database.sql (在psql中)
--
-- 注意：
--   - 此脚本整合了所有 migrations/ 目录下的迁移文件
--   - 执行后会记录所有迁移为已执行
--   - 适用于全新数据库的快速初始化
-- ============================================

-- 开始事务（确保原子性）
BEGIN;

-- ============================================
-- 1. 创建迁移记录表
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 创建 users 表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    invite_code VARCHAR(32) UNIQUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 创建 users 表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);

-- 创建 updated_at 自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建 users 表的 updated_at 触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 创建 oauth_providers 表（预留第三方登录）
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- 创建 oauth_providers 表索引
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);

-- 创建 oauth_providers 表的 updated_at 触发器
CREATE TRIGGER update_oauth_providers_updated_at BEFORE UPDATE ON oauth_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. 创建 tasks 表（任务持久化）
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    target_url VARCHAR(2048) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    language VARCHAR(10) DEFAULT 'zh',
    ai_mode VARCHAR(50) DEFAULT 'balanced',
    is_public BOOLEAN DEFAULT false,
    progress JSONB DEFAULT '{"current": 0, "total": 0}'::jsonb,
    modules JSONB DEFAULT '{}'::jsonb,
    results JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建 tasks 表索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_created_at ON tasks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_public ON tasks(is_public);

-- ============================================
-- 5. 创建 subscriptions 表（用户订阅）
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'canceled', 'expired', 'pending')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    paypal_subscription_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 subscriptions 表索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_subscription_id ON subscriptions(paypal_subscription_id);

-- 每个用户只能有一个有效订阅（通过唯一约束实现）
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id_active ON subscriptions(user_id) WHERE status = 'active';

-- ============================================
-- 6. 创建 user_credits 表（用户余额和免费额度）
-- ============================================
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    credits INT DEFAULT 0 NOT NULL CHECK (credits >= 0),
    monthly_credits_used INT DEFAULT 0 NOT NULL CHECK (monthly_credits_used >= 0),
    monthly_credits_reset_at TIMESTAMP WITH TIME ZONE,
    last_daily_reward_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 user_credits 表索引
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- ============================================
-- 7. 创建 subscription_usage 表（订阅使用记录）
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    basic_scans_used INT DEFAULT 0 NOT NULL CHECK (basic_scans_used >= 0),
    premium_features_used INT DEFAULT 0 NOT NULL CHECK (premium_features_used >= 0),
    credits_used INT DEFAULT 0 NOT NULL CHECK (credits_used >= 0),
    api_access_used INT DEFAULT 0 NOT NULL CHECK (api_access_used >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- 创建 subscription_usage 表索引
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_month ON subscription_usage(month);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);

-- ============================================
-- 8. 创建 orders 表（订单）
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('single_scan', 'credits_purchase', 'subscription')),
    feature VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    amount_usd DECIMAL(10,2) CHECK (amount_usd >= 0),
    credits_amount INT DEFAULT 0 NOT NULL CHECK (credits_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'canceled')),
    payment_method VARCHAR(50) DEFAULT 'stripe',
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_checkout_session_id VARCHAR(255) UNIQUE,
    paypal_order_id VARCHAR(255) UNIQUE,
    paypal_payment_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 创建 orders 表索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid_at ON orders(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_status ON orders(payment_method, status);
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_paypal_payment_id ON orders(paypal_payment_id);

-- ============================================
-- 9. 创建 usage_records 表（使用记录）
-- ============================================
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

-- 创建 usage_records 表索引
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_scan_date ON usage_records(scan_date);
CREATE INDEX IF NOT EXISTS idx_usage_records_feature_type ON usage_records(feature_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_task_id ON usage_records(task_id);

-- ============================================
-- 10. 创建 feature_pricing 表（功能定价配置）
-- ============================================
CREATE TABLE IF NOT EXISTS feature_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_code VARCHAR(100) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    feature_category VARCHAR(50) NOT NULL CHECK (feature_category IN ('basic', 'premium')),
    single_price DECIMAL(10,2) NOT NULL CHECK (single_price >= 0),
    single_price_usd DECIMAL(10,2) NOT NULL CHECK (single_price_usd >= 0),
    credits_cost INT DEFAULT 0 NOT NULL CHECK (credits_cost >= 0),
    is_premium BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 feature_pricing 表索引
CREATE INDEX IF NOT EXISTS idx_feature_pricing_feature_code ON feature_pricing(feature_code);
CREATE INDEX IF NOT EXISTS idx_feature_pricing_feature_category ON feature_pricing(feature_category);
CREATE INDEX IF NOT EXISTS idx_feature_pricing_is_available ON feature_pricing(is_available);

-- ============================================
-- 11. 插入默认定价数据
-- ============================================
INSERT INTO feature_pricing (feature_code, feature_name, feature_category, single_price, single_price_usd, credits_cost, is_premium, is_available) VALUES
-- 基础功能（免费）
('link-health', '页面链接检查', 'basic', 0.00, 0.00, 0, false, true),
('website-info', '网站信息', 'basic', 0.00, 0.00, 0, false, true),
('domain-info', '域名信息', 'basic', 0.00, 0.00, 0, false, true),
('ssl-info', 'SSL证书', 'basic', 0.00, 0.00, 0, false, true),
('tech-stack', '技术栈', 'basic', 0.00, 0.00, 0, false, true),
-- 高级功能（付费）
('performance', '性能检测', 'premium', 5.00, 0.70, 5, true, true),
('seo', 'SEO检测', 'premium', 5.00, 0.70, 5, true, true),
('security', '安全检测', 'premium', 5.00, 0.70, 5, true, true),
('accessibility', '可访问性', 'premium', 5.00, 0.70, 5, true, true),
('ai-analysis', 'AI分析', 'premium', 10.00, 1.40, 10, true, true),
('deep-scan', '全站链接检查', 'premium', 10.00, 1.40, 10, true, true)
ON CONFLICT (feature_code) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    feature_category = EXCLUDED.feature_category,
    single_price = EXCLUDED.single_price,
    single_price_usd = EXCLUDED.single_price_usd,
    credits_cost = EXCLUDED.credits_cost,
    is_premium = EXCLUDED.is_premium,
    is_available = EXCLUDED.is_available,
    updated_at = NOW();

-- ============================================
-- 12. 创建 api_access_records 表（API访问记录）
-- ============================================
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

-- 创建 api_access_records 表索引
CREATE INDEX IF NOT EXISTS idx_api_access_records_user_id ON api_access_records(user_id);
CREATE INDEX IF NOT EXISTS idx_api_access_records_created_at ON api_access_records(created_at);
CREATE INDEX IF NOT EXISTS idx_api_access_records_user_created ON api_access_records(user_id, created_at);

-- ============================================
-- 13. 创建 website_blacklist 表（网站黑名单）
-- ============================================
CREATE TABLE IF NOT EXISTS website_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(2048) NOT NULL,  -- 使用 2048 以匹配 tasks.target_url 的长度
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('exact', 'domain')),
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 创建 website_blacklist 表索引
CREATE INDEX IF NOT EXISTS idx_website_blacklist_target ON website_blacklist(target);
CREATE INDEX IF NOT EXISTS idx_website_blacklist_match_type ON website_blacklist(match_type);
CREATE INDEX IF NOT EXISTS idx_website_blacklist_is_active ON website_blacklist(is_active);
CREATE INDEX IF NOT EXISTS idx_website_blacklist_target_match_type_active ON website_blacklist(target, match_type, is_active);

-- ============================================
-- 14. 创建 user_blacklist 表（用户黑名单）
-- ============================================
CREATE TABLE IF NOT EXISTS user_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 创建唯一约束：一个用户只能有一条生效的黑名单记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_blacklist_user_active_unique 
ON user_blacklist(user_id) 
WHERE is_active = true;

-- 创建 user_blacklist 表索引
CREATE INDEX IF NOT EXISTS idx_user_blacklist_user_id ON user_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blacklist_is_active ON user_blacklist(is_active);
CREATE INDEX IF NOT EXISTS idx_user_blacklist_user_id_active ON user_blacklist(user_id, is_active);

-- ============================================
-- 15. 记录所有迁移
-- ============================================
INSERT INTO schema_migrations (name) VALUES
    ('001_create_users_table'),
    ('002_create_oauth_providers_table'),
    ('003_add_user_id_to_tasks'),
    ('010_create_tasks_table'),
    ('011_create_subscriptions_table'),
    ('012_create_user_credits_table'),
    ('013_create_subscription_usage_table'),
    ('014_create_orders_table'),
    ('015_create_usage_records_table'),
    ('016_create_feature_pricing_table'),
    ('017_insert_default_pricing'),
    ('018_add_user_role'),
    ('019_remove_free_scans_add_rewards_and_invites'),
    ('020_add_paypal_fields'),
    ('021_create_api_access_records_table'),
    ('022_update_deep_scan_credits'),
    ('023_create_website_blacklist_table'),
    ('024_create_user_blacklist_table'),
    ('025_add_paid_at_index')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 完成
-- ============================================
COMMIT;

-- ============================================
-- 显示初始化结果
-- ============================================
\echo ''
\echo '============================================'
\echo '数据库初始化完成！'
\echo '============================================'
\echo ''

-- 显示表数量
SELECT 
    '✓ 表结构' AS category,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 13 THEN '✓ 通过'
        ELSE '✗ 失败'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%';

-- 显示迁移记录
SELECT 
    '✓ 迁移记录' AS category,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 19 THEN '✓ 通过'
        ELSE '✗ 失败'
    END AS status
FROM schema_migrations;

-- 显示功能定价
SELECT 
    '✓ 功能定价' AS category,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 11 THEN '✓ 通过'
        ELSE '✗ 失败'
    END AS status
FROM feature_pricing;

\echo ''
\echo '============================================'
\echo '初始化验证完成！'
\echo '如需详细验证，请运行: psql -d your_database -f verify_init.sql'
\echo '============================================'
\echo ''
