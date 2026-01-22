-- 更新 deep-scan 功能的积分成本为 10
UPDATE feature_pricing 
SET credits_cost = 10, 
    single_price = 10.00, 
    single_price_usd = 1.40,
    updated_at = NOW()
WHERE feature_code = 'deep-scan';
