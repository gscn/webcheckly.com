-- 移除免费使用次数相关字段，添加每日登录奖励和邀请系统字段

-- 1. 添加last_daily_reward_at字段（用于每日登录奖励）
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS last_daily_reward_at TIMESTAMP WITH TIME ZONE;

-- 2. 添加invite_code字段到users表（用户的邀请码）
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code VARCHAR(32) UNIQUE;

-- 3. 添加invited_by字段到users表（记录邀请人ID）
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. 为现有用户生成邀请码
UPDATE users SET invite_code = 'INV' || SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 29) WHERE invite_code IS NULL;

-- 5. 删除free_scans_remaining和free_scans_reset_at字段（注意：在生产环境执行前需要确保数据已迁移）
-- ALTER TABLE user_credits DROP COLUMN IF EXISTS free_scans_remaining;
-- ALTER TABLE user_credits DROP COLUMN IF EXISTS free_scans_reset_at;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);

