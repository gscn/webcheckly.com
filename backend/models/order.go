package models

import "time"

// OrderType 订单类型
type OrderType string

const (
	OrderTypeSingleScan      OrderType = "single_scan"
	OrderTypeCreditsPurchase OrderType = "credits_purchase"
	OrderTypeSubscription    OrderType = "subscription"
)

// OrderStatus 订单状态
type OrderStatus string

const (
	OrderStatusPending  OrderStatus = "pending"
	OrderStatusPaid     OrderStatus = "paid"
	OrderStatusFailed   OrderStatus = "failed"
	OrderStatusRefunded OrderStatus = "refunded"
	OrderStatusCanceled OrderStatus = "canceled"
)

// Order 订单
type Order struct {
	ID                      string      `json:"id" db:"id"`
	UserID                  string      `json:"user_id" db:"user_id"`
	OrderType               OrderType   `json:"order_type" db:"order_type"`
	Feature                 *string     `json:"feature,omitempty" db:"feature"`
	Amount                  float64     `json:"amount" db:"amount"`                   // USD金额（美元计费）
	AmountUSD               *float64    `json:"amount_usd,omitempty" db:"amount_usd"` // USD金额（与Amount相同，保留字段以兼容）
	CreditsAmount           int         `json:"credits_amount" db:"credits_amount"`
	Status                  OrderStatus `json:"status" db:"status"`
	PaymentMethod           string      `json:"payment_method" db:"payment_method"`
	StripePaymentIntentID   *string     `json:"stripe_payment_intent_id,omitempty" db:"stripe_payment_intent_id"`
	StripeCheckoutSessionID *string     `json:"stripe_checkout_session_id,omitempty" db:"stripe_checkout_session_id"`
	PayPalOrderID           *string     `json:"paypal_order_id,omitempty" db:"paypal_order_id"`
	PayPalPaymentID         *string     `json:"paypal_payment_id,omitempty" db:"paypal_payment_id"`
	CreatedAt               time.Time   `json:"created_at" db:"created_at"`
	PaidAt                  *time.Time  `json:"paid_at,omitempty" db:"paid_at"`
	ExpiresAt               *time.Time  `json:"expires_at,omitempty" db:"expires_at"`
}
