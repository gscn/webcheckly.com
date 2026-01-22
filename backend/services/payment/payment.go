package payment

import (
	"fmt"
	"web-checkly/models"
)

// PaymentProvider 支付服务提供者接口
type PaymentProvider interface {
	// CreateCheckout 创建支付会话（一次性支付）
	CreateCheckout(orderID string, amountUSD float64, description string) (string, string, error)
	// CreateSubscription 创建订阅
	CreateSubscription(userID string, planType models.SubscriptionPlan) (string, string, error)
	// CancelSubscription 取消订阅
	CancelSubscription(subscriptionID string) error
	// GetProviderName 获取提供者名称
	GetProviderName() string
}

// StripeProvider Stripe支付提供者
type StripeProvider struct{}

func (p *StripeProvider) GetProviderName() string {
	return "stripe"
}

func (p *StripeProvider) CreateCheckout(orderID string, amountUSD float64, description string) (string, string, error) {
	sessionID, err := CreateCheckoutSession(orderID, amountUSD, description)
	if err != nil {
		return "", "", err
	}
	url := "https://checkout.stripe.com/pay/" + sessionID
	return sessionID, url, nil
}

func (p *StripeProvider) CreateSubscription(userID string, planType models.SubscriptionPlan) (string, string, error) {
	sessionID, err := CreateSubscriptionCheckout(userID, planType)
	if err != nil {
		return "", "", err
	}
	url := "https://checkout.stripe.com/pay/" + sessionID
	return sessionID, url, nil
}

func (p *StripeProvider) CancelSubscription(subscriptionID string) error {
	return CancelStripeSubscription(subscriptionID)
}

// PayPalProvider PayPal支付提供者
type PayPalProvider struct{}

func (p *PayPalProvider) GetProviderName() string {
	return "paypal"
}

func (p *PayPalProvider) CreateCheckout(orderID string, amountUSD float64, description string) (string, string, error) {
	paypalOrderID, approveURL, err := CreatePayPalOrder(orderID, amountUSD, description)
	if err != nil {
		return "", "", err
	}
	return paypalOrderID, approveURL, nil
}

func (p *PayPalProvider) CreateSubscription(userID string, planType models.SubscriptionPlan) (string, string, error) {
	subscriptionID, approveURL, err := CreatePayPalSubscription(userID, planType)
	if err != nil {
		return "", "", err
	}
	return subscriptionID, approveURL, nil
}

func (p *PayPalProvider) CancelSubscription(subscriptionID string) error {
	return CancelPayPalSubscription(subscriptionID)
}

// GetProvider 根据支付方式获取对应的支付提供者
func GetProvider(paymentMethod string) (PaymentProvider, error) {
	switch paymentMethod {
	case "stripe":
		return &StripeProvider{}, nil
	case "paypal":
		return &PayPalProvider{}, nil
	default:
		return nil, fmt.Errorf("unsupported payment method: %s", paymentMethod)
	}
}

// GetDefaultProvider 获取默认支付提供者
func GetDefaultProvider() PaymentProvider {
	return &StripeProvider{}
}
