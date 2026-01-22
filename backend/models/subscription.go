package models

import "time"

// SubscriptionPlan 订阅套餐类型
type SubscriptionPlan string

const (
	SubscriptionPlanBasic      SubscriptionPlan = "basic"
	SubscriptionPlanPro        SubscriptionPlan = "pro"
	SubscriptionPlanEnterprise SubscriptionPlan = "enterprise"
)

// SubscriptionStatus 订阅状态
type SubscriptionStatus string

const (
	SubscriptionStatusActive   SubscriptionStatus = "active"
	SubscriptionStatusCanceled SubscriptionStatus = "canceled"
	SubscriptionStatusExpired  SubscriptionStatus = "expired"
	SubscriptionStatusPending  SubscriptionStatus = "pending"
)

// Subscription 用户订阅
type Subscription struct {
	ID                   string             `json:"id" db:"id"`
	UserID               string             `json:"user_id" db:"user_id"`
	PlanType             SubscriptionPlan   `json:"plan_type" db:"plan_type"`
	Status               SubscriptionStatus `json:"status" db:"status"`
	StartedAt            time.Time          `json:"started_at" db:"started_at"`
	ExpiresAt            time.Time          `json:"expires_at" db:"expires_at"`
	AutoRenew            bool               `json:"auto_renew" db:"auto_renew"`
	StripeSubscriptionID *string            `json:"stripe_subscription_id,omitempty" db:"stripe_subscription_id"`
	PayPalSubscriptionID *string            `json:"paypal_subscription_id,omitempty" db:"paypal_subscription_id"`
	CreatedAt            time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time          `json:"updated_at" db:"updated_at"`
}

// SubscriptionUsage 订阅使用记录
type SubscriptionUsage struct {
	ID                  string    `json:"id" db:"id"`
	UserID              string    `json:"user_id" db:"user_id"`
	SubscriptionID      string    `json:"subscription_id" db:"subscription_id"`
	Month               time.Time `json:"month" db:"month"`
	BasicScansUsed      int       `json:"basic_scans_used" db:"basic_scans_used"`
	PremiumFeaturesUsed int       `json:"premium_features_used" db:"premium_features_used"`
	CreditsUsed         int       `json:"credits_used" db:"credits_used"`
	APIAccessUsed       int       `json:"api_access_used" db:"api_access_used"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}
