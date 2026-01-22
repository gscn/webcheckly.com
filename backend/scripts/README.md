# 数据库脚本目录

本目录包含数据库相关的 SQL 脚本和文档。

## 文件说明

### 核心脚本

- **`init_database.sql`** - 全量数据库初始化脚本
  - 用于初始化全新的数据库
  - 包含所有表结构、索引、触发器和初始数据
  - 整合了所有 migrations/ 目录下的迁移文件
  - 详细使用说明请参考 `README_INIT.md`

- **`verify_init.sql`** - 数据库初始化验证脚本
  - 用于验证数据库初始化是否成功
  - 检查表结构、迁移记录、功能定价等
  - 提供详细的验证报告

### 文档

- **`README_INIT.md`** - 初始化脚本使用说明
  - 详细的使用方法
  - 功能说明
  - 注意事项和故障排除

## 快速开始

### 初始化数据库

```bash
# 方法1：使用 psql 命令行
psql -d your_database_name -f backend/scripts/init_database.sql

# 方法2：在 psql 交互式环境中
psql -d your_database_name
\i backend/scripts/init_database.sql
```

### 验证初始化

```bash
psql -d your_database_name -f backend/scripts/verify_init.sql
```

## 已整合的旧文件

以下旧文件已被整合到 `init_database.sql` 中，不再需要单独使用：

- ❌ `check_migrations.sql` - 已整合到 `verify_init.sql`
- ❌ `run_migration_021.sql` - 已整合到 `init_database.sql`

## 注意事项

1. **数据安全**：初始化脚本会创建全新的数据库结构，请确保已备份现有数据
2. **权限要求**：需要数据库的 CREATE TABLE、CREATE INDEX 等权限
3. **PostgreSQL 版本**：需要 PostgreSQL 12 或更高版本（推荐 13+）

## 相关目录

- `../migrations/` - 数据库迁移文件目录（用于增量更新）
- `../database/` - 数据库操作代码目录
