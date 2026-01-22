-- 在 tasks 表中添加 user_id 和 is_public 字段
-- 注意：如果 tasks 表不存在，这个迁移会失败，需要先创建 tasks 表
-- 由于 tasks 表可能是内存中的，这里只添加字段（如果表存在）

-- 添加 user_id 字段（允许 NULL，支持匿名任务）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_is_public ON tasks(is_public);
    END IF;
END $$;

