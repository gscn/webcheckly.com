-- 回滚迁移

-- 恢复免费使用次数字段
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS free_scans_remaining INT DEFAULT 10 NOT NULL CHECK (free_scans_remaining >= 0);
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS free_scans_reset_at TIMESTAMP WITH TIME ZONE;

-- 删除新添加的字段
ALTER TABLE user_credits DROP COLUMN IF EXISTS last_daily_reward_at;
ALTER TABLE users DROP COLUMN IF EXISTS invite_code;
ALTER TABLE users DROP COLUMN IF EXISTS invited_by;

-- 删除索引
DROP INDEX IF EXISTS idx_users_invite_code;
DROP INDEX IF EXISTS idx_users_invited_by;

