-- 添加用户角色字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' NOT NULL;

-- 创建角色索引以优化查询
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 更新现有用户，确保所有用户都有角色
UPDATE users SET role = 'user' WHERE role IS NULL;

