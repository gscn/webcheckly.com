package routes

import (
	"log"
	"strconv"
	"web-checkly/middleware"
	"web-checkly/models"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// CreateOrderHandler 创建订单
func CreateOrderHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req struct {
		OrderType     string   `json:"order_type"`
		Feature       *string  `json:"feature,omitempty"`
		Features      []string `json:"features,omitempty"`
		Amount        float64  `json:"amount,omitempty"`
		PaymentMethod string   `json:"payment_method,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var order *models.Order
	var err error

	switch req.OrderType {
	case "single_scan":
		if req.Feature == nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Feature is required for single_scan order",
			})
		}
		// 获取功能定价（1美元=100积分）
		pricing, err := services.GetFeaturePricing(*req.Feature)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid feature",
			})
		}
		// 将积分成本转换为美元金额（1美元=100积分）
		orderAmountUSD := float64(pricing.CreditsCost) / 100.0
		order, err = services.CreateOrder(userID.String(), models.OrderTypeSingleScan, req.Feature, orderAmountUSD, req.PaymentMethod)

	case string(models.OrderTypeCreditsPurchase):
		if req.Amount <= 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "Amount must be greater than 0",
			})
		}
		// req.Amount 现在是美元金额，直接传递
		order, err = services.CreateOrder(userID.String(), models.OrderTypeCreditsPurchase, nil, req.Amount, req.PaymentMethod)

	default:
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid order type",
		})
	}

	if err != nil {
		log.Printf("[Order] Failed to create order: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create order",
		})
	}

	return c.Status(201).JSON(order)
}

// GetOrderHandler 获取订单详情
func GetOrderHandler(c *fiber.Ctx) error {
	orderID := c.Params("id")

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

	return c.JSON(order)
}

// GetOrdersHandler 获取订单列表
func GetOrdersHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	orders, err := services.GetUserOrders(userID.String(), limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get orders",
		})
	}

	return c.JSON(orders)
}

// CancelOrderHandler 取消订单
func CancelOrderHandler(c *fiber.Ctx) error {
	orderID := c.Params("id")

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

	if order.Status != models.OrderStatusPending {
		return c.Status(400).JSON(fiber.Map{
			"error": "Only pending orders can be canceled",
		})
	}

	if err := services.UpdateOrderStatus(orderID, models.OrderStatusCanceled); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to cancel order",
		})
	}

	return c.JSON(fiber.Map{
		"status": "canceled",
	})
}
