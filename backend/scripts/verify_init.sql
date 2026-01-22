-- ============================================
-- WebCheckly 数据库初始化验证脚本
-- ============================================
-- 说明：此脚本用于验证数据库初始化是否成功
-- 使用方式：psql -d your_database -f verify_init.sql
-- ============================================

\echo '============================================'
\echo 'WebCheckly 数据库初始化验证'
\echo '============================================'
\echo ''

-- 1. 检查表数量
\echo '1. 检查表结构...'
SELECT 
    COUNT(*) AS total_tables,
    CASE 
        WHEN COUNT(*) >= 13 THEN '✓ 通过'
        ELSE '✗ 失败：表数量不足'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%';

\echo ''
\echo '详细表列表：'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'users', 'oauth_providers', 'tasks', 'subscriptions',
            'user_credits', 'subscription_usage', 'orders',
            'usage_records', 'feature_pricing', 'api_access_records',
            'website_blacklist', 'user_blacklist', 'schema_migrations'
        ) THEN '✓'
        ELSE '?'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

\echo ''
\echo '============================================'

-- 2. 检查迁移记录
\echo '2. 检查迁移记录...'
SELECT 
    COUNT(*) AS total_migrations,
    CASE 
        WHEN COUNT(*) >= 19 THEN '✓ 通过'
        ELSE '✗ 失败：迁移记录不足'
    END AS status
FROM schema_migrations;

\echo ''
\echo '迁移记录列表：'
SELECT 
    name,
    executed_at
FROM schema_migrations
ORDER BY executed_at;

\echo ''
\echo '============================================'

-- 3. 检查功能定价
\echo '3. 检查功能定价数据...'
SELECT 
    COUNT(*) AS total_features,
    CASE 
        WHEN COUNT(*) >= 11 THEN '✓ 通过'
        ELSE '✗ 失败：功能定价数据不足'
    END AS status
FROM feature_pricing;

\echo ''
\echo '功能定价列表：'
SELECT 
    feature_code,
    feature_name,
    feature_category,
    credits_cost,
    is_premium,
    is_available
FROM feature_pricing
ORDER BY feature_category, feature_code;

\echo ''
\echo '============================================'

-- 4. 检查索引
\echo '4. 检查关键索引...'
SELECT 
    COUNT(*) AS total_indexes,
    CASE 
        WHEN COUNT(*) >= 50 THEN '✓ 通过'
        ELSE '⚠ 警告：索引数量可能不足'
    END AS status
FROM pg_indexes
WHERE schemaname = 'public';

\echo ''
\echo '关键索引列表（前20个）：'
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname
LIMIT 20;

\echo ''
\echo '============================================'

-- 5. 检查触发器
\echo '5. 检查触发器...'
SELECT 
    COUNT(*) AS total_triggers,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✓ 通过'
        ELSE '⚠ 警告：触发器数量可能不足'
    END AS status
FROM information_schema.triggers
WHERE trigger_schema = 'public';

\echo ''
\echo '触发器列表：'
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '============================================'

-- 6. 检查外键约束
\echo '6. 检查外键约束...'
SELECT 
    COUNT(*) AS total_foreign_keys,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✓ 通过'
        ELSE '⚠ 警告：外键约束数量可能不足'
    END AS status
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY';

\echo ''
\echo '============================================'

-- 7. 检查函数
\echo '7. 检查函数...'
SELECT 
    COUNT(*) AS total_functions,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✓ 通过'
        ELSE '✗ 失败：函数缺失'
    END AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';

\echo ''
\echo '函数列表：'
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

\echo ''
\echo '============================================'

-- 8. 总结
\echo '8. 初始化验证总结'
\echo '============================================'
SELECT 
    '数据库初始化验证完成' AS message,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'pg_%') AS tables,
    (SELECT COUNT(*) FROM schema_migrations) AS migrations,
    (SELECT COUNT(*) FROM feature_pricing) AS features,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS indexes,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') AS triggers,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY') AS foreign_keys;

\echo ''
\echo '如果所有检查都显示 ✓ 通过，则数据库初始化成功！'
\echo ''
