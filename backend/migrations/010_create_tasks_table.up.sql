-- 创建 tasks 表（任务持久化）
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_created_at ON tasks(user_id, created_at);

