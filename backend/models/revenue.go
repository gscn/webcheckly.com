package models

import "time"

// RevenueStatistics 收入统计信息
type RevenueStatistics struct {
	TotalRevenue       float64            `json:"total_revenue"`        // 总收入
	TotalOrders        int                `json:"total_orders"`         // 总订单数
	AverageOrderAmount float64            `json:"average_order_amount"` // 平均订单金额
	ByPaymentMethod    map[string]float64 `json:"by_payment_method"`    // 按支付方式统计
	ByOrderType        map[string]float64 `json:"by_order_type"`        // 按订单类型统计
	ByStatus           map[string]int     `json:"by_status"`            // 按订单状态统计
	RefundedAmount     float64            `json:"refunded_amount"`      // 退款总额
	RefundedOrders     int                `json:"refunded_orders"`      // 退款订单数
	DateRange          struct {
		Start time.Time `json:"start"`
		End   time.Time `json:"end"`
	} `json:"date_range"`
}

// RevenueOrder 收入订单（包含用户信息）
type RevenueOrder struct {
	Order
	UserEmail string `json:"user_email"` // 用户邮箱
}

// RevenueOrderListResponse 订单列表响应
type RevenueOrderListResponse struct {
	Orders     []*RevenueOrder    `json:"orders"`
	Total      int                `json:"total"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int                `json:"total_pages"`
	Statistics *RevenueStatistics `json:"statistics,omitempty"` // 可选的统计信息
}
