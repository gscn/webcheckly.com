package payment

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
	"web-checkly/models"
	"web-checkly/services"
)

var paypalClient *PayPalClient
var paypalInitialized bool

// PayPalClient PayPal客户端
type PayPalClient struct {
	ClientID     string
	ClientSecret string
	BaseURL      string
	AccessToken  string
	TokenExpiry  time.Time
}

// PayPalOrderRequest PayPal订单请求
type PayPalOrderRequest struct {
	Intent             string               `json:"intent"`
	PurchaseUnits      []PayPalPurchaseUnit `json:"purchase_units"`
	ApplicationContext PayPalAppContext     `json:"application_context"`
}

// PayPalPurchaseUnit 购买单元
type PayPalPurchaseUnit struct {
	ReferenceID string       `json:"reference_id"`
	Amount      PayPalAmount `json:"amount"`
	Description string       `json:"description,omitempty"`
}

// PayPalAmount 金额
type PayPalAmount struct {
	CurrencyCode string `json:"currency_code"`
	Value        string `json:"value"`
}

// PayPalAppContext 应用上下文
type PayPalAppContext struct {
	BrandName string `json:"brand_name,omitempty"`
	ReturnURL string `json:"return_url"`
	CancelURL string `json:"cancel_url"`
}

// PayPalOrderResponse PayPal订单响应
type PayPalOrderResponse struct {
	ID     string       `json:"id"`
	Status string       `json:"status"`
	Links  []PayPalLink `json:"links"`
}

// PayPalLink PayPal链接
type PayPalLink struct {
	Href   string `json:"href"`
	Rel    string `json:"rel"`
	Method string `json:"method"`
}

// PayPalSubscriptionRequest PayPal订阅请求
type PayPalSubscriptionRequest struct {
	PlanID             string           `json:"plan_id,omitempty"`
	Plan               PayPalPlan       `json:"plan,omitempty"`
	ApplicationContext PayPalAppContext `json:"application_context"`
}

// PayPalPlan PayPal计划
type PayPalPlan struct {
	ProductID          string               `json:"product_id,omitempty"`
	Name               string               `json:"name"`
	Description        string               `json:"description,omitempty"`
	BillingCycles      []PayPalBillingCycle `json:"billing_cycles"`
	PaymentPreferences PayPalPaymentPrefs   `json:"payment_preferences"`
}

// PayPalBillingCycle 计费周期
type PayPalBillingCycle struct {
	Frequency     PayPalFrequency     `json:"frequency"`
	TenureType    string              `json:"tenure_type"`
	Sequence      int                 `json:"sequence"`
	TotalCycles   int                 `json:"total_cycles,omitempty"`
	PricingScheme PayPalPricingScheme `json:"pricing_scheme"`
}

// PayPalFrequency 频率
type PayPalFrequency struct {
	IntervalUnit  string `json:"interval_unit"`
	IntervalCount int    `json:"interval_count"`
}

// PayPalPricingScheme 定价方案
type PayPalPricingScheme struct {
	FixedPrice PayPalAmount `json:"fixed_price"`
}

// PayPalPaymentPrefs 支付偏好
type PayPalPaymentPrefs struct {
	AutoBillOutstanding   bool         `json:"auto_bill_outstanding"`
	SetupFee              PayPalAmount `json:"setup_fee,omitempty"`
	SetupFeeFailureAction string       `json:"setup_fee_failure_action,omitempty"`
	PaymentFailureAction  string       `json:"payment_failure_action"`
}

// PayPalSubscriptionResponse PayPal订阅响应
type PayPalSubscriptionResponse struct {
	ID     string       `json:"id"`
	Status string       `json:"status"`
	Links  []PayPalLink `json:"links"`
}

// PayPalAccessTokenResponse 访问令牌响应
type PayPalAccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// PayPalWebhookEvent PayPal Webhook事件
type PayPalWebhookEvent struct {
	ID           string          `json:"id"`
	EventType    string          `json:"event_type"`
	ResourceType string          `json:"resource_type"`
	Resource     json.RawMessage `json:"resource"`
	CreateTime   string          `json:"create_time"`
}

