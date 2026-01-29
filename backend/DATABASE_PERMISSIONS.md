# 数据库权限修复指南

## 问题

日志中出现以下错误：
```
pq: permission denied for table website_blacklist
pq: permission denied for table user_blacklist
```

## 原因

运行后端服务的数据库用户没有访问黑名单表的权限。

## 解决方案

### 方法 1: 授予表权限（推荐）

以 PostgreSQL 超级用户身份执行：

```sql
-- 连接到数据库
\c webcheckly

-- 授予 SELECT 权限（用于查询黑名单）
GRANT SELECT ON website_blacklist TO your_db_user;
GRANT SELECT ON user_blacklist TO your_db_user;

-- 如果还需要管理功能，授予完整权限
GRANT ALL PRIVILEGES ON website_blacklist TO your_db_user;
GRANT ALL PRIVILEGES ON user_blacklist TO your_db_user;

-- 授予序列权限（如果使用自增ID）
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
```

### 方法 2: 使用超级用户运行服务（不推荐）

如果使用超级用户运行服务，会有所有权限，但存在安全风险。

### 方法 3: 代码已优雅处理（当前实现）

最新版本的代码已经优雅处理权限错误：
- 如果遇到权限错误，只记录警告，不阻塞流程
- 服务会继续运行，只是无法检查黑名单
- 如果需要黑名单功能，请使用方法 1 修复权限

## 验证修复

1. **检查权限**：
```sql
-- 查看当前用户的表权限
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('website_blacklist', 'user_blacklist');
```

2. **测试查询**：
```sql
-- 以服务用户身份测试
SELECT COUNT(*) FROM website_blacklist;
SELECT COUNT(*) FROM user_blacklist;
```

3. **检查日志**：
重启服务后，应该不再看到 "permission denied" 错误。

## 相关表

- `website_blacklist` - 网站黑名单表
- `user_blacklist` - 用户黑名单表

## 注意事项

- 黑名单功能是可选的，权限错误不会影响其他功能
- 如果不需要黑名单功能，可以忽略这些警告
- 建议在生产环境中正确配置权限以确保安全
