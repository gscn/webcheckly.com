# 数据库初始化脚本使用说明

## 文件说明

- `init_database.sql` - 全量数据库初始化脚本，用于创建全新的数据库
- `verify_init.sql` - 数据库初始化验证脚本，用于验证初始化是否成功
- `README_INIT.md` - 本使用说明文档

**注意**：旧的临时 SQL 文件（如 `check_migrations.sql`、`run_migration_021.sql`）已被整合到 `init_database.sql` 中，不再需要单独使用。

## 使用方法

### 方法1：使用 psql 命令行工具

```bash
# 连接到数据库并执行脚本
psql -d your_database_name -f backend/scripts/init_database.sql

# 或者指定用户和主机
psql -h localhost -U postgres -d webcheckly -f backend/scripts/init_database.sql
```

### 方法2：在 psql 交互式环境中执行

```bash
# 进入 psql
psql -d your_database_name

# 在 psql 中执行
\i backend/scripts/init_database.sql
```

### 方法3：使用环境变量

```bash
# 设置数据库连接字符串
export DATABASE_URL="postgres://user:password@localhost:5432/webcheckly?sslmode=disable"

# 执行脚本
psql $DATABASE_URL -f backend/scripts/init_database.sql
```

## 脚本功能

此脚本会创建以下内容：

1. **迁移记录表** (`schema_migrations`)
   - 用于跟踪已执行的迁移

2. **核心表结构**
   - `users` - 用户表
   - `oauth_providers` - OAuth提供商表（预留）
   - `tasks` - 任务表
   - `subscriptions` - 订阅表
   - `user_credits` - 用户积分表
   - `subscription_usage` - 订阅使用记录表
   - `orders` - 订单表
   - `usage_records` - 使用记录表
   - `feature_pricing` - 功能定价表
   - `api_access_records` - API访问记录表
   - `website_blacklist` - 网站黑名单表
   - `user_blacklist` - 用户黑名单表

3. **索引和约束**
   - 所有必要的索引
   - 外键约束
   - 唯一约束
   - 检查约束

4. **触发器和函数**
   - `update_updated_at_column()` - 自动更新 updated_at 字段
   - 各表的 updated_at 触发器

5. **初始数据**
   - 功能定价数据（11个功能）

6. **迁移记录**
   - 记录所有19个迁移已执行

## 注意事项

1. **数据安全**
   - 此脚本会创建全新的数据库结构
   - 如果数据库已存在数据，请先备份
   - 脚本使用 `IF NOT EXISTS` 和 `ON CONFLICT` 来避免重复创建

2. **事务处理**
   - 脚本使用事务（BEGIN/COMMIT）确保原子性
   - 如果任何步骤失败，所有更改都会回滚

3. **权限要求**
   - 需要数据库的 CREATE TABLE、CREATE INDEX 等权限
   - 建议使用数据库管理员账户

4. **PostgreSQL 版本**
   - 需要 PostgreSQL 12 或更高版本
   - 使用了 `gen_random_uuid()` 函数（PostgreSQL 13+）

## 验证初始化结果

执行脚本后，可以运行以下查询验证：

```sql
-- 检查表数量
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 检查迁移记录
SELECT * FROM schema_migrations ORDER BY executed_at;

-- 检查功能定价
SELECT feature_code, feature_name, credits_cost FROM feature_pricing;
```

## 与迁移系统的关系

- 此脚本包含了所有迁移文件的内容
- 执行后会记录所有迁移为已执行
- 之后运行应用时，迁移系统会跳过所有迁移
- 适用于全新数据库的快速初始化

## 故障排除

### 错误：relation already exists
- 说明表已存在，这是正常的（使用了 IF NOT EXISTS）
- 可以继续执行，不会影响现有数据

### 错误：permission denied
- 检查数据库用户权限
- 确保有 CREATE TABLE、CREATE INDEX 等权限

### 错误：function gen_random_uuid() does not exist
- PostgreSQL 版本过低
- 需要升级到 PostgreSQL 13 或更高版本
- 或者使用 `uuid_generate_v4()` 替代（需要启用 uuid-ossp 扩展）

## 后续步骤

初始化完成后：

1. 配置环境变量（`DATABASE_URL`、`JWT_SECRET` 等）
2. 启动后端服务（会自动验证数据库连接）
3. 创建管理员账户（通过注册或直接插入数据库）
4. 开始使用系统
