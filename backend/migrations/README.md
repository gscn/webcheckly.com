# 数据库迁移文件说明

## ⚠️ 重要提示

**迁移文件不应被删除！** 这些文件是数据库版本控制的核心，用于：

1. **增量更新**：对已有数据库进行增量更新
2. **版本控制**：记录数据库结构变更历史
3. **回滚支持**：`.down.sql` 文件支持回滚操作
4. **自动化迁移**：`RunMigrations()` 函数依赖这些文件

## 文件结构

### 迁移文件命名规则

- `XXX_description.up.sql` - 升级迁移（创建/修改）
- `XXX_description.down.sql` - 回滚迁移（删除/还原）

### 当前迁移文件列表

| 编号 | 文件名 | 说明 | 状态 |
|------|--------|------|------|
| 001 | `001_create_users_table.up.sql` | 创建用户表 | ✅ 必需 |
| 002 | `002_create_oauth_providers_table.up.sql` | 创建OAuth提供商表 | ✅ 必需 |
| 003 | `003_add_user_id_to_tasks.up.sql` | 添加任务用户关联 | ✅ 必需 |
| 010 | `010_create_tasks_table.up.sql` | 创建任务表 | ✅ 必需 |
| 011 | `011_create_subscriptions_table.up.sql` | 创建订阅表 | ✅ 必需 |
| 012 | `012_create_user_credits_table.up.sql` | 创建用户积分表 | ✅ 必需 |
| 013 | `013_create_subscription_usage_table.up.sql` | 创建订阅使用记录表 | ✅ 必需 |
| 014 | `014_create_orders_table.up.sql` | 创建订单表 | ✅ 必需 |
| 015 | `015_create_usage_records_table.up.sql` | 创建使用记录表 | ✅ 必需 |
| 016 | `016_create_feature_pricing_table.up.sql` | 创建功能定价表 | ✅ 必需 |
| 017 | `017_insert_default_pricing.up.sql` | 插入默认定价数据 | ✅ 必需 |
| 018 | `018_add_user_role.up.sql` | 添加用户角色字段 | ✅ 必需 |
| 019 | `019_remove_free_scans_add_rewards_and_invites.up.sql` | 移除免费扫描，添加奖励和邀请 | ✅ 必需 |
| 020 | `020_add_paypal_fields.up.sql` | 添加PayPal字段 | ✅ 必需 |
| 021 | `021_create_api_access_records_table.up.sql` | 创建API访问记录表 | ✅ 必需 |
| 022 | `022_update_deep_scan_credits.up.sql` | 更新深度扫描积分 | ✅ 必需 |
| 023 | `023_create_website_blacklist_table.up.sql` | 创建网站黑名单表 | ✅ 必需 |
| 024 | `024_create_user_blacklist_table.up.sql` | 创建用户黑名单表 | ✅ 必需 |
| 025 | `025_add_paid_at_index.up.sql` | 添加支付时间索引 | ✅ 必需 |

## 迁移系统工作原理

1. **启动时自动执行**：应用启动时，`RunMigrations()` 会自动执行未执行的迁移
2. **按顺序执行**：迁移文件按文件名排序执行
3. **跳过已执行**：已执行的迁移会被记录在 `schema_migrations` 表中，不会重复执行
4. **事务安全**：每个迁移在事务中执行，失败会回滚

## 与 init_database.sql 的关系

- **`init_database.sql`**：用于全新数据库的快速初始化，整合了所有迁移内容
- **`migrations/` 目录**：用于已有数据库的增量更新

### 使用场景

| 场景 | 使用方案 |
|------|----------|
| 全新数据库 | 使用 `scripts/init_database.sql` |
| 已有数据库更新 | 使用 `migrations/` 目录下的迁移文件 |
| 生产环境部署 | 使用迁移系统（自动执行） |

## 清理建议

### ❌ 不应删除

- 所有 `.up.sql` 文件（迁移系统依赖）
- 所有 `.down.sql` 文件（回滚支持）

### ✅ 可以清理的情况

1. **重复的临时文件**：如果有重复的迁移文件
2. **测试文件**：如果有测试用的迁移文件
3. **已废弃的迁移**：如果有明确标记为废弃的迁移（当前没有）

## 维护建议

1. **保持文件顺序**：迁移文件编号应保持连续
2. **成对出现**：`.up.sql` 和 `.down.sql` 应成对存在
3. **文档化**：每个迁移文件应包含清晰的注释说明
4. **测试迁移**：在生产环境执行前，应在测试环境验证

## 故障排除

### 迁移执行失败

1. 检查迁移文件语法
2. 检查数据库连接
3. 查看应用日志
4. 手动执行迁移文件进行调试

### 迁移顺序问题

- 确保迁移文件编号连续且有序
- 不要跳过编号（如 001, 002, 010 是允许的，但 001, 002, 005 更好）

## 相关文件

- `../scripts/init_database.sql` - 全量初始化脚本
- `../scripts/verify_init.sql` - 初始化验证脚本
- `../database/db.go` - 迁移系统实现
