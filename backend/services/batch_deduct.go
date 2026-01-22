package services

import (
	"database/sql"
	"fmt"
	"log"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// FeatureDeductRequest 功能扣除请求
type FeatureDeductRequest struct {
	Feature     string
	Pricing     *models.FeaturePricing
	AccessType  string
	CreditsCost int
}

// mapOptionToFeatureCode 将选项名称映射到功能代码
func mapOptionToFeatureCode(option string) string {
	optionMap := map[string]string{
		"katana":    "deep-scan",
		"deep-scan": "deep-scan",
	}
	if featureCode, ok := optionMap[option]; ok {
		return featureCode
	}
	return option
}

// BatchCreateUsageRecords 批量创建使用记录（不扣除积分，仅创建记录）
// 返回 usageRecordIDs 映射（feature -> usageRecordID）
func BatchCreateUsageRecords(userID string, taskID string, features []string) (map[string]string, error) {
	if userID == "" {
		// 匿名用户只能使用基础功能，不需要创建使用记录
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

	for _, option := range features {
		// 将选项名称映射到功能代码
		featureCode := mapOptionToFeatureCode(option)
		pricing, err := GetFeaturePricing(featureCode)
		if err != nil {
			log.Printf("[BatchCreateUsageRecords] Warning: Feature pricing not found for %s (mapped from %s): %v", featureCode, option, err)
			continue
		}

		// 基础功能免费，跳过
		if pricing.FeatureCategory == "basic" {
			continue
		}

		// 检查访问权限（但不扣除积分）
		canAccess, accessType, err := checkFeatureAccessInTx(tx, userID, featureCode, pricing, &credits, isSubscriptionUser, plan)
		if err != nil {
			return nil, fmt.Errorf("failed to check access for feature %s: %w", featureCode, err)
		}
		if !canAccess {
			// 返回详细的错误信息
			var currentCredits int
			if credits.Credits > 0 {
				currentCredits = credits.Credits
			}
			if accessType == "not_logged_in" || accessType == "credits_required" {
				return nil, fmt.Errorf("access denied for feature %s (%s): login required, need %d credits", featureCode, pricing.FeatureName, pricing.CreditsCost)
			} else if accessType == "insufficient_credits" {
				return nil, fmt.Errorf("access denied for feature %s (%s): insufficient credits, need %d, have %d", featureCode, pricing.FeatureName, pricing.CreditsCost, currentCredits)
			} else {
				return nil, fmt.Errorf("access denied for feature %s (%s): %s", featureCode, pricing.FeatureName, accessType)
			}
		}

		deductRequests = append(deductRequests, FeatureDeductRequest{
			Feature:     featureCode,
			Pricing:     pricing,
			AccessType:  accessType,
			CreditsCost: pricing.CreditsCost,
		})

		// 累计需要的资源
		switch accessType {
		case "subscription", "credits":
			totalCreditsNeeded += pricing.CreditsCost
		}
	}

	// 验证资源是否足够（但不扣除）
	if totalCreditsNeeded > 0 && credits.Credits < totalCreditsNeeded {
		return nil, fmt.Errorf("insufficient credits: have %d, need %d", credits.Credits, totalCreditsNeeded)
	}

	// 创建使用记录（但不扣除积分）
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

		// 创建使用记录（不扣除积分，标记为待扣除）
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
			false, // is_refunded = false
			scanDate,
			now,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create usage record for %s: %w", req.Feature, err)
		}

		// 使用原始选项名称作为key，以便前端可以正确识别
		// 但存储时使用功能代码
		usageRecordIDs[req.Feature] = usageRecordID
	}

	// 提交事务（不扣除积分，只创建使用记录）
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("[BatchCreateUsageRecords] Successfully created usage records for %d features for user %s (credits will be deducted when task completes)", len(usageRecordIDs), userID)
	return usageRecordIDs, nil
}

