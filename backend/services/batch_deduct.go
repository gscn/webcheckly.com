package services

import (
	"database/sql"
	"fmt"
	"log"
	"time"
	"webcheckly/database"
	"webcheckly/models"

	"github.com/google/uuid"
)

// FeatureDeductRequest 功能扣除请求
type FeatureDeductRequest struct {
	Feature     string
	Pricing     *models.FeaturePricing
	AccessType  string
	CreditsCost int
}

// BatchPreDeductFeatureCosts 批量预扣功能使用成本（使用单个事务，确保原子性）
// 返回 usageRecordIDs 映射（feature -> usageRecordID）
func BatchPreDeductFeatureCosts(userID string, taskID string, features []string) (map[string]string, error) {
	if userID == "" {
		// 匿名用户只能使用基础功能
		return make(map[string]string), nil
	}

	// 开始事务
	tx, err := database.GetDB().Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 锁定用户积分记录（防止并发修改）
	var credits models.UserCredits
	var lastDailyRewardAt sql.NullTime
	err = tx.QueryRow(
		`SELECT id, user_id, credits, monthly_credits_used, last_daily_reward_at
		 FROM user_credits WHERE user_id = $1 FOR UPDATE`,
		userID,
	).Scan(
		&credits.ID,
		&credits.UserID,
		&credits.Credits,
		&credits.MonthlyCreditsUsed,
		&lastDailyRewardAt,
	)
	if err == nil && lastDailyRewardAt.Valid {
		credits.LastDailyRewardAt = &lastDailyRewardAt.Time
	}

	if err != nil {
		// 如果记录不存在，创建它
		if err := createUserCreditsInTx(tx, userID); err != nil {
			return nil, err
		}
		// 重新查询
		var lastDailyRewardAt sql.NullTime
		err = tx.QueryRow(
			`SELECT id, user_id, credits, monthly_credits_used, last_daily_reward_at
			 FROM user_credits WHERE user_id = $1 FOR UPDATE`,
			userID,
		).Scan(
			&credits.ID,
			&credits.UserID,
			&credits.Credits,
			&credits.MonthlyCreditsUsed,
			&lastDailyRewardAt,
		)
		if err == nil && lastDailyRewardAt.Valid {
			credits.LastDailyRewardAt = &lastDailyRewardAt.Time
		}
		if err != nil {
			return nil, fmt.Errorf("failed to get user credits: %w", err)
		}
	}

	// 检查订阅状态
	subscription, err := GetUserSubscription(userID)
	isSubscriptionUser := err == nil && subscription != nil && subscription.Status == models.SubscriptionStatusActive
	var plan *models.PricingPlan
	if isSubscriptionUser {
		plans := GetPricingPlans()
		planIndex := getPlanIndex(subscription.PlanType)
		if planIndex < len(plans) {
			plan = &plans[planIndex]
		}
	}

	// 准备扣除请求列表
	deductRequests := make([]FeatureDeductRequest, 0)
	totalCreditsNeeded := 0
	totalMonthlyCreditsNeeded := 0

	for _, feature := range features {
		pricing, err := GetFeaturePricing(feature)
		if err != nil {
			log.Printf("[BatchPreDeduct] Warning: Feature pricing not found for %s: %v", feature, err)
			continue
		}

		// 基础功能免费，跳过
		if pricing.FeatureCategory == "basic" {
			continue
		}

		// 检查访问权限
		canAccess, accessType, err := checkFeatureAccessInTx(tx, userID, feature, pricing, &credits, isSubscriptionUser, plan)
		if err != nil {
			return nil, fmt.Errorf("failed to check access for feature %s: %w", feature, err)
		}
		if !canAccess {
			return nil, fmt.Errorf("access denied for feature %s: %s", feature, accessType)
		}

		deductRequests = append(deductRequests, FeatureDeductRequest{
			Feature:     feature,
			Pricing:     pricing,
			AccessType:  accessType,
			CreditsCost: pricing.CreditsCost,
		})

		// 累计需要的资源
		switch accessType {
		case "subscription", "credits":
			totalCreditsNeeded += pricing.CreditsCost
			if accessType == "subscription" {
				totalMonthlyCreditsNeeded += pricing.CreditsCost
			}
		}
	}

	// 验证资源是否足够
	if totalCreditsNeeded > 0 && credits.Credits < totalCreditsNeeded {
		return nil, fmt.Errorf("insufficient credits: have %d, need %d", credits.Credits, totalCreditsNeeded)
	}
	if isSubscriptionUser && totalMonthlyCreditsNeeded > 0 {
		if credits.MonthlyCreditsUsed+totalMonthlyCreditsNeeded > plan.MonthlyCreditsLimit {
			// 月度限额已用完，但允许使用积分继续使用
			// 这里不需要检查，因为已经检查了积分余额
		}
	}

	// 执行扣除操作
	usageRecordIDs := make(map[string]string)
	now := time.Now()
	scanDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	for _, req := range deductRequests {
		usageRecordID := uuid.New().String()
		var creditsUsed int
		isFree := false

		switch req.AccessType {
		case "subscription", "credits":
			isFree = false
			creditsUsed = req.CreditsCost
		default:
			return nil, fmt.Errorf("unknown access type: %s", req.AccessType)
		}

		// 创建使用记录
		var taskIDPtr *string
		if taskID != "" {
			taskIDPtr = &taskID
		}
		_, err = tx.Exec(
			`INSERT INTO usage_records (id, user_id, task_id, feature_type, credits_used, is_free, is_refunded, scan_date, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			usageRecordID,
			userID,
			taskIDPtr,
			req.Feature,
			creditsUsed,
			isFree,
			false,
			scanDate,
			now,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create usage record for %s: %w", req.Feature, err)
		}

		usageRecordIDs[req.Feature] = usageRecordID
	}

	// 更新用户积分
	if totalCreditsNeeded > 0 {
		_, err = tx.Exec(
			`UPDATE user_credits SET credits = credits - $1, updated_at = NOW() WHERE user_id = $2`,
			totalCreditsNeeded,
			userID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to deduct credits: %w", err)
		}
	}

	if isSubscriptionUser && totalMonthlyCreditsNeeded > 0 {
		_, err = tx.Exec(
			`UPDATE user_credits SET monthly_credits_used = monthly_credits_used + $1, updated_at = NOW() WHERE user_id = $2`,
			totalMonthlyCreditsNeeded,
			userID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to increment monthly credits used: %w", err)
		}
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("[BatchPreDeduct] Successfully deducted costs for %d features for user %s", len(usageRecordIDs), userID)
	return usageRecordIDs, nil
}

// checkFeatureAccessInTx 在事务中检查功能访问权限
func checkFeatureAccessInTx(tx *sql.Tx, userID string, feature string, pricing *models.FeaturePricing, credits *models.UserCredits, isSubscriptionUser bool, plan *models.PricingPlan) (bool, string, error) {
	// 基础功能免费
	if pricing.FeatureCategory == "basic" {
		return true, "free", nil
	}

	// 检查订阅用户
	if isSubscriptionUser {
		// 检查月度积分额度
		if credits.MonthlyCreditsUsed < plan.MonthlyCreditsLimit {
			// 月度限额未用完，检查积分余额
			if credits.Credits >= pricing.CreditsCost {
				return true, "subscription", nil
			}
			return false, "insufficient_credits", nil
		}
		// 月度限额已用完，但允许使用积分继续使用
		if credits.Credits >= pricing.CreditsCost {
			return true, "credits", nil
		}
		return false, "monthly_limit_exceeded", nil
	}

	// 检查积分余额
	if credits.Credits >= pricing.CreditsCost {
		return true, "credits", nil
	}

	return false, "credits_required", nil
}

// createUserCreditsInTx 在事务中创建用户积分记录（新用户获得50积分）
func createUserCreditsInTx(tx *sql.Tx, userID string) error {
	now := time.Now()
	nextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())

	_, err := tx.Exec(
		`INSERT INTO user_credits (user_id, credits, monthly_credits_reset_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		userID,
		50,        // credits - 新用户注册获得50积分
		nextMonth, // monthly_credits_reset_at
		now,       // created_at
		now,       // updated_at
	)
	return err
}
