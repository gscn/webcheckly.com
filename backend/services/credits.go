package services

import (
	"fmt"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// GetUserCredits 获取用户余额
func GetUserCredits(userID string) (*models.UserCredits, error) {
	return database.GetUserCredits(userID, false)
}

// InitializeUserCredits 初始化用户积分（注册时）
func InitializeUserCredits(userID string) error {
	return database.CreateUserCredits(userID)
}

// AddCredits 增加积分
func AddCredits(userID string, amount int) error {
	return database.AddCredits(userID, amount)
}

// DeductCredits 扣除积分（使用SELECT FOR UPDATE锁）
func DeductCredits(userID string, amount int) error {
	return database.DeductCredits(userID, amount)
}

// RefundCredits 退回积分（任务失败时）
func RefundCredits(userID string, amount int, usageRecordID string) error {
	if err := database.RefundCredits(userID, amount); err != nil {
		return err
	}

	// 更新使用记录为已退款
	return UpdateUsageRecordRefunded(usageRecordID, true)
}

// CheckAndGrantDailyLoginReward 检查并发放每日登录奖励（每日1积分）
func CheckAndGrantDailyLoginReward(userID string) (bool, error) {
	credits, err := database.GetUserCredits(userID, false)
	if err != nil {
		return false, err
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 检查今天是否已经领取过奖励
	if credits.LastDailyRewardAt != nil {
		lastRewardDate := time.Date(credits.LastDailyRewardAt.Year(), credits.LastDailyRewardAt.Month(), credits.LastDailyRewardAt.Day(), 0, 0, 0, 0, credits.LastDailyRewardAt.Location())
		if !today.After(lastRewardDate) {
			// 今天已经领取过了
			return false, nil
		}
	}

	// 发放每日登录奖励（1积分）
	if err := database.AddCredits(userID, 1); err != nil {
		return false, err
	}

	// 更新最后领取时间
	if err := database.UpdateLastDailyRewardAt(userID, now); err != nil {
		// 如果更新失败，扣除刚才添加的积分（补偿）
		database.DeductCredits(userID, 1)
		return false, err
	}

	return true, nil
}

// ResetMonthlyCredits 重置月度积分使用（每月1号，订阅用户）
func ResetMonthlyCredits(userID string) error {
	return database.ResetMonthlyCredits(userID)
}

// GetUsageStats 获取使用统计
func GetUsageStats(userID string, startDate, endDate time.Time) (*models.UsageStats, error) {
	query := `
		SELECT 
			COALESCE(COUNT(*), 0) as total_scans,
			0 as free_scans,  -- 已移除免费使用次数，所有扫描都使用积分
			COALESCE(SUM(CASE WHEN credits_used > 0 THEN 1 ELSE 0 END), 0) as paid_scans,
			COALESCE(SUM(credits_used), 0) as total_credits_used
		FROM usage_records
		WHERE user_id = $1 AND scan_date >= $2 AND scan_date <= $3 AND is_refunded = false
	`

	var stats models.UsageStats
	err := database.GetDB().QueryRow(query, userID, startDate, endDate).Scan(
		&stats.TotalScans,
		&stats.FreeScans,
		&stats.PaidScans,
		&stats.TotalCreditsUsed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage stats: %w", err)
	}

	// 获取功能使用统计
	featureQuery := `
		SELECT feature_type, COUNT(*) as count
		FROM usage_records
		WHERE user_id = $1 AND scan_date >= $2 AND scan_date <= $3 AND is_refunded = false
		GROUP BY feature_type
	`

	rows, err := database.GetDB().Query(featureQuery, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get feature usage: %w", err)
	}
	defer rows.Close()

	stats.FeatureUsage = make(map[string]int)
	for rows.Next() {
		var featureType string
		var count int
		if err := rows.Scan(&featureType, &count); err != nil {
			continue
		}
		stats.FeatureUsage[featureType] = count
	}

	stats.DateRange.Start = startDate
	stats.DateRange.End = endDate

	return &stats, nil
}

// CreateUsageRecord 创建使用记录
func CreateUsageRecord(userID, taskID, featureType string, creditsUsed int, isFree bool) (string, error) {
	usageRecordID := uuid.New().String()
	now := time.Now()
	scanDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	query := `
		INSERT INTO usage_records (
			id, user_id, task_id, feature_type, credits_used, is_free, is_refunded, scan_date, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	var taskIDPtr *string
	if taskID != "" {
		taskIDPtr = &taskID
	}

	_, err := database.GetDB().Exec(
		query,
		usageRecordID,
		userID,
		taskIDPtr,
		featureType,
		creditsUsed,
		isFree,
		false,
		scanDate,
		now,
	)

	if err != nil {
		return "", fmt.Errorf("failed to create usage record: %w", err)
	}

	return usageRecordID, nil
}

// UpdateUsageRecordRefunded 更新使用记录为已退款
func UpdateUsageRecordRefunded(usageRecordID string, isRefunded bool) error {
	query := `UPDATE usage_records SET is_refunded = $1 WHERE id = $2`
	_, err := database.GetDB().Exec(query, isRefunded, usageRecordID)
	if err != nil {
		return fmt.Errorf("failed to update usage record: %w", err)
	}
	return nil
}

// DeleteUsageRecord 删除使用记录
func DeleteUsageRecord(usageRecordID string) error {
	query := `DELETE FROM usage_records WHERE id = $1`
	_, err := database.GetDB().Exec(query, usageRecordID)
	if err != nil {
		return fmt.Errorf("failed to delete usage record: %w", err)
	}
	return nil
}

// GetUsageRecords 获取使用记录列表
func GetUsageRecords(userID string, limit, offset int) ([]*models.UsageRecord, error) {
	query := `
		SELECT id, user_id, task_id, feature_type, credits_used, is_free, is_refunded, scan_date, created_at
		FROM usage_records
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := database.GetDB().Query(query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query usage records: %w", err)
	}
	defer rows.Close()

	var records []*models.UsageRecord
	for rows.Next() {
		var record models.UsageRecord
		var taskID *string
		err := rows.Scan(
			&record.ID,
			&record.UserID,
			&taskID,
			&record.FeatureType,
			&record.CreditsUsed,
			&record.IsFree,
			&record.IsRefunded,
			&record.ScanDate,
			&record.CreatedAt,
		)
		if err != nil {
			continue
		}
		record.TaskID = taskID
		records = append(records, &record)
	}

	return records, nil
}
