package services

import (
	"database/sql"
	"fmt"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// GetUserSubscription 获取用户订阅
func GetUserSubscription(userID string) (*models.Subscription, error) {
	query := `
		SELECT id, user_id, plan_type, status, started_at, expires_at,
			auto_renew, stripe_subscription_id, paypal_subscription_id, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1 AND status = 'active'
		ORDER BY created_at DESC
		LIMIT 1
	`

	var subscription models.Subscription
	var stripeSubscriptionID, paypalSubscriptionID sql.NullString

	err := database.GetDB().QueryRow(query, userID).Scan(
		&subscription.ID,
		&subscription.UserID,
		&subscription.PlanType,
		&subscription.Status,
		&subscription.StartedAt,
		&subscription.ExpiresAt,
		&subscription.AutoRenew,
		&stripeSubscriptionID,
		&paypalSubscriptionID,
		&subscription.CreatedAt,
		&subscription.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // 没有订阅
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get subscription: %w", err)
	}

	if stripeSubscriptionID.Valid {
		subscription.StripeSubscriptionID = &stripeSubscriptionID.String
	}
	if paypalSubscriptionID.Valid {
		subscription.PayPalSubscriptionID = &paypalSubscriptionID.String
	}

	return &subscription, nil
}

// CreateSubscription 创建订阅
func CreateSubscription(userID string, planType models.SubscriptionPlan) (*models.Subscription, error) {
	now := time.Now()
	expiresAt := now.AddDate(0, 1, 0) // 1个月后

	subscription := &models.Subscription{
		ID:        uuid.New().String(),
		UserID:    userID,
		PlanType:  planType,
		Status:    models.SubscriptionStatusActive,
		StartedAt: now,
		ExpiresAt: expiresAt,
		AutoRenew: true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	query := `
		INSERT INTO subscriptions (
			id, user_id, plan_type, status, started_at, expires_at,
			auto_renew, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := database.GetDB().Exec(
		query,
		subscription.ID,
		subscription.UserID,
		string(subscription.PlanType),
		string(subscription.Status),
		subscription.StartedAt,
		subscription.ExpiresAt,
		subscription.AutoRenew,
		subscription.CreatedAt,
		subscription.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return subscription, nil
}

// CancelSubscription 取消订阅
func CancelSubscription(userID string) error {
	query := `
		UPDATE subscriptions
		SET status = 'canceled', updated_at = NOW()
		WHERE user_id = $1 AND status = 'active'
	`

	_, err := database.GetDB().Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to cancel subscription: %w", err)
	}

	return nil
}

// CheckSubscriptionStatus 检查订阅状态
func CheckSubscriptionStatus(userID string) (*models.Subscription, error) {
	return GetUserSubscription(userID)
}

// GetSubscriptionPlans 获取套餐列表
func GetSubscriptionPlans() []models.PricingPlan {
	return GetPricingPlans()
}

// GetMonthlyUsage 获取月度使用记录
func GetMonthlyUsage(userID string, month time.Time) (*models.SubscriptionUsage, error) {
	monthStart := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())

	query := `
		SELECT id, user_id, subscription_id, month, basic_scans_used,
			premium_features_used, credits_used, api_access_used, created_at, updated_at
		FROM subscription_usage
		WHERE user_id = $1 AND month = $2
	`

	var usage models.SubscriptionUsage
	err := database.GetDB().QueryRow(query, userID, monthStart).Scan(
		&usage.ID,
		&usage.UserID,
		&usage.SubscriptionID,
		&usage.Month,
		&usage.BasicScansUsed,
		&usage.PremiumFeaturesUsed,
		&usage.CreditsUsed,
		&usage.APIAccessUsed,
		&usage.CreatedAt,
		&usage.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly usage: %w", err)
	}

	return &usage, nil
}
