package routes

import (
	"log"
	"time"
	"web-checkly/middleware"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// GetCreditsBalanceHandler 获取积分余额
func GetCreditsBalanceHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	credits, err := services.GetUserCredits(userID.String())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get credits",
		})
	}

	return c.JSON(credits)
}

// PurchaseCreditsHandler 购买积分
func PurchaseCreditsHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req struct {
		Amount float64 `json:"amount"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Amount <= 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Amount must be greater than 0",
		})
	}

	// 创建订单
	order, err := services.CreateOrder(userID.String(), "credits_purchase", nil, req.Amount)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create order",
		})
	}

	return c.Status(201).JSON(order)
}

// GetUsageRecordsHandler 获取使用记录
func GetUsageRecordsHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// 获取分页参数
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	records, err := services.GetUsageRecords(userID.String(), limit, offset)
	if err != nil {
		log.Printf("[Credits] Failed to get usage records: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get usage records",
		})
	}

	return c.JSON(records)
}

// GetUsageStatsHandler 获取使用统计
func GetUsageStatsHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid start_date format",
			})
		}
	} else {
		startDate = time.Now().AddDate(0, -1, 0) // 默认1个月前
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid end_date format",
			})
		}
	} else {
		endDate = time.Now() // 默认今天
	}

	stats, err := services.GetUsageStats(userID.String(), startDate, endDate)
	if err != nil {
		log.Printf("[Credits] Failed to get usage stats: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get usage stats",
		})
	}

	return c.JSON(stats)
}
