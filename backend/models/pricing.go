package models

import "time"

// FeaturePricing 功能定价
type FeaturePricing struct {
	ID              string    `json:"id" db:"id"`
	FeatureCode     string    `json:"feature_code" db:"feature_code"`
	FeatureName     string    `json:"feature_name" db:"feature_name"`
	FeatureCategory string    `json:"feature_category" db:"feature_category"`
	SinglePrice     float64   `json:"single_price" db:"single_price"`         // CNY价格
	SinglePriceUSD  float64   `json:"single_price_usd" db:"single_price_usd"` // USD价格
	CreditsCost     int       `json:"credits_cost" db:"credits_cost"`
	IsPremium       bool      `json:"is_premium" db:"is_premium"`
	IsAvailable     bool      `json:"is_available" db:"is_available"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// PricingPlan 套餐定价信息
type PricingPlan struct {
	PlanType            string   `json:"plan_type"` // 'basic', 'pro', 'enterprise'
	PlanName            string   `json:"plan_name"`
	MonthlyPriceCNY     float64  `json:"monthly_price_cny"`
	MonthlyPriceUSD     float64  `json:"monthly_price_usd"`
	BasicScansLimit     int      `json:"basic_scans_limit"`          // 基础扫描次数限制
	MonthlyCreditsLimit int      `json:"monthly_credits_limit"`      // 月度积分额度
	TaskHistoryDays     int      `json:"task_history_days"`          // 任务历史保留天数（-1表示永久）
	APIAccessLimit      *int     `json:"api_access_limit,omitempty"` // API访问限制（nil表示无限制）
	Features            []string `json:"features"`                   // 包含的功能列表
}

// GetDefaultPricingPlans 获取默认套餐定价
func GetDefaultPricingPlans() []PricingPlan {
	return []PricingPlan{
		{
			PlanType:            "basic",
			PlanName:            "基础版",
			MonthlyPriceCNY:     29.00,
			MonthlyPriceUSD:     4.06,
			BasicScansLimit:     50,
			MonthlyCreditsLimit: 50,
			TaskHistoryDays:     30,
			APIAccessLimit:      nil,
			Features:            []string{"基础扫描", "10次高级功能", "30天任务历史"},
		},
		{
			PlanType:            "pro",
			PlanName:            "专业版",
			MonthlyPriceCNY:     99.00,
			MonthlyPriceUSD:     13.86,
			BasicScansLimit:     200,
			MonthlyCreditsLimit: 200,
			TaskHistoryDays:     90,
			APIAccessLimit:      intPtr(1000),
			Features:            []string{"基础扫描", "50次高级功能", "90天任务历史", "API访问"},
		},
		{
			PlanType:            "enterprise",
			PlanName:            "企业版",
			MonthlyPriceCNY:     299.00,
			MonthlyPriceUSD:     41.86,
			BasicScansLimit:     1000,
			MonthlyCreditsLimit: 1000,
			TaskHistoryDays:     -1, // 永久
			APIAccessLimit:      intPtr(10000),
			Features:            []string{"基础扫描", "300次高级功能", "永久任务历史", "高级API访问"},
		},
	}
}

func intPtr(i int) *int {
	return &i
}
