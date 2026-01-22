package routes

import (
	"log"
	"strconv"
	"web-checkly/middleware"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// GetAPIAccessStatsHandler 获取API访问统计
// @Summary 获取API访问统计
// @Description 获取当前用户的API访问统计信息，包括总访问次数、月度访问次数、限制和剩余次数
// @Tags API访问
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} models.APIAccessStats "API访问统计"
// @Failure 401 {object} map[string]string "未授权"
// @Failure 500 {object} map[string]string "服务器内部错误"
// @Router /api/api-access/stats [get]
func GetAPIAccessStatsHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	stats, err := services.GetAPIAccessStats(userID.String())
	if err != nil {
		log.Printf("[GetAPIAccessStatsHandler] Error: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to get API access stats",
			"message": err.Error(),
		})
	}

	return c.JSON(stats)
}

// GetAPIAccessRecordsHandler 获取API访问记录列表
// @Summary 获取API访问记录列表
// @Description 获取当前用户的API访问记录列表，支持分页
// @Tags API访问
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param limit query int false "每页记录数" default(20)
// @Param offset query int false "偏移量" default(0)
// @Success 200 {array} models.APIAccessRecord "API访问记录列表"
// @Failure 401 {object} map[string]string "未授权"
// @Failure 500 {object} map[string]string "服务器内部错误"
// @Router /api/api-access/records [get]
func GetAPIAccessRecordsHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	records, err := services.GetAPIAccessRecords(userID.String(), limit, offset)
	if err != nil {
		log.Printf("[GetAPIAccessRecordsHandler] Error: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to get API access records",
			"message": err.Error(),
		})
	}

	// 获取总记录数（用于分页）
	total, err := services.GetAPIAccessRecordCount(userID.String())
	if err != nil {
		log.Printf("[GetAPIAccessRecordsHandler] Error getting total count: %v", err)
		// 如果获取总数失败，使用记录列表的长度作为总数（不准确，但不会导致请求失败）
		total = len(records)
	}

	return c.JSON(fiber.Map{
		"records": records,
		"limit":   limit,
		"offset":  offset,
		"total":   total,
	})
}
