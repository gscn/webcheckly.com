package routes

import (
	"strconv"
	"web-checkly/middleware"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CreateWebsiteBlacklistHandler 添加网站到黑名单
func CreateWebsiteBlacklistHandler(c *fiber.Ctx) error {
	type Request struct {
		Target    string `json:"target"`
		MatchType string `json:"match_type"`
		Reason    string `json:"reason"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 验证必填字段
	if req.Target == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Target is required",
		})
	}

	if req.MatchType == "" {
		req.MatchType = "exact" // 默认为精确匹配
	}

	// 获取当前管理员ID
	adminID := middleware.GetUserID(c)
	if adminID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	blacklist, err := services.CreateWebsiteBlacklist(req.Target, req.MatchType, req.Reason, *adminID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(201).JSON(blacklist)
}

// GetWebsiteBlacklistListHandler 获取网站黑名单列表
func GetWebsiteBlacklistListHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	search := c.Query("search", "")

	result, err := services.GetWebsiteBlacklistList(page, pageSize, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// ToggleWebsiteBlacklistStatusHandler 切换网站黑名单状态（拉黑/解禁）
func ToggleWebsiteBlacklistStatusHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "ID is required",
		})
	}

	blacklistID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}

	type Request struct {
		IsActive bool `json:"is_active"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	err = services.ToggleWebsiteBlacklistStatus(blacklistID, req.IsActive)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Status updated successfully",
	})
}

// DeleteWebsiteBlacklistHandler 删除网站黑名单记录
func DeleteWebsiteBlacklistHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "ID is required",
		})
	}

	blacklistID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}

	err = services.DeleteWebsiteBlacklist(blacklistID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Deleted successfully",
	})
}

// CreateUserBlacklistHandler 添加用户到黑名单
func CreateUserBlacklistHandler(c *fiber.Ctx) error {
	type Request struct {
		UserID string `json:"user_id"`
		Reason string `json:"reason"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 验证必填字段
	if req.UserID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	// 获取当前管理员ID
	adminID := middleware.GetUserID(c)
	if adminID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	blacklist, err := services.CreateUserBlacklist(userID, *adminID, req.Reason)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(201).JSON(blacklist)
}

// GetUserBlacklistListHandler 获取用户黑名单列表
func GetUserBlacklistListHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	search := c.Query("search", "")

	result, err := services.GetUserBlacklistList(page, pageSize, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// ToggleUserBlacklistStatusHandler 切换用户黑名单状态（拉黑/解禁）
func ToggleUserBlacklistStatusHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "ID is required",
		})
	}

	blacklistID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}

	type Request struct {
		IsActive bool `json:"is_active"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	err = services.ToggleUserBlacklistStatus(blacklistID, req.IsActive)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Status updated successfully",
	})
}

// DeleteUserBlacklistHandler 删除用户黑名单记录
func DeleteUserBlacklistHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "ID is required",
		})
	}

	blacklistID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}

	err = services.DeleteUserBlacklist(blacklistID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Deleted successfully",
	})
}
