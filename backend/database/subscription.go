package database

import (
	"database/sql"
	"fmt"
	"web-checkly/models"
)

// GetAllSubscriptions 获取所有订阅列表（管理员功能）
func GetAllSubscriptions(limit, offset int, status, planType string) ([]*models.Subscription, error) {
	var query string
	var args []interface{}
	argIndex := 1

	query = `
		SELECT id, user_id, plan_type, status, started_at, expires_at,
		       auto_renew, stripe_subscription_id, paypal_subscription_id, created_at, updated_at
		FROM subscriptions
		WHERE 1=1
	`

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	if planType != "" {
		query += fmt.Sprintf(" AND plan_type = $%d", argIndex)
		args = append(args, planType)
		argIndex++
	}

	query += " ORDER BY created_at DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query subscriptions: %w", err)
	}
	defer rows.Close()

	var subscriptions []*models.Subscription
	for rows.Next() {
		var subscription models.Subscription
		var stripeSubscriptionID, paypalSubscriptionID sql.NullString

		err := rows.Scan(
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
		if err != nil {
			return nil, fmt.Errorf("failed to scan subscription: %w", err)
		}

		if stripeSubscriptionID.Valid {
			subscription.StripeSubscriptionID = &stripeSubscriptionID.String
		}
		if paypalSubscriptionID.Valid {
			subscription.PayPalSubscriptionID = &paypalSubscriptionID.String
		}

		subscriptions = append(subscriptions, &subscription)
	}

	return subscriptions, nil
}

// GetSubscriptionCount 获取订阅总数（管理员功能，支持筛选）
func GetSubscriptionCount(status, planType string) (int, error) {
	var count int
	var query string
	var args []interface{}
	argIndex := 1

	query = `SELECT COUNT(*) FROM subscriptions WHERE 1=1`

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	if planType != "" {
		query += fmt.Sprintf(" AND plan_type = $%d", argIndex)
		args = append(args, planType)
		argIndex++
	}

	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get subscription count: %w", err)
	}
	return count, nil
}

// UpdateSubscriptionStatus 更新订阅状态（管理员功能）
func UpdateSubscriptionStatus(subscriptionID string, status string) error {
	query := `
		UPDATE subscriptions
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := DB.Exec(query, status, subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to update subscription status: %w", err)
	}
	return nil
}

// GetSubscriptionByID 根据ID获取订阅（管理员功能）
func GetSubscriptionByID(subscriptionID string) (*models.Subscription, error) {
	query := `
		SELECT id, user_id, plan_type, status, started_at, expires_at,
		       auto_renew, stripe_subscription_id, paypal_subscription_id, created_at, updated_at
		FROM subscriptions
		WHERE id = $1
	`

	var subscription models.Subscription
	var stripeSubscriptionID, paypalSubscriptionID sql.NullString

	err := DB.QueryRow(query, subscriptionID).Scan(
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
		return nil, nil
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