// InitPayPal 初始化PayPal客户端
func InitPayPal() error {
	clientID := os.Getenv("PAYPAL_CLIENT_ID")
	clientSecret := os.Getenv("PAYPAL_CLIENT_SECRET")
	mode := os.Getenv("PAYPAL_MODE")

	if clientID == "" || clientSecret == "" {
		return fmt.Errorf("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables are not set")
	}

	if mode == "" {
		mode = "sandbox" // 默认使用沙箱环境
	}

	var baseURL string
	if mode == "live" {
		baseURL = "https://api-m.paypal.com"
	} else {
		baseURL = "https://api-m.sandbox.paypal.com"
	}

	paypalClient = &PayPalClient{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		BaseURL:      baseURL,
	}

	// 获取初始访问令牌
	if err := refreshAccessToken(); err != nil {
		return fmt.Errorf("failed to get initial access token: %w", err)
	}

	paypalInitialized = true
	return nil
}

// refreshAccessToken 刷新访问令牌
func refreshAccessToken() error {
	if paypalClient == nil {
		return fmt.Errorf("PayPal client not initialized")
	}

	// 如果令牌未过期，直接返回
	if paypalClient.AccessToken != "" && time.Now().Before(paypalClient.TokenExpiry) {
		return nil
	}

	url := paypalClient.BaseURL + "/v1/oauth2/token"

	data := "grant_type=client_credentials"
	req, err := http.NewRequest("POST", url, strings.NewReader(data))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(paypalClient.ClientID, paypalClient.ClientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to get access token: %s", string(body))
	}

	var tokenResp PayPalAccessTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	paypalClient.AccessToken = tokenResp.AccessToken
	paypalClient.TokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second) // 提前60秒刷新

	return nil
}

// CreateOrder 创建PayPal订单（一次性支付）
func CreatePayPalOrder(orderID string, amountUSD float64, description string) (string, string, error) {
	if !paypalInitialized {
		if err := InitPayPal(); err != nil {
			return "", "", fmt.Errorf("PayPal is not configured: %w", err)
		}
	}

	if err := refreshAccessToken(); err != nil {
		return "", "", fmt.Errorf("failed to refresh access token: %w", err)
	}

	successURL := os.Getenv("PAYPAL_SUCCESS_URL")
	if successURL == "" {
		successURL = "http://localhost:3000/payment/success?order_id=" + orderID
	}
	cancelURL := os.Getenv("PAYPAL_CANCEL_URL")
	if cancelURL == "" {
		cancelURL = "http://localhost:3000/payment/cancel"
	}

	orderReq := PayPalOrderRequest{
		Intent: "CAPTURE",
		PurchaseUnits: []PayPalPurchaseUnit{
			{
				ReferenceID: orderID,
				Amount: PayPalAmount{
					CurrencyCode: "USD",
					Value:        fmt.Sprintf("%.2f", amountUSD),
				},
				Description: description,
			},
		},
		ApplicationContext: PayPalAppContext{
			BrandName: "WebCheckly",
			ReturnURL: successURL,
			CancelURL: cancelURL,
		},
	}

	jsonData, err := json.Marshal(orderReq)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := paypalClient.BaseURL + "/v2/checkout/orders"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+paypalClient.AccessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("failed to create order: status %d, body: %s", resp.StatusCode, string(body))
	}

	var orderResp PayPalOrderResponse
	if err := json.NewDecoder(resp.Body).Decode(&orderResp); err != nil {
		return "", "", fmt.Errorf("failed to decode response: %w", err)
	}

	// 查找approve链接
	var approveURL string
	for _, link := range orderResp.Links {
		if link.Rel == "approve" {
			approveURL = link.Href
			break
		}
	}

	return orderResp.ID, approveURL, nil
}

