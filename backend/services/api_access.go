package services

import (
	"fmt"
	"log"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// CheckAPIAccess 检查用户是否有API访问权限
// 返回: (hasAccess, limit, used, error)
func CheckAPIAccess(userID string) (bool, *int, int, error) {
	// 获取用户订阅
	subscription, err := GetUserSubscription(userID)
	if err != nil {
		return false, nil, 0, fmt.Errorf("failed to get subscription: %w", err)
	}

	// 基础版用户没有API访问权限
	if subscription == nil || subscription.PlanType == models.SubscriptionPlanBasic {
		return false, nil, 0, nil
	}

	// 获取套餐信息
	plans := GetPricingPlans()
	var plan *models.PricingPlan
	for _, p := range plans {
		if string(p.PlanType) == string(subscription.PlanType) {
			plan = &p
			break
		}
	}

	if plan == nil || plan.APIAccessLimit == nil {
		return false, nil, 0, nil
	}

	// 获取当前月份的API访问次数
	now := time.Now()
	monthlyCount, err := database.GetUserAPIAccessCount(userID, now)
	if err != nil {
		return false, nil, 0, fmt.Errorf("failed to get API access count: %w", err)
	}

	limit := *plan.APIAccessLimit
	hasAccess := monthlyCount < limit

	return hasAccess, &limit, monthlyCount, nil
}

// RecordAPIAccess 记录API访问
func RecordAPIAccess(userID string, endpoint string, method string, ipAddress *string, userAgent *string, statusCode *int, responseTime *int) error {
	record := &models.APIAccessRecord{
		ID:           uuid.New().String(),
		UserID:       userID,
		APIEndpoint:  endpoint,
		Method:       method,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		StatusCode:   statusCode,
		ResponseTime: responseTime,
		CreatedAt:    time.Now(),
	}

	// 创建访问记录
	if err := database.CreateAPIAccessRecord(record); err != nil {
		log.Printf("[RecordAPIAccess] Failed to create record: %v", err)
		return err
	}

	// 更新月度使用统计
	subscription, err := GetUserSubscription(userID)
	if err == nil && subscription != nil {
		now := time.Now()
		if err := database.IncrementMonthlyAPIAccessUsed(userID, subscription.ID, now); err != nil {
			log.Printf("[RecordAPIAccess] Failed to increment monthly usage: %v", err)
			// 不返回错误，因为记录已创建
		}
	}

	return nil
}

// GetAPIAccessStats 获取API访问统计
func GetAPIAccessStats(userID string) (*models.APIAccessStats, error) {
	log.Printf("[GetAPIAccessStats] Getting stats for user: %s", userID)
	stats := &models.APIAccessStats{}

	// 获取总访问次数
	totalCount, err := database.GetUserTotalAPIAccessCount(userID)
	if err != nil {
		log.Printf("[GetAPIAccessStats] Error getting total count: %v", err)
		return nil, fmt.Errorf("failed to get total API access count: %w", err)
	}
	stats.TotalRequests = totalCount

	// 获取月度访问次数
	now := time.Now()
	monthlyCount, err := database.GetUserAPIAccessCount(userID, now)
	if err != nil {
		log.Printf("[GetAPIAccessStats] Error getting monthly count: %v", err)
		return nil, fmt.Errorf("failed to get monthly API access count: %w", err)
	}
	stats.MonthlyRequests = monthlyCount

	// 获取用户订阅和限制
	subscription, err := GetUserSubscription(userID)
	if err == nil && subscription != nil && subscription.PlanType != models.SubscriptionPlanBasic {
		plans := GetPricingPlans()
		for _, p := range plans {
			if string(p.PlanType) == string(subscription.PlanType) {
				if p.APIAccessLimit != nil {
					limit := *p.APIAccessLimit
					stats.MonthlyLimit = &limit
					remaining := limit - monthlyCount
					if remaining < 0 {
						remaining = 0
					}
					stats.RemainingRequests = &remaining
				}
				break
			}
		}
	}

	return stats, nil
}

// GetAPIAccessRecords 获取API访问记录列表
func GetAPIAccessRecords(userID string, limit, offset int) ([]*models.APIAccessRecord, error) {
	return database.GetAPIAccessRecords(userID, limit, offset)
}

// GetAPIAccessRecordCount 获取API访问记录总数
func GetAPIAccessRecordCount(userID string) (int, error) {
	return database.GetAPIAccessRecordCount(userID)
}
