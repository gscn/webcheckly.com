-- 创建 feature_pricing 表（功能定价配置）
CREATE TABLE IF NOT EXISTS feature_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_code VARCHAR(100) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    feature_category VARCHAR(50) NOT NULL CHECK (feature_category IN ('basic', 'premium')),
    single_price DECIMAL(10,2) NOT NULL CHECK (single_price >= 0),
    single_price_usd DECIMAL(10,2) NOT NULL CHECK (single_price_usd >= 0),
    credits_cost INT DEFAULT 0 NOT NULL CHECK (credits_cost >= 0),
    is_premium BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feature_pricing_feature_code ON feature_pricing(feature_code);
CREATE INDEX IF NOT EXISTS idx_feature_pricing_feature_category ON feature_pricing(feature_category);
CREATE INDEX IF NOT EXISTS idx_feature_pricing_is_available ON feature_pricing(is_available);

