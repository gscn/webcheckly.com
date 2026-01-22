package services

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"web-checkly/database"
	"web-checkly/models"
)

// GetFeaturePricing 获取功能定价
func GetFeaturePricing(featureCode string) (*models.FeaturePricing, error) {
	query := `
		SELECT id, feature_code, feature_name, feature_category, single_price, single_price_usd,
			credits_cost, is_premium, is_available, created_at, updated_at
		FROM feature_pricing
		WHERE feature_code = $1 AND is_available = true
	`

	var pricing models.FeaturePricing
	err := database.GetDB().QueryRow(query, featureCode).Scan(
		&pricing.ID,
		&pricing.FeatureCode,
		&pricing.FeatureName,
		&pricing.FeatureCategory,
		&pricing.SinglePrice,
		&pricing.SinglePriceUSD,
		&pricing.CreditsCost,
		&pricing.IsPremium,
		&pricing.IsAvailable,
		&pricing.CreatedAt,
		&pricing.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("feature pricing not found: %s", featureCode)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get feature pricing: %w", err)
	}

	return &pricing, nil
}

// GetAllPricing 获取所有定价
func GetAllPricing() ([]*models.FeaturePricing, error) {
	query := `
		SELECT id, feature_code, feature_name, feature_category, single_price, single_price_usd,
			credits_cost, is_premium, is_available, created_at, updated_at
		FROM feature_pricing
		WHERE is_available = true
		ORDER BY feature_category, feature_code
	`

	rows, err := database.GetDB().Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query pricing: %w", err)
	}
	defer rows.Close()

	var pricings []*models.FeaturePricing
	for rows.Next() {
		var pricing models.FeaturePricing
		err := rows.Scan(
			&pricing.ID,
			&pricing.FeatureCode,
			&pricing.FeatureName,
			&pricing.FeatureCategory,
			&pricing.SinglePrice,
			&pricing.SinglePriceUSD,
			&pricing.CreditsCost,
			&pricing.IsPremium,
			&pricing.IsAvailable,
			&pricing.CreatedAt,
			&pricing.UpdatedAt,
		)
		if err != nil {
			continue
		}
		pricings = append(pricings, &pricing)
	}

	return pricings, nil
}

// CalculateOrderAmount 计算订单金额（基于积分成本，1积分=1元，CNY和USD）
// 注意：此函数已废弃，功能使用已改为直接使用积分扣除，不再需要计算订单金额
func CalculateOrderAmount(features []string) (float64, float64, error) {
	var totalCredits int
	var totalCNY float64
	var totalUSD float64

	for _, featureCode := range features {
		pricing, err := GetFeaturePricing(featureCode)
		if err != nil {
			return 0, 0, fmt.Errorf("failed to get pricing for %s: %w", featureCode, err)
		}
		// 使用积分成本计算（1积分=1元）
		totalCredits += pricing.CreditsCost
	}

	// 1积分=1元
	totalCNY = float64(totalCredits)
	amountUSD, err := ConvertCNYToUSD(totalCNY)
	if err != nil {
		return 0, 0, err
	}
	totalUSD = amountUSD

	return totalCNY, totalUSD, nil
}

// GetPricingPlans 获取套餐定价
func GetPricingPlans() []models.PricingPlan {
	return models.GetDefaultPricingPlans()
}

// ConvertCNYToUSD CNY转USD（使用环境变量或固定汇率）
func ConvertCNYToUSD(cnyAmount float64) (float64, error) {
	rateStr := os.Getenv("CNY_TO_USD_RATE")
	if rateStr == "" {
		// 默认汇率（约0.14，可根据实际情况调整）
		rateStr = "0.14"
	}

	rate, err := strconv.ParseFloat(rateStr, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid CNY_TO_USD_RATE: %w", err)
	}

	return cnyAmount * rate, nil
}
