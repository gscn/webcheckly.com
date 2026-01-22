package routes

import (
	"log"
	"strconv"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// GetRevenueOrdersHandler 获取收入订单列表
func GetRevenueOrdersHandler(c *fiber.Ctx) error {
	log.Printf("[GetRevenueOrdersHandler] Request received: page=%s, page_size=%s", c.Query("page"), c.Query("page_size"))
	
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	// 构建筛选条件
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if paymentMethod := c.Query("payment_method"); paymentMethod != "" {
		filters["payment_method"] = paymentMethod
	}
	if orderType := c.Query("order_type"); orderType != "" {
		filters["order_type"] = orderType
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}

	result, err := services.GetRevenueOrders(page, pageSize, filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetRevenueStatisticsHandler 获取收入统计信息
func GetRevenueStatisticsHandler(c *fiber.Ctx) error {
	log.Printf("[GetRevenueStatisticsHandler] Request received")
	
	// 构建筛选条件
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if paymentMethod := c.Query("payment_method"); paymentMethod != "" {
		filters["payment_method"] = paymentMethod
	}
	if orderType := c.Query("order_type"); orderType != "" {
		filters["order_type"] = orderType
	}
	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}

	stats, err := services.GetRevenueStatistics(filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}

// ExportRevenueOrdersHandler 导出订单数据
func ExportRevenueOrdersHandler(c *fiber.Ctx) error {
	// 构建筛选条件
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if paymentMethod := c.Query("payment_method"); paymentMethod != "" {
		filters["payment_method"] = paymentMethod
	}
	if orderType := c.Query("order_type"); orderType != "" {
		filters["order_type"] = orderType
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}

	csv, err := services.ExportRevenueOrders(filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 设置响应头
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=revenue_orders.csv")

	return c.SendString(csv)
}