// CaptureOrder 捕获PayPal订单
func CapturePayPalOrder(orderID string) (string, error) {
	if !paypalInitialized {
		if err := InitPayPal(); err != nil {
			return "", fmt.Errorf("PayPal is not configured: %w", err)
		}
	}

	if err := refreshAccessToken(); err != nil {
		return "", fmt.Errorf("failed to refresh access token: %w", err)
	}

	url := paypalClient.BaseURL + "/v2/checkout/orders/" + orderID + "/capture"
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+paypalClient.AccessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to capture order: status %d, body: %s", resp.StatusCode, string(body))
	}

	// 解析响应获取payment ID
	var captureResp map[string]interface{}
	if err := json.Unmarshal(body, &captureResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	// 从purchase_units中提取payment ID
	if purchaseUnits, ok := captureResp["purchase_units"].([]interface{}); ok && len(purchaseUnits) > 0 {
		if unit, ok := purchaseUnits[0].(map[string]interface{}); ok {
			if payments, ok := unit["payments"].(map[string]interface{}); ok {
				if captures, ok := payments["captures"].([]interface{}); ok && len(captures) > 0 {
					if capture, ok := captures[0].(map[string]interface{}); ok {
						if id, ok := capture["id"].(string); ok {
							return id, nil
						}
					}
				}
			}
		}
	}

	return "", fmt.Errorf("failed to extract payment ID from response")
}

