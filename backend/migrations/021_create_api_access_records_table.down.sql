-- 回滚：删除 api_access_records 表
DROP TABLE IF EXISTS api_access_records;

-- 回滚：从 subscription_usage 表删除 api_access_used 字段
ALTER TABLE subscription_usage
DROP COLUMN IF EXISTS api_access_used;
