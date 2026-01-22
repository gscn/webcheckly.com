-- 插入默认定价数据
INSERT INTO feature_pricing (feature_code, feature_name, feature_category, single_price, single_price_usd, credits_cost, is_premium, is_available) VALUES
-- 基础功能（免费）
('link-health', '链接健康检查', 'basic', 0.00, 0.00, 0, false, true),
('website-info', '网站信息', 'basic', 0.00, 0.00, 0, false, true),
('domain-info', '域名信息', 'basic', 0.00, 0.00, 0, false, true),
('ssl-info', 'SSL证书', 'basic', 0.00, 0.00, 0, false, true),
('tech-stack', '技术栈', 'basic', 0.00, 0.00, 0, false, true),
-- 高级功能（付费）
('performance', '性能检测', 'premium', 5.00, 0.70, 5, true, true),
('seo', 'SEO检测', 'premium', 5.00, 0.70, 5, true, true),
('security', '安全检测', 'premium', 5.00, 0.70, 5, true, true),
('accessibility', '可访问性', 'premium', 5.00, 0.70, 5, true, true),
('ai-analysis', 'AI分析', 'premium', 10.00, 1.40, 10, true, true),
('deep-scan', '深度扫描', 'premium', 10.00, 1.40, 10, true, true)
ON CONFLICT (feature_code) DO NOTHING;

