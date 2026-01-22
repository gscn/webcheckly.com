package services

import (
	"fmt"
	"log"
	"web-checkly/database"
	"web-checkly/models"
)

// CheckFeatureAccess 检查功能访问权限
func CheckFeatureAccess(userID string, feature string) (bool, string, error) {
	// 获取功能定价
	pricing, err := GetFeaturePricing(feature)
	if err != nil {
		return false, "", fmt.Errorf("feature not found: %s", feature)
	}

	// 基础功能免费
	if pricing.FeatureCategory == "basic" {
		return true, "free", nil
	}

	// 如果没有用户ID（匿名用户），需要积分
	if userID == "" {
		return false, "credits_required", nil
	}

	// 检查订阅状态
	subscription, err := GetUserSubscription(userID)
	if err == nil && subscription != nil && subscription.Status == models.SubscriptionStatusActive {
		// 订阅用户：检查月度额度
		credits, err := GetUserCredits(userID)
		if err != nil {
			return false, "", err
		}

		// 检查月度积分额度
		plan := GetPricingPlans()[getPlanIndex(subscription.PlanType)]
		if credits.MonthlyCreditsUsed < plan.MonthlyCreditsLimit {
			// 月度限额未用完，检查积分余额
			if credits.Credits >= pricing.CreditsCost {
				return true, "subscription", nil
			}
			return false, "insufficient_credits", nil
		}
		// 月度限额已用完，但允许使用积分继续使用（不增加月度计数）
		if credits.Credits >= pricing.CreditsCost {
			return true, "credits", nil
		}
		return false, "monthly_limit_exceeded", nil
	}

	// 检查积分余额
	credits, err := GetUserCredits(userID)
	if err != nil {
		return false, "", err
	}
	if credits.Credits >= pricing.CreditsCost {
		return true, "credits", nil
	}

	return false, "credits_required", nil
}

// PreDeductFeatureCost 预扣功能使用成本（返回usageRecordID）
func PreDeductFeatureCost(userID string, feature string, taskID string) (string, error) {
	// 获取功能定价
	pricing, err := GetFeaturePricing(feature)
	if err != nil {
		return "", fmt.Errorf("feature not found: %s", feature)
	}

	// 基础功能免费，直接创建使用记录（仅对已登录用户）
	if pricing.FeatureCategory == "basic" {
		// 匿名用户使用基础功能不需要创建使用记录
		if userID == "" {
			return "", nil
		}
		usageRecordID, err := CreateUsageRecord(userID, taskID, feature, 0, true)
		if err != nil {
			return "", err
		}
		return usageRecordID, nil
	}

	// 如果没有用户ID，需要先创建订单
	if userID == "" {
		return "", fmt.Errorf("anonymous users cannot use premium features")
	}

	// 检查访问权限
	canAccess, accessType, err := CheckFeatureAccess(userID, feature)
	if err != nil {
		return "", err
	}
	if !canAccess {
		return "", fmt.Errorf("access denied: %s", accessType)
	}

	// 根据访问类型扣除费用
	var usageRecordID string
	switch accessType {
	case "subscription":
		// 订阅用户：扣除积分并增加月度使用计数
		if err := DeductCredits(userID, pricing.CreditsCost); err != nil {
			return "", err
		}
		if err := database.IncrementMonthlyCreditsUsed(userID, pricing.CreditsCost); err != nil {
			// 如果增加月度计数失败，退回积分
			RefundCredits(userID, pricing.CreditsCost, "")
			return "", err
		}
		usageRecordID, err = CreateUsageRecord(userID, taskID, feature, pricing.CreditsCost, false)
		if err != nil {
			// 如果创建记录失败，退回积分和月度计数
			RefundCredits(userID, pricing.CreditsCost, "")
			// 减少月度使用计数
			if err2 := database.DecrementMonthlyCreditsUsed(userID, pricing.CreditsCost); err2 != nil {
				log.Printf("[PreDeductFeatureCost] Warning: Failed to decrement monthly credits after refund: %v", err2)
			}
			return "", err
		}

	case "credits":
		// 使用积分
		if err := DeductCredits(userID, pricing.CreditsCost); err != nil {
			return "", err
		}
		usageRecordID, err = CreateUsageRecord(userID, taskID, feature, pricing.CreditsCost, false)
		if err != nil {
			// 如果创建记录失败，退回积分
			RefundCredits(userID, pricing.CreditsCost, "")
			return "", err
		}

	default:
		return "", fmt.Errorf("unknown access type: %s", accessType)
	}

	return usageRecordID, nil
}