// CreateSubscription 创建PayPal订阅
// 注意：PayPal订阅需要预先创建Plan，这里使用PayPal Checkout的订阅模式
func CreatePayPalSubscription(userID string, planType models.SubscriptionPlan) (string, string, error) {
	if !paypalInitialized {
		if err := InitPayPal(); err != nil {
			return "", "", fmt.Errorf("PayPal is not configured: %w", err)
		}
	}

	if err := refreshAccessToken(); err != nil {
		return "", "", fmt.Errorf("failed to refresh access token: %w", err)
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

	// 修复return_url，不能使用占位符，使用固定URL
	successURL := os.Getenv("PAYPAL_SUCCESS_URL")
	if successURL == "" {
		successURL = "http://localhost:3000/subscription/success"
	}
	// 移除占位符，PayPal不支持
	successURL = strings.ReplaceAll(successURL, "{subscription_id}", "")
	successURL = strings.ReplaceAll(successURL, "{{subscription_id}}", "")

	cancelURL := os.Getenv("PAYPAL_CANCEL_URL")
	if cancelURL == "" {
		cancelURL = "http://localhost:3000/subscription/cancel"
	}

	// 使用PayPal v2 API创建订阅（需要先创建Product和Plan）
	// 为了简化，我们使用内联方式创建订阅，但需要正确的格式
	// 注意：PayPal要求必须提供plan_id，所以我们需要先创建Plan
	// 这里使用一个变通方法：先尝试创建Product和Plan，然后创建Subscription

	// 步骤1: 创建Product
	productReq := map[string]interface{}{
		"name":        plan.PlanName,
		"description": fmt.Sprintf("WebCheckly %s Plan", plan.PlanName),
		"type":        "SERVICE",
	}

	productJSON, _ := json.Marshal(productReq)
	productURL := paypalClient.BaseURL + "/v1/catalogs/products"
	productReqHTTP, _ := http.NewRequest("POST", productURL, bytes.NewBuffer(productJSON))
	productReqHTTP.Header.Set("Content-Type", "application/json")
	productReqHTTP.Header.Set("Authorization", "Bearer "+paypalClient.AccessToken)
	productReqHTTP.Header.Set("Accept", "application/json")
	productReqHTTP.Header.Set("Prefer", "return=representation")

	productClient := &http.Client{Timeout: 30 * time.Second}
	productResp, err := productClient.Do(productReqHTTP)
	if err != nil {
		return "", "", fmt.Errorf("failed to create product: %w", err)
	}
	defer productResp.Body.Close()

	var productData map[string]interface{}
	if productResp.StatusCode == http.StatusCreated || productResp.StatusCode == http.StatusOK {
		if err := json.NewDecoder(productResp.Body).Decode(&productData); err != nil {
			productBody, _ := io.ReadAll(productResp.Body)
			return "", "", fmt.Errorf("failed to decode product response: %w, body: %s", err, string(productBody))
		}
	} else {
		productBody, _ := io.ReadAll(productResp.Body)
		return "", "", fmt.Errorf("failed to create product: status %d, body: %s", productResp.StatusCode, string(productBody))
	}

	productID := ""
	if id, ok := productData["id"].(string); ok {
		productID = id
	}

	if productID == "" {
		return "", "", fmt.Errorf("failed to get product ID from response")
	}

	// 步骤2: 创建Plan
	planReq := map[string]interface{}{
		"product_id": productID,
		"name":       plan.PlanName,
		"billing_cycles": []map[string]interface{}{
			{
				"frequency": map[string]interface{}{
					"interval_unit":  "MONTH",
					"interval_count": 1,
				},
				"tenure_type":  "REGULAR",
				"sequence":     1,
				"total_cycles": 0, // 0表示无限期
				"pricing_scheme": map[string]interface{}{
					"fixed_price": map[string]interface{}{
						"value":         fmt.Sprintf("%.2f", plan.MonthlyPriceUSD),
						"currency_code": "USD",
					},
				},
			},
		},
		"payment_preferences": map[string]interface{}{
			"auto_bill_outstanding":  true,
			"payment_failure_action": "CANCEL",
		},
	}

	planJSON, _ := json.Marshal(planReq)
	planURL := paypalClient.BaseURL + "/v1/billing/plans"
	planReqHTTP, _ := http.NewRequest("POST", planURL, bytes.NewBuffer(planJSON))
	planReqHTTP.Header.Set("Content-Type", "application/json")
	planReqHTTP.Header.Set("Authorization", "Bearer "+paypalClient.AccessToken)
	planReqHTTP.Header.Set("Accept", "application/json")
	planReqHTTP.Header.Set("Prefer", "return=representation")

	planClient := &http.Client{Timeout: 30 * time.Second}
	planResp, err := planClient.Do(planReqHTTP)
	if err != nil {
		return "", "", fmt.Errorf("failed to create plan: %w", err)
	}
	defer planResp.Body.Close()

	var planData map[string]interface{}
	if planResp.StatusCode == http.StatusCreated || planResp.StatusCode == http.StatusOK {
		if err := json.NewDecoder(planResp.Body).Decode(&planData); err != nil {
			planBody, _ := io.ReadAll(planResp.Body)
			return "", "", fmt.Errorf("failed to decode plan response: %w, body: %s", err, string(planBody))
		}
	} else {
		planBody, _ := io.ReadAll(planResp.Body)
		return "", "", fmt.Errorf("failed to create plan: status %d, body: %s", planResp.StatusCode, string(planBody))
	}

	planID := ""
	if id, ok := planData["id"].(string); ok {
		planID = id
	}

	if planID == "" {
		planBody, _ := io.ReadAll(planResp.Body)
		return "", "", fmt.Errorf("failed to get plan ID from response: status %d, body: %s", planResp.StatusCode, string(planBody))
	}

	// 步骤3: 创建Subscription
	subscriptionReq := map[string]interface{}{
		"plan_id": planID,
		"application_context": map[string]interface{}{
			"brand_name": "WebCheckly",
			"return_url": successURL,
			"cancel_url": cancelURL,
		},
	}

	subJSON, err := json.Marshal(subscriptionReq)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal subscription request: %w", err)
	}

	subURL := paypalClient.BaseURL + "/v1/billing/subscriptions"
	subReq, err := http.NewRequest("POST", subURL, bytes.NewBuffer(subJSON))
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}

	subReq.Header.Set("Content-Type", "application/json")
	subReq.Header.Set("Authorization", "Bearer "+paypalClient.AccessToken)
	subReq.Header.Set("Accept", "application/json")
	subReq.Header.Set("Prefer", "return=representation")

	subClient := &http.Client{Timeout: 30 * time.Second}
	subResp, err := subClient.Do(subReq)
	if err != nil {
		return "", "", fmt.Errorf("failed to send request: %w", err)
	}
	defer subResp.Body.Close()

	body, _ := io.ReadAll(subResp.Body)
	if subResp.StatusCode != http.StatusCreated {
		return "", "", fmt.Errorf("failed to create subscription: status %d, body: %s", subResp.StatusCode, string(body))
	}

	var subRespData map[string]interface{}
	if err := json.Unmarshal(body, &subRespData); err != nil {
		return "", "", fmt.Errorf("failed to decode response: %w", err)
	}

	subscriptionID := ""
	if id, ok := subRespData["id"].(string); ok {
		subscriptionID = id
	}

	// 查找approve链接
	var approveURL string
	if links, ok := subRespData["links"].([]interface{}); ok {
		for _, link := range links {
			if linkMap, ok := link.(map[string]interface{}); ok {
				if rel, ok := linkMap["rel"].(string); ok && rel == "approve" {
					if href, ok := linkMap["href"].(string); ok {
						approveURL = href
						break
					}
				}
			}
		}
	}

	return subscriptionID, approveURL, nil
}

