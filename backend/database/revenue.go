package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"
	"web-checkly/models"
)

// GetRevenueOrders 获取收入订单列表（支持多维度筛选）
func GetRevenueOrders(page, pageSize int, filters map[string]interface{}) ([]*models.RevenueOrder, error) {
	offset := (page - 1) * pageSize

	// 构建WHERE子句
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// 时间范围筛选（基于paid_at或created_at）
	if startDate, ok := filters["start_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("(orders.paid_at >= $%d OR (orders.paid_at IS NULL AND orders.created_at >= $%d))", argIndex, argIndex))
		args = append(args, startDate)
		argIndex++
	}
	if endDate, ok := filters["end_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("(orders.paid_at <= $%d OR (orders.paid_at IS NULL AND orders.created_at <= $%d))", argIndex, argIndex))
		args = append(args, endDate)
		argIndex++
	}

	// 支付方式筛选
	if paymentMethod, ok := filters["payment_method"].(string); ok && paymentMethod != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.payment_method = $%d", argIndex))
		args = append(args, paymentMethod)
		argIndex++
	}

	// 订单类型筛选
	if orderType, ok := filters["order_type"].(string); ok && orderType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.order_type = $%d", argIndex))
		args = append(args, orderType)
		argIndex++
	}

	// 订单状态筛选
	if status, ok := filters["status"].(string); ok && status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	// 用户ID筛选
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	// 构建WHERE子句
	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// 查询订单列表（包含用户邮箱）
	query := fmt.Sprintf(`
		SELECT 
			orders.id, orders.user_id, orders.order_type, orders.feature, 
			orders.amount, orders.amount_usd, orders.credits_amount,
			orders.status, orders.payment_method, 
			orders.stripe_payment_intent_id, orders.stripe_checkout_session_id,
			orders.paypal_order_id, orders.paypal_payment_id,
			orders.created_at, orders.paid_at, orders.expires_at,
			COALESCE(users.email, '') as email
		FROM orders
		LEFT JOIN users ON orders.user_id = users.id
		%s
		ORDER BY orders.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	// 调试：打印生成的SQL查询（仅开发环境）
	log.Printf("[GetRevenueOrders] Args count: %d", len(args))
	if len(args) > 0 {
		log.Printf("[GetRevenueOrders] Args: %v", args)
	}

	rows, err := DB.Query(query, args...)
	if err != nil {
		log.Printf("[GetRevenueOrders] SQL Error: %v", err)
		log.Printf("[GetRevenueOrders] Query: %s", query)
		return nil, fmt.Errorf("failed to query revenue orders: %w", err)
	}
	defer rows.Close()

	var orders []*models.RevenueOrder
	for rows.Next() {
		var order models.RevenueOrder
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
			&order.UserEmail,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan revenue order: %w", err)
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

// GetRevenueOrdersCount 获取订单总数
func GetRevenueOrdersCount(filters map[string]interface{}) (int, error) {
	// 构建WHERE子句
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// 时间范围筛选
	if startDate, ok := filters["start_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("(orders.paid_at >= $%d OR (orders.paid_at IS NULL AND orders.created_at >= $%d))", argIndex, argIndex))
		args = append(args, startDate)
		argIndex++
	}
	if endDate, ok := filters["end_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("(orders.paid_at <= $%d OR (orders.paid_at IS NULL AND orders.created_at <= $%d))", argIndex, argIndex))
		args = append(args, endDate)
		argIndex++
	}

	// 支付方式筛选
	if paymentMethod, ok := filters["payment_method"].(string); ok && paymentMethod != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.payment_method = $%d", argIndex))
		args = append(args, paymentMethod)
		argIndex++
	}

	// 订单类型筛选
	if orderType, ok := filters["order_type"].(string); ok && orderType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.order_type = $%d", argIndex))
		args = append(args, orderType)
		argIndex++
	}

	// 订单状态筛选
	if status, ok := filters["status"].(string); ok && status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	// 用户ID筛选
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	// 构建WHERE子句
	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// 查询总数
	query := fmt.Sprintf("SELECT COUNT(*) FROM orders %s", whereClause)

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count revenue orders: %w", err)
	}

	return count, nil
}

// GetRevenueStatistics 获取收入统计信息
func GetRevenueStatistics(filters map[string]interface{}) (*models.RevenueStatistics, error) {
	stats := &models.RevenueStatistics{
		ByPaymentMethod: make(map[string]float64),
		ByOrderType:     make(map[string]float64),
		ByStatus:        make(map[string]int),
	}

	// 构建WHERE子句
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// 时间范围筛选
	if startDate, ok := filters["start_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("(orders.paid_at >= $%d OR (orders.paid_at IS NULL AND orders.created_at >= $%d))", argIndex, argIndex))
		args = append(args, startDate)
		stats.DateRange.Start = startDate
		argIndex++
	} else {
		// 默认最近30天
		stats.DateRange.Start = time.Now().AddDate(0, 0, -30)
	}

	if endDate, ok := filters["end_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("(orders.paid_at <= $%d OR (orders.paid_at IS NULL AND orders.created_at <= $%d))", argIndex, argIndex))
		args = append(args, endDate)
		stats.DateRange.End = endDate
		argIndex++
	} else {
		stats.DateRange.End = time.Now()
	}

	// 支付方式筛选
	if paymentMethod, ok := filters["payment_method"].(string); ok && paymentMethod != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.payment_method = $%d", argIndex))
		args = append(args, paymentMethod)
		argIndex++
	}

	// 订单类型筛选
	if orderType, ok := filters["order_type"].(string); ok && orderType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.order_type = $%d", argIndex))
		args = append(args, orderType)
		argIndex++
	}

	// 用户ID筛选
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("orders.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	// 构建WHERE子句
	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// 1. 获取总收入（只统计已支付订单）
	var revenueQuery string
	if whereClause != "" {
		revenueQuery = fmt.Sprintf(`
			SELECT COALESCE(SUM(orders.amount), 0)
			FROM orders
			%s AND orders.status = 'paid'
		`, whereClause)
	} else {
		revenueQuery = `
			SELECT COALESCE(SUM(orders.amount), 0)
			FROM orders
			WHERE orders.status = 'paid'
		`
	}

	err := DB.QueryRow(revenueQuery, args...).Scan(&stats.TotalRevenue)
	if err != nil {
		return nil, fmt.Errorf("failed to get total revenue: %w", err)
	}

	// 2. 获取总订单数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM orders %s", whereClause)
	var countArgs []interface{}
	if whereClause != "" {
		countArgs = args
	}
	err = DB.QueryRow(countQuery, countArgs...).Scan(&stats.TotalOrders)
	if err != nil {
		return nil, fmt.Errorf("failed to get total orders: %w", err)
	}

	// 3. 计算平均订单金额
	if stats.TotalOrders > 0 {
		stats.AverageOrderAmount = stats.TotalRevenue / float64(stats.TotalOrders)
	}

	// 4. 按支付方式统计（只统计已支付订单）
	var paymentMethodQuery string
	if whereClause != "" {
		paymentMethodQuery = fmt.Sprintf(`
			SELECT orders.payment_method, COALESCE(SUM(orders.amount), 0) as total
			FROM orders
			%s AND orders.status = 'paid'
			GROUP BY orders.payment_method
		`, whereClause)
	} else {
		paymentMethodQuery = `
			SELECT orders.payment_method, COALESCE(SUM(orders.amount), 0) as total
			FROM orders
			WHERE orders.status = 'paid'
			GROUP BY orders.payment_method
		`
	}

	var paymentArgs []interface{}
	if whereClause != "" {
		paymentArgs = args
	}
	paymentRows, err := DB.Query(paymentMethodQuery, paymentArgs...)
	if err == nil {
		defer paymentRows.Close()
		for paymentRows.Next() {
			var method string
			var total float64
			if err := paymentRows.Scan(&method, &total); err == nil {
				stats.ByPaymentMethod[method] = total
			}
		}
	}

	// 5. 按订单类型统计（只统计已支付订单）
	var orderTypeQuery string
	if whereClause != "" {
		orderTypeQuery = fmt.Sprintf(`
			SELECT orders.order_type, COALESCE(SUM(orders.amount), 0) as total
			FROM orders
			%s AND orders.status = 'paid'
			GROUP BY orders.order_type
		`, whereClause)
	} else {
		orderTypeQuery = `
			SELECT orders.order_type, COALESCE(SUM(orders.amount), 0) as total
			FROM orders
			WHERE orders.status = 'paid'
			GROUP BY orders.order_type
		`
	}

	var typeArgs []interface{}
	if whereClause != "" {
		typeArgs = args
	}
	typeRows, err := DB.Query(orderTypeQuery, typeArgs...)
	if err == nil {
		defer typeRows.Close()
		for typeRows.Next() {
			var orderType string
			var total float64
			if err := typeRows.Scan(&orderType, &total); err == nil {
				stats.ByOrderType[orderType] = total
			}
		}
	}

	// 6. 按订单状态统计
	statusQuery := fmt.Sprintf(`
		SELECT orders.status, COUNT(*) as count
		FROM orders
		%s
		GROUP BY orders.status
	`, whereClause)

	var statusArgs []interface{}
	if whereClause != "" {
		statusArgs = args
	}
	statusRows, err := DB.Query(statusQuery, statusArgs...)
	if err == nil {
		defer statusRows.Close()
		for statusRows.Next() {
			var status string
			var count int
			if err := statusRows.Scan(&status, &count); err == nil {
				stats.ByStatus[status] = count
			}
		}
	}

	// 7. 获取退款总额和退款订单数
	var refundQuery string
	var refundArgs []interface{}
	if whereClause != "" {
		refundQuery = fmt.Sprintf(`
			SELECT COALESCE(SUM(orders.amount), 0), COUNT(*)
			FROM orders
			%s AND orders.status = 'refunded'
		`, whereClause)
		refundArgs = args
	} else {
		refundQuery = `
			SELECT COALESCE(SUM(orders.amount), 0), COUNT(*)
			FROM orders
			WHERE orders.status = 'refunded'
		`
		refundArgs = []interface{}{}
	}

	err = DB.QueryRow(refundQuery, refundArgs...).Scan(&stats.RefundedAmount, &stats.RefundedOrders)
	if err != nil && err != sql.ErrNoRows {
		// 忽略错误，退款可能为0
		stats.RefundedAmount = 0
		stats.RefundedOrders = 0
	}

	return stats, nil
}
