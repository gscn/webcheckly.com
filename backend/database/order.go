package database

import (
	"database/sql"
	"fmt"
	"time"
	"web-checkly/models"
)

// CreateOrder 创建订单
func CreateOrder(order *models.Order) error {
	query := `
		INSERT INTO orders (
			id, user_id, order_type, feature, amount, amount_usd, credits_amount,
			status, payment_method, stripe_payment_intent_id, stripe_checkout_session_id,
			paypal_order_id, paypal_payment_id, created_at, paid_at, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`

	expiresAt := time.Now().Add(30 * time.Minute) // 30分钟后过期

	_, err := DB.Exec(
		query,
		order.ID,
		order.UserID,
		string(order.OrderType),
		order.Feature,
		order.Amount,
		order.AmountUSD,
		order.CreditsAmount,
		string(order.Status),
		order.PaymentMethod,
		order.StripePaymentIntentID,
		order.StripeCheckoutSessionID,
		order.PayPalOrderID,
		order.PayPalPaymentID,
		order.CreatedAt,
		order.PaidAt,
		expiresAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create order: %w", err)
	}

	return nil
}

// GetOrder 获取订单详情
func GetOrder(orderID string) (*models.Order, error) {
	query := `
		SELECT id, user_id, order_type, feature, amount, amount_usd, credits_amount,
			status, payment_method, stripe_payment_intent_id, stripe_checkout_session_id,
			paypal_order_id, paypal_payment_id, created_at, paid_at, expires_at
		FROM orders
		WHERE id = $1
	`

	var order models.Order
	var feature, stripePaymentIntentID, stripeCheckoutSessionID, paypalOrderID, paypalPaymentID sql.NullString
	var amountUSD sql.NullFloat64
	var paidAt sql.NullTime
	var expiresAt sql.NullTime

	err := DB.QueryRow(query, orderID).Scan(
		&order.ID,
		&order.UserID,
		&order.OrderType,
		&feature,
		&order.Amount,
		&amountUSD,
		&order.CreditsAmount,
		&order.Status,
		&order.PaymentMethod,
		&stripePaymentIntentID,
		&stripeCheckoutSessionID,
		&paypalOrderID,
		&paypalPaymentID,
		&order.CreatedAt,
		&paidAt,
		&expiresAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("order not found: %s", orderID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	if feature.Valid {
		order.Feature = &feature.String
	}
	if amountUSD.Valid {
		order.AmountUSD = &amountUSD.Float64
	}
	if stripePaymentIntentID.Valid {
		order.StripePaymentIntentID = &stripePaymentIntentID.String
	}
	if stripeCheckoutSessionID.Valid {
		order.StripeCheckoutSessionID = &stripeCheckoutSessionID.String
	}
	if paypalOrderID.Valid {
		order.PayPalOrderID = &paypalOrderID.String
	}
	if paypalPaymentID.Valid {
		order.PayPalPaymentID = &paypalPaymentID.String
	}
	if paidAt.Valid {
		order.PaidAt = &paidAt.Time
	}
	if expiresAt.Valid {
		order.ExpiresAt = &expiresAt.Time
	}

	return &order, nil
}

// UpdateOrderStatus 更新订单状态
func UpdateOrderStatus(orderID string, status models.OrderStatus) error {
	query := `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`

	var paidAt *time.Time
	if status == models.OrderStatusPaid {
		now := time.Now()
		paidAt = &now
		query = `UPDATE orders SET status = $1, paid_at = $2, updated_at = $2 WHERE id = $3`
		_, err := DB.Exec(query, string(status), paidAt, orderID)
		return err
	}

	_, err := DB.Exec(query, string(status), orderID)
	return err
}

// GetUserOrders 获取用户订单列表
func GetUserOrders(userID string, limit, offset int) ([]*models.Order, error) {
	query := `
		SELECT id, user_id, order_type, feature, amount, amount_usd, credits_amount,
			status, payment_method, stripe_payment_intent_id, stripe_checkout_session_id,
			paypal_order_id, paypal_payment_id, created_at, paid_at, expires_at
		FROM orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := DB.Query(query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query orders: %w", err)
	}
	defer rows.Close()

	var orders []*models.Order
	for rows.Next() {
		var order models.Order
		var feature, stripePaymentIntentID, stripeCheckoutSessionID, paypalOrderID, paypalPaymentID sql.NullString
		var amountUSD sql.NullFloat64
		var paidAt sql.NullTime
		var expiresAt sql.NullTime

		err := rows.Scan(
			&order.ID,
			&order.UserID,
			&order.OrderType,
			&feature,
			&order.Amount,
			&amountUSD,
			&order.CreditsAmount,
			&order.Status,
			&order.PaymentMethod,
			&stripePaymentIntentID,
			&stripeCheckoutSessionID,
			&paypalOrderID,
			&paypalPaymentID,
			&order.CreatedAt,
			&paidAt,
			&expiresAt,
		)
		if err != nil {
			continue
		}

		if feature.Valid {
			order.Feature = &feature.String
		}
		if amountUSD.Valid {
			order.AmountUSD = &amountUSD.Float64
		}
		if stripePaymentIntentID.Valid {
			order.StripePaymentIntentID = &stripePaymentIntentID.String
		}
		if stripeCheckoutSessionID.Valid {
			order.StripeCheckoutSessionID = &stripeCheckoutSessionID.String
		}
		if paypalOrderID.Valid {
			order.PayPalOrderID = &paypalOrderID.String
		}
		if paypalPaymentID.Valid {
			order.PayPalPaymentID = &paypalPaymentID.String
		}
		if paidAt.Valid {
			order.PaidAt = &paidAt.Time
		}
		if expiresAt.Valid {
			order.ExpiresAt = &expiresAt.Time
		}

		orders = append(orders, &order)
	}

	return orders, nil
}

// CleanupExpiredOrders 清理过期订单
func CleanupExpiredOrders() error {
	query := `
		UPDATE orders
		SET status = 'canceled'
		WHERE status = 'pending' AND expires_at < NOW()
	`

	result, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to cleanup expired orders: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		fmt.Printf("[OrderCleanup] Canceled %d expired orders\n", rowsAffected)
	}

	return nil
}

// UpdateOrderPayPalInfo 更新订单的PayPal信息
func UpdateOrderPayPalInfo(orderID string, paypalOrderID, paypalPaymentID *string) error {
	query := `
		UPDATE orders 
		SET paypal_order_id = $1, paypal_payment_id = $2, updated_at = NOW()
		WHERE id = $3
	`
	_, err := DB.Exec(query, paypalOrderID, paypalPaymentID, orderID)
	if err != nil {
		return fmt.Errorf("failed to update PayPal info: %w", err)
	}
	return nil
}
