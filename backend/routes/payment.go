package routes

import (
	"encoding/json"
	"log"
	"os"
	"web-checkly/database"
	"web-checkly/middleware"
	"web-checkly/models"
	"web-checkly/services"
	"web-checkly/services/payment"

	"github.com/gofiber/fiber/v2"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"
)

// CreateCheckoutHandler 创建支付会话
func CreateCheckoutHandler(c *fiber.Ctx) error {
	var req struct {
		OrderID       string `json:"order_id"`
		PaymentMethod string `json:"payment_method,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	if req.OrderID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "order_id is required",
		})
	}

	// 获取订单
	order, err := services.GetOrder(req.OrderID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Order not found",
		})
	}

	// 验证订单所有者
	userID := middleware.GetUserID(c)
	if userID == nil || userID.String() != order.UserID {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	if order.AmountUSD == nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Order amount not set",
		})
	}

	// 确定支付方式（优先使用请求中的，否则使用订单中的）
	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = order.PaymentMethod
	}
	if paymentMethod == "" {
		paymentMethod = "stripe" // 默认
	}

	// 根据支付方式创建对应的支付会话
	if paymentMethod == "paypal" {
		paypalOrderID, approveURL, err := payment.CreatePayPalOrder(req.OrderID, *order.AmountUSD, "WebCheckly Payment")
		if err != nil {
			log.Printf("[Payment] Failed to create PayPal order: %v", err)
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to create PayPal order",
			})
		}

		// 更新订单的PayPal订单ID
		if err := database.UpdateOrderPayPalInfo(req.OrderID, &paypalOrderID, nil); err != nil {
			log.Printf("[Payment] Failed to update PayPal order info: %v", err)
		}

		return c.JSON(fiber.Map{
			"order_id": paypalOrderID,
			"url":      approveURL,
			"provider": "paypal",
		})
	}

	// Stripe支付（默认）
	sessionID, err := payment.CreateCheckoutSession(req.OrderID, *order.AmountUSD, "WebCheckly Payment")
	if err != nil {
		log.Printf("[Payment] Failed to create checkout session: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create checkout session",
		})
	}

	return c.JSON(fiber.Map{
		"session_id": sessionID,
		"url":        "https://checkout.stripe.com/pay/" + sessionID,
		"provider":   "stripe",
	})
}

// WebhookHandler Stripe webhook回调
func WebhookHandler(c *fiber.Ctx) error {
	payload := c.Body()
	sigHeader := c.Get("Stripe-Signature")
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")

	if webhookSecret == "" {
		return c.Status(500).JSON(fiber.Map{
			"error": "Webhook secret not configured",
		})
	}

	event, err := webhook.ConstructEvent(payload, sigHeader, webhookSecret)
	if err != nil {
		log.Printf("[Payment] Webhook signature verification failed: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid signature",
		})
	}

	// 检查事件是否已处理（幂等性）
	processed, _ := payment.ProcessWebhookEvent(event.ID)
	if processed {
		log.Printf("[Payment] Event %s already processed", event.ID)
		return c.JSON(fiber.Map{"status": "already_processed"})
	}

	// 处理事件
	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			log.Printf("[Payment] Failed to unmarshal session: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid event data"})
		}

		// 处理支付成功
		orderID := session.Metadata["order_id"]
		if orderID != "" {
			if err := services.ProcessPayment(orderID, session.PaymentIntent.ID); err != nil {
				log.Printf("[Payment] Failed to process payment: %v", err)
			}
		}

	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			log.Printf("[Payment] Failed to unmarshal payment intent: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid event data"})
		}

		// 处理支付成功
		log.Printf("[Payment] Payment succeeded: %s", pi.ID)

	case "customer.subscription.created", "customer.subscription.updated":
		var subscription stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			log.Printf("[Payment] Failed to unmarshal subscription: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid event data"})
		}

		// 处理订阅创建/更新
		log.Printf("[Payment] Subscription event: %s", event.Type)

	case "customer.subscription.deleted":
		var subscription stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			log.Printf("[Payment] Failed to unmarshal subscription: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid event data"})
		}

		// 处理订阅取消
		log.Printf("[Payment] Subscription canceled: %s", subscription.ID)
	}

	return c.JSON(fiber.Map{"status": "success"})
}

// VerifyPaymentHandler 验证支付状态
func VerifyPaymentHandler(c *fiber.Ctx) error {
	orderID := c.Params("orderId")

	order, err := services.GetOrder(orderID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Order not found",
		})
	}

	// 验证订单所有者
	userID := middleware.GetUserID(c)
	if userID == nil || userID.String() != order.UserID {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	return c.JSON(fiber.Map{
		"order_id": order.ID,
		"status":   string(order.Status),
		"paid_at":  order.PaidAt,
	})
}

// ConfirmPaymentHandler 确认支付（PayPal capture）：用户在 success 页回调时触发
func ConfirmPaymentHandler(c *fiber.Ctx) error {
	var req struct {
		OrderID string `json:"order_id"`
	}

	if err := c.BodyParser(&req); err != nil || req.OrderID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "order_id is required",
		})
	}

	order, err := services.GetOrder(req.OrderID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Order not found",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == nil || userID.String() != order.UserID {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	if order.Status == models.OrderStatusPaid {
		return c.JSON(fiber.Map{
			"order_id": order.ID,
			"status":   string(order.Status),
			"paid_at":  order.PaidAt,
		})
	}

	if order.PaymentMethod != "paypal" || order.PayPalOrderID == nil || *order.PayPalOrderID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Order is not a PayPal order or missing PayPal order id",
		})
	}

	captureID, err := payment.CapturePayPalOrder(*order.PayPalOrderID)
	if err != nil {
		log.Printf("[Payment] Failed to capture PayPal order %s: %v", *order.PayPalOrderID, err)
		return c.Status(502).JSON(fiber.Map{
			"error": "Failed to capture payment",
		})
	}

	if err := services.ProcessPayPalPayment(order.ID, *order.PayPalOrderID, captureID); err != nil {
		log.Printf("[Payment] Failed to process PayPal payment for order %s: %v", order.ID, err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to process payment",
		})
	}

	updated, _ := services.GetOrder(order.ID)
	return c.JSON(fiber.Map{
		"order_id": updated.ID,
		"status":   string(updated.Status),
		"paid_at":  updated.PaidAt,
	})
}

// VerifySessionHandler 根据 Stripe Checkout session_id 验证支付并返回订单状态
func VerifySessionHandler(c *fiber.Ctx) error {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "session_id is required",
		})
	}

	orderID, err := payment.GetStripeSessionOrderID(sessionID)
	if err != nil {
		log.Printf("[Payment] VerifySession failed: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid or expired session",
		})
	}

	order, err := services.GetOrder(orderID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Order not found",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == nil || userID.String() != order.UserID {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	return c.JSON(fiber.Map{
		"order_id": order.ID,
		"status":   string(order.Status),
		"paid_at":  order.PaidAt,
	})
}

// PayPalWebhookHandler PayPal webhook回调
func PayPalWebhookHandler(c *fiber.Ctx) error {
	payload := c.Body()
	headers := make(map[string]string)
	headers["Paypal-Transmission-Id"] = c.Get("Paypal-Transmission-Id")
	headers["Paypal-Cert-Url"] = c.Get("Paypal-Cert-Url")
	headers["Paypal-Auth-Algo"] = c.Get("Paypal-Auth-Algo")
	headers["Paypal-Transmission-Sig"] = c.Get("Paypal-Transmission-Sig")
	headers["Paypal-Transmission-Time"] = c.Get("Paypal-Transmission-Time")

	// 验证webhook签名
	valid, err := payment.VerifyPayPalWebhook(headers, payload)
	if !valid || err != nil {
		log.Printf("[Payment] PayPal webhook signature verification failed: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid signature",
		})
	}

	// 解析webhook事件
	var event payment.PayPalWebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		log.Printf("[Payment] Failed to unmarshal PayPal webhook: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid event data",
		})
	}

	// 检查事件是否已处理（幂等性）
	processed, err := payment.ProcessPayPalWebhookEvent(&event)
	if processed {
		log.Printf("[Payment] PayPal event %s already processed", event.ID)
		return c.JSON(fiber.Map{"status": "already_processed"})
	}

	// 处理事件
	switch event.EventType {
	case "PAYMENT.CAPTURE.COMPLETED":
		// 处理支付完成
		var resource map[string]interface{}
		if err := json.Unmarshal(event.Resource, &resource); err != nil {
			log.Printf("[Payment] Failed to unmarshal PayPal resource: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid resource data"})
		}

		// 从resource中提取订单ID和支付ID
		if purchaseUnits, ok := resource["purchase_units"].([]interface{}); ok && len(purchaseUnits) > 0 {
			if unit, ok := purchaseUnits[0].(map[string]interface{}); ok {
				if referenceID, ok := unit["reference_id"].(string); ok {
					// reference_id应该是我们的订单ID
					orderID := referenceID

					// 获取支付ID
					var paypalPaymentID string
					if payments, ok := resource["payments"].(map[string]interface{}); ok {
						if captures, ok := payments["captures"].([]interface{}); ok && len(captures) > 0 {
							if capture, ok := captures[0].(map[string]interface{}); ok {
								if id, ok := capture["id"].(string); ok {
									paypalPaymentID = id
								}
							}
						}
					}

					// 获取PayPal订单ID
					paypalOrderID := ""
					if id, ok := resource["id"].(string); ok {
						paypalOrderID = id
					}

					if orderID != "" && paypalPaymentID != "" {
						if err := services.ProcessPayPalPayment(orderID, paypalOrderID, paypalPaymentID); err != nil {
							log.Printf("[Payment] Failed to process PayPal payment: %v", err)
						}
					}
				}
			}
		}

	case "BILLING.SUBSCRIPTION.CREATED", "BILLING.SUBSCRIPTION.ACTIVATED":
		// 处理订阅创建/激活
		var resource map[string]interface{}
		if err := json.Unmarshal(event.Resource, &resource); err != nil {
			log.Printf("[Payment] Failed to unmarshal PayPal subscription resource: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid resource data"})
		}

		// 从resource中提取订阅ID和用户ID
		if subscriptionID, ok := resource["id"].(string); ok {
			// 从custom_id或其他字段获取用户ID和套餐类型
			// 这里需要根据实际PayPal响应结构调整
			log.Printf("[Payment] PayPal subscription created/activated: %s", subscriptionID)
		}

	case "BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED":
		// 处理订阅取消/过期
		var resource map[string]interface{}
		if err := json.Unmarshal(event.Resource, &resource); err != nil {
			log.Printf("[Payment] Failed to unmarshal PayPal subscription resource: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid resource data"})
		}

		if subscriptionID, ok := resource["id"].(string); ok {
			log.Printf("[Payment] PayPal subscription canceled/expired: %s", subscriptionID)
			// 这里应该更新数据库中的订阅状态
		}

	default:
		log.Printf("[Payment] Unhandled PayPal event type: %s", event.EventType)
	}

	return c.JSON(fiber.Map{"status": "success"})
}