// CancelPayPalSubscription 取消PayPal订阅
func CancelPayPalSubscription(subscriptionID string) error {
	if !paypalInitialized {
		if err := InitPayPal(); err != nil {
			return fmt.Errorf("PayPal is not configured: %w", err)
		}
	}

	if err := refreshAccessToken(); err != nil {
		return fmt.Errorf("failed to refresh access token: %w", err)
	}

	url := paypalClient.BaseURL + "/v1/billing/subscriptions/" + subscriptionID + "/cancel"

	reqBody := map[string]string{
		"reason": "User requested cancellation",
	}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+paypalClient.AccessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to cancel subscription: status %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

// VerifyPayPalWebhook 验证PayPal webhook签名
func VerifyPayPalWebhook(headers map[string]string, body []byte) (bool, error) {
	webhookID := os.Getenv("PAYPAL_WEBHOOK_ID")
	if webhookID == "" {
		// 如果没有配置webhook ID，跳过验证（不推荐生产环境）
		return true, nil
	}

	if !paypalInitialized {
		if err := InitPayPal(); err != nil {
			return false, fmt.Errorf("PayPal is not configured: %w", err)
		}
	}

	if err := refreshAccessToken(); err != nil {
		return false, fmt.Errorf("failed to refresh access token: %w", err)
	}

	// PayPal webhook验证需要调用验证API
	// 这里简化处理，实际应该调用PayPal的webhook验证API
	// 参考: https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/

	// 检查必要的headers
	if headers["Paypal-Transmission-Id"] == "" || headers["Paypal-Cert-Url"] == "" || headers["Paypal-Auth-Algo"] == "" || headers["Paypal-Transmission-Sig"] == "" {
		return false, fmt.Errorf("missing required PayPal webhook headers")
	}

	// 实际实现中应该调用PayPal的验证API
	// 这里返回true表示验证通过（开发阶段）
	return true, nil
}

// ProcessPayPalWebhookEvent 处理PayPal webhook事件
func ProcessPayPalWebhookEvent(event *PayPalWebhookEvent) (bool, error) {
	// 检查事件是否已处理（幂等性）
	// 实际实现中应该在数据库中记录已处理的事件ID
	processed, _ := ProcessWebhookEvent(event.ID)
	if processed {
		return true, nil
	}

	// 根据事件类型处理
	switch event.EventType {
	case "PAYMENT.CAPTURE.COMPLETED":
		// 处理支付完成
		var resource map[string]interface{}
		if err := json.Unmarshal(event.Resource, &resource); err != nil {
			return false, fmt.Errorf("failed to unmarshal resource: %w", err)
		}

		// 从resource中提取订单ID和支付ID
		// 实际实现中需要根据PayPal的响应结构解析
		_ = resource
		return true, nil

	case "BILLING.SUBSCRIPTION.CREATED", "BILLING.SUBSCRIPTION.ACTIVATED":
		// 处理订阅创建/激活
		return true, nil

	case "BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED":
		// 处理订阅取消/过期
		return true, nil

	default:
		// 其他事件类型
		return true, nil
	}
}