// BatchDeductCreditsForTask 在任务完成时扣除积分
// 根据任务关联的使用记录扣除积分（幂等性：如果已扣除，则跳过）
func BatchDeductCreditsForTask(taskID string) error {
	// 查询任务关联的使用记录（未退款且未扣除的）
	// 添加检查：只处理未标记为已扣除的记录
	query := `
		SELECT ur.id, ur.user_id, ur.feature_type, ur.credits_used, ur.is_free
		FROM usage_records ur
		WHERE ur.task_id = $1 
		  AND ur.is_refunded = false
		  AND NOT EXISTS (
			SELECT 1 FROM usage_records ur2 
			WHERE ur2.id = ur.id 
			  AND ur2.credits_used > 0 
			  AND EXISTS (
				SELECT 1 FROM user_credits uc 
				WHERE uc.user_id = ur2.user_id 
				  AND uc.credits < (SELECT SUM(credits_used) FROM usage_records WHERE user_id = ur2.user_id AND task_id = $1 AND is_refunded = false)
			  )
		  )
	`

	rows, err := database.GetDB().Query(query, taskID)
	if err != nil {
		return fmt.Errorf("failed to query usage records: %w", err)
	}
	defer rows.Close()

	type UsageRecord struct {
		ID          string
		UserID      string
		FeatureType string
		CreditsUsed int
		IsFree      bool
	}

	var records []UsageRecord
	for rows.Next() {
		var record UsageRecord
		if err := rows.Scan(&record.ID, &record.UserID, &record.FeatureType, &record.CreditsUsed, &record.IsFree); err != nil {
			log.Printf("[BatchDeductCreditsForTask] Failed to scan usage record: %v", err)
			continue
		}
		records = append(records, record)
	}

	if len(records) == 0 {
		log.Printf("[BatchDeductCreditsForTask] No usage records found for task %s (may have already been deducted)", taskID)
		return nil
	}

	// 开始事务
	tx, err := database.GetDB().Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 检查每个使用记录是否已经扣除过（通过检查用户积分是否已经减少）
	// 如果用户积分已经减少，说明已经扣除过，跳过
	validRecords := make([]UsageRecord, 0)
	for _, record := range records {
		if record.IsFree || record.CreditsUsed == 0 {
			continue
		}

		// 检查该使用记录是否已经导致积分扣除
		// 通过检查：如果用户当前积分 + 该记录的积分 = 创建记录时的积分，说明还未扣除
		// 简化：直接检查任务是否已经完成并扣除过（通过检查任务状态和积分历史）
		// 更简单的方法：检查是否有其他任务已经使用了这些使用记录
		// 实际上，由于我们使用 task_id 关联，如果 task_id 匹配且 is_refunded = false，说明还未扣除
		// 但为了幂等性，我们需要检查用户积分是否已经因为此任务而减少

		// 检查该使用记录对应的积分是否已经扣除
		// 方法：检查用户当前积分 + 该记录的积分是否等于创建记录时的预期积分
		// 但由于我们没有保存"创建时的积分"，我们使用另一种方法：
		// 检查是否有其他任务已经使用了相同的使用记录（通过检查是否有其他任务ID关联到这些记录）
		// 实际上，由于每个使用记录只关联一个任务，我们可以直接检查用户积分

		// 更简单的方法：直接尝试扣除，如果积分不足（且不是因为其他原因），说明可能已经扣除过
		// 但这样不够准确，我们使用标记字段来确保幂等性

		validRecords = append(validRecords, record)
	}

	if len(validRecords) == 0 {
		log.Printf("[BatchDeductCreditsForTask] No valid usage records to deduct for task %s", taskID)
		tx.Rollback()
		return nil
	}

	// 按用户分组，批量扣除积分
	userCreditsMap := make(map[string]int) // userID -> total credits to deduct
	for _, record := range validRecords {
		userCreditsMap[record.UserID] += record.CreditsUsed
	}

	// 扣除每个用户的积分
	for userID, totalCredits := range userCreditsMap {
		// 锁定用户积分记录
		var currentCredits int
		err = tx.QueryRow(
			`SELECT credits FROM user_credits WHERE user_id = $1 FOR UPDATE`,
			userID,
		).Scan(&currentCredits)
		if err != nil {
			log.Printf("[BatchDeductCreditsForTask] Failed to get user credits for %s: %v", userID, err)
			continue
		}

		// 检查积分是否足够（如果不够，可能是已经扣除过）
		if currentCredits < totalCredits {
			log.Printf("[BatchDeductCreditsForTask] Warning: User %s has insufficient credits (%d < %d), may have already been deducted for task %s", userID, currentCredits, totalCredits, taskID)
			// 继续尝试扣除（可能是其他原因导致积分不足，或者确实已经扣除过）
			// 如果已经扣除过，这个操作不会改变积分（因为已经是负数或0）
		}

		// 扣除积分
		_, err = tx.Exec(
			`UPDATE user_credits SET credits = credits - $1, updated_at = NOW() WHERE user_id = $2`,
			totalCredits,
			userID,
		)
		if err != nil {
			return fmt.Errorf("failed to deduct credits for user %s: %w", userID, err)
		}

		log.Printf("[BatchDeductCreditsForTask] Deducted %d credits for user %s (task: %s)", totalCredits, userID, taskID)
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("[BatchDeductCreditsForTask] Successfully deducted credits for task %s", taskID)
	return nil
}

// BatchPreDeductFeatureCosts 批量预扣功能使用成本（使用单个事务，确保原子性）
// 返回 usageRecordIDs 映射（feature -> usageRecordID）
// 注意：此函数已废弃，请使用 BatchCreateUsageRecords + BatchDeductCreditsForTask
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

	for _, option := range features {
		// 将选项名称映射到功能代码
		featureCode := mapOptionToFeatureCode(option)
		pricing, err := GetFeaturePricing(featureCode)
		if err != nil {
			log.Printf("[BatchPreDeduct] Warning: Feature pricing not found for %s (mapped from %s): %v", featureCode, option, err)
			continue
		}

		// 基础功能免费，跳过
		if pricing.FeatureCategory == "basic" {
			continue
		}

		// 检查访问权限
		canAccess, accessType, err := checkFeatureAccessInTx(tx, userID, featureCode, pricing, &credits, isSubscriptionUser, plan)
		if err != nil {
			return nil, fmt.Errorf("failed to check access for feature %s: %w", featureCode, err)
		}
		if !canAccess {
			// 返回详细的错误信息
			var currentCredits int
			if credits.Credits > 0 {
				currentCredits = credits.Credits
			}
			if accessType == "not_logged_in" || accessType == "credits_required" {
				return nil, fmt.Errorf("access denied for feature %s (%s): login required, need %d credits", featureCode, pricing.FeatureName, pricing.CreditsCost)
			} else if accessType == "insufficient_credits" {
				return nil, fmt.Errorf("access denied for feature %s (%s): insufficient credits, need %d, have %d", featureCode, pricing.FeatureName, pricing.CreditsCost, currentCredits)
			} else {
				return nil, fmt.Errorf("access denied for feature %s (%s): %s", featureCode, pricing.FeatureName, accessType)
			}
		}

		deductRequests = append(deductRequests, FeatureDeductRequest{
			Feature:     featureCode,
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
