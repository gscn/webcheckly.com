package routes

import (
	"strconv"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// GetCreditsRecordsHandler 获取积分记录列表
func GetCreditsRecordsHandler(c *fiber.Ctx) error {
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
	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}
	if featureType := c.Query("feature_type"); featureType != "" {
		filters["feature_type"] = featureType
	}
	if isFree := c.Query("is_free"); isFree != "" {
		filters["is_free"] = isFree
	}
	if isRefunded := c.Query("is_refunded"); isRefunded != "" {
		filters["is_refunded"] = isRefunded
	}

	result, err := services.GetCreditsRecords(page, pageSize, filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetCreditsStatisticsHandler 获取积分统计信息
func GetCreditsStatisticsHandler(c *fiber.Ctx) error {
	// 构建筛选条件
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}
	if featureType := c.Query("feature_type"); featureType != "" {
		filters["feature_type"] = featureType
	}

	stats, err := services.GetCreditsStatistics(filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}
