package database

import (
	"database/sql"
	"fmt"
	"time"
	"web-checkly/models"

	"github.com/google/uuid"
)

// CreateUserCredits 初始化用户积分（注册时，新用户获得50积分）
func CreateUserCredits(userID string) error {
	now := time.Now()
	nextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())

	query := `
		INSERT INTO user_credits (
			id, user_id, credits,
			monthly_credits_used, monthly_credits_reset_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO NOTHING
	`

	_, err := DB.Exec(
		query,
		uuid.New().String(),
		userID,
		50, // 新用户注册获得50积分
		0,
		nextMonth,
		now,
		now,
	)

	if err != nil {
		return fmt.Errorf("failed to create user credits: %w", err)
	}

	return nil
}

// GetUserCredits 获取用户余额（带锁）
func GetUserCredits(userID string, forUpdate bool) (*models.UserCredits, error) {
	var query string
	if forUpdate {
		query = `SELECT id, user_id, credits,
			monthly_credits_used, monthly_credits_reset_at, last_daily_reward_at,
			created_at, updated_at
			FROM user_credits WHERE user_id = $1 FOR UPDATE`
	} else {
		query = `SELECT id, user_id, credits,
			monthly_credits_used, monthly_credits_reset_at, last_daily_reward_at,
			created_at, updated_at
			FROM user_credits WHERE user_id = $1`
	}

	var credits models.UserCredits
	var lastDailyRewardAt sql.NullTime
	err := DB.QueryRow(query, userID).Scan(
		&credits.ID,
		&credits.UserID,
		&credits.Credits,
		&credits.MonthlyCreditsUsed,
		&credits.MonthlyCreditsResetAt,
		&lastDailyRewardAt,
		&credits.CreatedAt,
		&credits.UpdatedAt,
	)
	if err == nil && lastDailyRewardAt.Valid {
		credits.LastDailyRewardAt = &lastDailyRewardAt.Time
	}

	if err == sql.ErrNoRows {
		// 如果不存在，创建默认记录
		if err := CreateUserCredits(userID); err != nil {
			return nil, err
		}
		// 重新查询
		return GetUserCredits(userID, forUpdate)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user credits: %w", err)
	}

	return &credits, nil
}

// AddCredits 增加积分（使用事务）
func AddCredits(userID string, amount int) error {
	query := `
		UPDATE user_credits
		SET credits = credits + $1, updated_at = NOW()
		WHERE user_id = $2
	`

	result, err := DB.Exec(query, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to add credits: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// 如果记录不存在，创建它
		if err := CreateUserCredits(userID); err != nil {
			return err
		}
		// 重新执行
		_, err = DB.Exec(query, amount, userID)
		if err != nil {
			return fmt.Errorf("failed to add credits: %w", err)
		}
	}

	return nil
}

// DeductCredits 扣除积分（使用SELECT FOR UPDATE锁）
func DeductCredits(userID string, amount int) error {
	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 锁定并检查余额
	var currentCredits int
	err = tx.QueryRow(
		`SELECT credits FROM user_credits WHERE user_id = $1 FOR UPDATE`,
		userID,
	).Scan(&currentCredits)

	if err == sql.ErrNoRows {
		// 如果记录不存在，创建它
		if err := CreateUserCredits(userID); err != nil {
			return err
		}
		currentCredits = 0
	} else if err != nil {
		return fmt.Errorf("failed to get credits: %w", err)
	}

	if currentCredits < amount {
		return fmt.Errorf("insufficient credits: have %d, need %d", currentCredits, amount)
	}

	// 扣除积分
	_, err = tx.Exec(
		`UPDATE user_credits SET credits = credits - $1, updated_at = NOW() WHERE user_id = $2`,
		amount,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to deduct credits: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// RefundCredits 退回积分
func RefundCredits(userID string, amount int) error {
	return AddCredits(userID, amount)
}

// IncrementMonthlyCreditsUsed 增加月度积分使用（订阅用户）
func IncrementMonthlyCreditsUsed(userID string, amount int) error {
	query := `
		UPDATE user_credits
		SET monthly_credits_used = monthly_credits_used + $1, updated_at = NOW()
		WHERE user_id = $2
	`

	_, err := DB.Exec(query, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to increment monthly credits used: %w", err)
	}

	return nil
}

// DecrementMonthlyCreditsUsed 减少月度积分使用（订阅用户退款时）
func DecrementMonthlyCreditsUsed(userID string, amount int) error {
	query := `
		UPDATE user_credits
		SET monthly_credits_used = GREATEST(0, monthly_credits_used - $1), updated_at = NOW()
		WHERE user_id = $2
	`

	_, err := DB.Exec(query, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to decrement monthly credits used: %w", err)
	}

	return nil
}

// ResetMonthlyCredits 重置月度积分使用（每月1号，订阅用户）
func ResetMonthlyCredits(userID string) error {
	now := time.Now()
	nextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())

	query := `
		UPDATE user_credits
		SET monthly_credits_used = 0, monthly_credits_reset_at = $1, updated_at = NOW()
		WHERE user_id = $2
	`

	_, err := DB.Exec(query, nextMonth, userID)
	if err != nil {
		return fmt.Errorf("failed to reset monthly credits: %w", err)
	}

	return nil
}

// UpdateLastDailyRewardAt 更新最后领取每日登录奖励的时间
func UpdateLastDailyRewardAt(userID string, rewardTime time.Time) error {
	query := `
		UPDATE user_credits
		SET last_daily_reward_at = $1, updated_at = NOW()
		WHERE user_id = $2
	`

	_, err := DB.Exec(query, rewardTime, userID)
	if err != nil {
		return fmt.Errorf("failed to update last daily reward at: %w", err)
	}

	return nil
}