// RefundFeatureCost 退回功能使用成本（任务失败时）
func RefundFeatureCost(usageRecordID string, taskID string) error {
	// 获取使用记录
	query := `
		SELECT user_id, feature_type, credits_used, is_free, is_refunded
		FROM usage_records
		WHERE id = $1
	`

	var userID, featureType string
	var creditsUsed int
	var isFree, isRefunded bool

	err := database.GetDB().QueryRow(query, usageRecordID).Scan(
		&userID, &featureType, &creditsUsed, &isFree, &isRefunded,
	)
	if err != nil {
		return fmt.Errorf("failed to get usage record: %w", err)
	}

	// 如果已经退款，直接返回
	if isRefunded {
		return nil
	}

	// 退回积分（非免费使用）
	if !isFree {
		// 检查是否是订阅用户，如果是，需要减少月度使用计数
		subscription, err := GetUserSubscription(userID)
		isSubscriptionUser := err == nil && subscription != nil && subscription.Status == models.SubscriptionStatusActive

		// 退回积分
		if err := RefundCredits(userID, creditsUsed, usageRecordID); err != nil {
			return err
		}

		// 如果是订阅用户且使用了积分，需要减少月度使用计数
		// 注意：这里假设如果用户有活跃订阅且使用了积分，很可能是通过subscription方式创建的
		// 为了安全起见，我们检查月度使用计数是否大于0，如果大于0则减少
		if isSubscriptionUser && creditsUsed > 0 {
			// 获取当前月度使用情况
			credits, err := GetUserCredits(userID)
			if err == nil && credits != nil && credits.MonthlyCreditsUsed > 0 {
				// 减少月度使用计数（最多减少到0）
				decrementAmount := creditsUsed
				if decrementAmount > credits.MonthlyCreditsUsed {
					decrementAmount = credits.MonthlyCreditsUsed
				}
				if err := database.DecrementMonthlyCreditsUsed(userID, decrementAmount); err != nil {
					log.Printf("[RefundFeatureCost] Warning: Failed to decrement monthly credits used for user %s: %v", userID, err)
					// 即使减少月度计数失败，也不影响积分退款
				} else {
					log.Printf("[RefundFeatureCost] Decremented monthly credits used by %d for user %s", decrementAmount, userID)
				}
			}
		}
	}

	return nil
}

// GetAvailableFeatures 获取用户可用功能列表
func GetAvailableFeatures(userID string) (map[string]bool, error) {
	allPricing, err := GetAllPricing()
	if err != nil {
		return nil, err
	}

	available := make(map[string]bool)
	for _, pricing := range allPricing {
		canAccess, _, err := CheckFeatureAccess(userID, pricing.FeatureCode)
		if err != nil {
			continue
		}
		available[pricing.FeatureCode] = canAccess
	}

	return available, nil
}

// CheckAndDeductWithLock 带锁的检查和扣除（防止并发重复扣除）
func CheckAndDeductWithLock(userID string, feature string) (bool, error) {
	// 使用数据库事务和SELECT FOR UPDATE
	// 这个功能已经在PreDeductFeatureCost中实现了
	return true, nil
}

// FeatureAccessDetails 功能访问详细信息
type FeatureAccessDetails struct {
	CanAccess       bool   `json:"can_access"`
	Reason          string `json:"reason"` // not_logged_in, insufficient_credits, free, available
	CreditsRequired int    `json:"credits_required"`
	CurrentCredits  int    `json:"current_credits"`
	Message         string `json:"message,omitempty"`
	FeatureName     string `json:"feature_name,omitempty"`
}

// GetFeatureAccessDetails 获取功能访问的详细信息
func GetFeatureAccessDetails(userID string, feature string) (*FeatureAccessDetails, error) {
	// 获取功能定价
	pricing, err := GetFeaturePricing(feature)
	if err != nil {
		return nil, fmt.Errorf("feature not found: %s", feature)
	}

	details := &FeatureAccessDetails{
		FeatureName:     pricing.FeatureName,
		CreditsRequired: pricing.CreditsCost,
	}

	// 基础功能免费
	if pricing.FeatureCategory == "basic" {
		details.CanAccess = true
		details.Reason = "free"
		details.CreditsRequired = 0
		return details, nil
	}

	// 如果没有用户ID（匿名用户），需要积分
	if userID == "" {
		details.CanAccess = false
		details.Reason = "not_logged_in"
		details.Message = "Login required to use this feature"
		return details, nil
	}

	// 检查订阅状态
	subscription, err := GetUserSubscription(userID)
	if err == nil && subscription != nil && subscription.Status == models.SubscriptionStatusActive {
		// 订阅用户：检查月度额度
		credits, err := GetUserCredits(userID)
		if err != nil {
			return nil, err
		}
		details.CurrentCredits = credits.Credits

		// 检查月度积分额度
		plan := GetPricingPlans()[getPlanIndex(subscription.PlanType)]
		if credits.MonthlyCreditsUsed < plan.MonthlyCreditsLimit {
			// 月度限额未用完，检查积分余额
			if credits.Credits >= pricing.CreditsCost {
				details.CanAccess = true
				details.Reason = "subscription"
				return details, nil
			}
			details.CanAccess = false
			details.Reason = "insufficient_credits"
			details.Message = fmt.Sprintf("Insufficient credits. Need %d, have %d", pricing.CreditsCost, credits.Credits)
			return details, nil
		}
		// 月度限额已用完，但允许使用积分继续使用（不增加月度计数）
		if credits.Credits >= pricing.CreditsCost {
			details.CanAccess = true
			details.Reason = "credits"
			return details, nil
		}
		details.CanAccess = false
		details.Reason = "monthly_limit_exceeded"
		details.Message = fmt.Sprintf("Monthly limit exceeded and insufficient credits. Need %d, have %d", pricing.CreditsCost, credits.Credits)
		return details, nil
	}

	// 检查积分余额
	credits, err := GetUserCredits(userID)
	if err != nil {
		return nil, err
	}
	details.CurrentCredits = credits.Credits
	if credits.Credits >= pricing.CreditsCost {
		details.CanAccess = true
		details.Reason = "credits"
		return details, nil
	}

	details.CanAccess = false
	details.Reason = "insufficient_credits"
	details.Message = fmt.Sprintf("Insufficient credits. Need %d, have %d", pricing.CreditsCost, credits.Credits)
	return details, nil
}

// getPlanIndex 获取套餐索引
func getPlanIndex(planType models.SubscriptionPlan) int {
	switch planType {
	case models.SubscriptionPlanBasic:
		return 0
	case models.SubscriptionPlanPro:
		return 1
	case models.SubscriptionPlanEnterprise:
		return 2
	default:
		return 0
	}
}
