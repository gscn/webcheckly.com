package models

import "time"

// UserCredits 用户积分
type UserCredits struct {
	ID                    string     `json:"id" db:"id"`
	UserID                string     `json:"user_id" db:"user_id"`
	Credits               int        `json:"credits" db:"credits"`
	MonthlyCreditsUsed    int        `json:"monthly_credits_used" db:"monthly_credits_used"`
	MonthlyCreditsResetAt *time.Time `json:"monthly_credits_reset_at,omitempty" db:"monthly_credits_reset_at"`
	LastDailyRewardAt     *time.Time `json:"last_daily_reward_at,omitempty" db:"last_daily_reward_at"` // 上次领取每日登录奖励的时间
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

// CreditTransaction 积分变动记录（可选，用于审计）
type CreditTransaction struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	Amount      int       `json:"amount" db:"amount"` // 正数为增加，负数为扣除
	Type        string    `json:"type" db:"type"`     // 'purchase', 'deduct', 'refund'
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
