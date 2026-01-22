package routes

import (
	"log"
	"time"
	"web-checkly/middleware"
	"web-checkly/models"
	"web-checkly/services"
	"web-checkly/services/payment"

	"github.com/gofiber/fiber/v2"
)

// GetSubscriptionStatusHandler 获取订阅状态
func GetSubscriptionStatusHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	subscription, err := services.GetUserSubscription(userID.String())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get subscription",
		})
	}

	if subscription == nil {
		return c.JSON(fiber.Map{
			"subscription": nil,
		})
	}

	return c.JSON(fiber.Map{
		"subscription": subscription,
	})
}

// GetSubscriptionPlansHandler 获取套餐列表
func GetSubscriptionPlansHandler(c *fiber.Ctx) error {
	plans := services.GetSubscriptionPlans()
	return c.JSON(fiber.Map{
		"plans": plans,
	})
}

// GetMonthlyUsageHandler 获取月度使用记录
func GetMonthlyUsageHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	monthStr := c.Query("month")
	var month time.Time
	var err error

	if monthStr != "" {
		month, err = time.Parse("2006-01", monthStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid month format (YYYY-MM)",
			})
		}
	} else {
		month = time.Now()
	}

	usage, err := services.GetMonthlyUsage(userID.String(), month)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get monthly usage",
		})
	}

	return c.JSON(fiber.Map{
		"usage": usage,
	})
}

// CreateSubscriptionHandler 创建订阅
func CreateSubscriptionHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req struct {
		PlanType      string `json:"plan_type"`
		PaymentMethod string `json:"payment_method,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	planType := models.SubscriptionPlan(req.PlanType)
	if planType != models.SubscriptionPlanBasic &&
		planType != models.SubscriptionPlanPro &&
		planType != models.SubscriptionPlanEnterprise {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid plan type",
		})
	}

	// 确定支付方式
	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "stripe" // 默认
	}

	// 根据支付方式创建订阅
	if paymentMethod == "paypal" {
		// 创建PayPal订阅
		subscriptionID, approveURL, err := payment.CreatePayPalSubscription(userID.String(), planType)
		if err != nil {
			log.Printf("[Subscription] Failed to create PayPal subscription: %v", err)
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to create PayPal subscription",
			})
		}

		return c.Status(201).JSON(fiber.Map{
			"subscription_id": subscriptionID,
			"url":             approveURL,
			"provider":        "paypal",
		})
	}

	// Stripe订阅（默认）
	sessionID, err := payment.CreateSubscriptionCheckout(userID.String(), planType)
	if err != nil {
		log.Printf("[Subscription] Failed to create Stripe subscription: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create subscription",
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"session_id": sessionID,
		"url":        "https://checkout.stripe.com/pay/" + sessionID,
		"provider":   "stripe",
	})
}

// CancelSubscriptionHandler 取消订阅
func CancelSubscriptionHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	if err := services.CancelSubscription(userID.String()); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to cancel subscription",
		})
	}

	return c.JSON(fiber.Map{
		"status": "canceled",
	})
}
