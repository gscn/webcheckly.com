package payment

import (
	"fmt"
	"os"
	"web-checkly/models"
	"web-checkly/services"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/subscription"
)

var stripeInitialized bool

// InitStripe 初始化Stripe（可选，如果环境变量未设置则跳过）
func InitStripe() error {
	secretKey := os.Getenv("STRIPE_SECRET_KEY")
	if secretKey == "" {
		return fmt.Errorf("STRIPE_SECRET_KEY environment variable is not set")
	}
	stripe.Key = secretKey
	stripeInitialized = true
	return nil
}

// CreateCheckoutSession 创建Stripe Checkout会话
func CreateCheckoutSession(orderID string, amountUSD float64, description string) (string, error) {
	if !stripeInitialized {
		if err := InitStripe(); err != nil {
			return "", fmt.Errorf("Stripe is not configured: %w", err)
		}
	}

	successURL := os.Getenv("STRIPE_SUCCESS_URL")
	if successURL == "" {
		successURL = "http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}"
	}
	cancelURL := os.Getenv("STRIPE_CANCEL_URL")
	if cancelURL == "" {
		cancelURL = "http://localhost:3000/payment/cancel"
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(description),
					},
					UnitAmount: stripe.Int64(int64(amountUSD * 100)), // 转换为分
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata: map[string]string{
			"order_id": orderID,
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create checkout session: %w", err)
	}

	return sess.ID, nil
}

// CreatePaymentIntent 创建支付意图
func CreatePaymentIntent(amountUSD float64, currency string) (string, error) {
	if !stripeInitialized {
		if err := InitStripe(); err != nil {
			return "", fmt.Errorf("Stripe is not configured: %w", err)
		}
	}

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(int64(amountUSD * 100)),
		Currency: stripe.String(currency),
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create payment intent: %w", err)
	}

	return pi.ID, nil
}

// VerifyPayment 验证支付状态
func VerifyPayment(paymentIntentID string) (bool, error) {
	if !stripeInitialized {
		if err := InitStripe(); err != nil {
			return false, fmt.Errorf("Stripe is not configured: %w", err)
		}
	}

	pi, err := paymentintent.Get(paymentIntentID, nil)
	if err != nil {
		return false, fmt.Errorf("failed to get payment intent: %w", err)
	}

	return pi.Status == stripe.PaymentIntentStatusSucceeded, nil
}

// CreateSubscriptionCheckout 创建订阅Checkout
func CreateSubscriptionCheckout(userID string, planType models.SubscriptionPlan) (string, error) {
	if !stripeInitialized {
		if err := InitStripe(); err != nil {
			return "", fmt.Errorf("Stripe is not configured: %w", err)
		}
	}

	// 获取套餐价格
	plans := services.GetPricingPlans()
	var plan models.PricingPlan
	for _, p := range plans {
		if p.PlanType == string(planType) {
			plan = p
			break
		}
	}

	successURL := os.Getenv("STRIPE_SUCCESS_URL")
	if successURL == "" {
		successURL = "http://localhost:3000/subscription/success?session_id={CHECKOUT_SESSION_ID}"
	}
	cancelURL := os.Getenv("STRIPE_CANCEL_URL")
	if cancelURL == "" {
		cancelURL = "http://localhost:3000/subscription/cancel"
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					Recurring: &stripe.CheckoutSessionLineItemPriceDataRecurringParams{
						Interval: stripe.String("month"),
					},
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(plan.PlanName),
					},
					UnitAmount: stripe.Int64(int64(plan.MonthlyPriceUSD * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata: map[string]string{
			"user_id":   userID,
			"plan_type": string(planType),
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create subscription checkout: %w", err)
	}

	return sess.ID, nil
}

// CancelStripeSubscription 取消Stripe订阅
func CancelStripeSubscription(stripeSubscriptionID string) error {
	if !stripeInitialized {
		if err := InitStripe(); err != nil {
			return fmt.Errorf("Stripe is not configured: %w", err)
		}
	}

	_, err := subscription.Cancel(stripeSubscriptionID, nil)
	if err != nil {
		return fmt.Errorf("failed to cancel subscription: %w", err)
	}

	return nil
}

// ProcessWebhookEvent 处理webhook事件（使用eventID防止重复处理）
func ProcessWebhookEvent(eventID string) (bool, error) {
	// 检查事件是否已处理（这里简化处理，实际应该查询数据库）
	// 实际实现中应该在数据库中记录已处理的事件ID
	return false, nil
}
