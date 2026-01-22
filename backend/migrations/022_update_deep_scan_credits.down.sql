-- 回滚：将 deep-scan 功能的积分成本恢复为 8
UPDATE feature_pricing 
SET credits_cost = 8, 
    single_price = 8.00, 
    single_price_usd = 1.12,
    updated_at = NOW()
WHERE feature_code = 'deep-scan';
