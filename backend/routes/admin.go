package routes

import (
	"strconv"
	"web-checkly/database"
	"web-checkly/middleware"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetUsersListHandler 获取用户列表
func GetUsersListHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	search := c.Query("search", "")

	result, err := services.GetUsersList(page, pageSize, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetUserDetailsHandler 获取用户详情
func GetUserDetailsHandler(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	result, err := services.GetUserDetails(userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// UpdateUserRoleHandler 更新用户角色
func UpdateUserRoleHandler(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := services.UpdateUserRole(userID, req.Role); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "User role updated successfully",
	})
}

// UpdateUserStatusHandler 更新用户状态
func UpdateUserStatusHandler(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	var req struct {
		EmailVerified bool `json:"email_verified"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := services.UpdateUserStatus(userID, req.EmailVerified); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "User status updated successfully",
	})
}

// UpdateUserInfoHandler 更新用户信息（邮箱等）
func UpdateUserInfoHandler(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Email == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Email is required",
		})
	}

	if err := services.UpdateUserInfo(userID, req.Email); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "User info updated successfully",
	})
}

// DeleteUserHandler 删除用户
func DeleteUserHandler(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	// 防止管理员删除自己
	currentUserID := middleware.GetUserID(c)
	if currentUserID != nil && currentUserID.String() == userID {
		return c.Status(400).JSON(fiber.Map{
			"error": "Cannot delete your own account",
		})
	}

	// 验证用户是否存在
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	user, err := database.GetUserByID(userUUID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to check user existence",
		})
	}
	if user == nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	if err := services.DeleteUser(userID); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "User deleted successfully",
	})
}

// GetAllTasksHandler 获取所有任务
func GetAllTasksHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	filters := make(map[string]string)
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if userID := c.Query("user_id"); userID != "" {
		filters["user_id"] = userID
	}

	result, err := services.GetAllTasks(page, pageSize, filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetTaskDetailsHandler 获取任务详情
func GetTaskDetailsHandler(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Task ID is required",
		})
	}

	// 使用TaskManager获取任务
	taskManager := services.NewTaskManager()
	task, err := taskManager.GetTask(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(task)
}

// DeleteTaskHandler 删除任务
func DeleteTaskHandler(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Task ID is required",
		})
	}

	// 验证任务是否存在
	taskManager := services.NewTaskManager()
	task, err := taskManager.GetTask(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}
	if task == nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	if err := services.DeleteTask(taskID); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Task deleted successfully",
	})
}

// GetTaskStatisticsHandler 获取任务统计
func GetTaskStatisticsHandler(c *fiber.Ctx) error {
	stats, err := services.GetTaskStatistics()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}

// GetAllSubscriptionsHandler 获取所有订阅
func GetAllSubscriptionsHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	filters := make(map[string]string)
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if planType := c.Query("plan_type"); planType != "" {
		filters["plan_type"] = planType
	}

	result, err := services.GetAllSubscriptions(page, pageSize, filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// UpdateSubscriptionHandler 更新订阅
func UpdateSubscriptionHandler(c *fiber.Ctx) error {
	subscriptionID := c.Params("id")
	if subscriptionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Subscription ID is required",
		})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(updates) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "No updates provided",
		})
	}

	if err := services.UpdateSubscription(subscriptionID, updates); err != nil {
		// 检查是否是404错误（订阅不存在）
		if err.Error() == "subscription not found" {
			return c.Status(404).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Subscription updated successfully",
	})
}

// GetSubscriptionStatisticsHandler 获取订阅统计
func GetSubscriptionStatisticsHandler(c *fiber.Ctx) error {
	stats, err := services.GetSubscriptionStatistics()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}

// AdjustUserCreditsHandler 调整用户积分
func AdjustUserCreditsHandler(c *fiber.Ctx) error {
	var req struct {
		UserID string `json:"user_id"`
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.UserID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	if req.Amount == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Amount cannot be zero",
		})
	}

	if err := services.AdjustUserCredits(req.UserID, req.Amount, req.Reason); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Credits adjusted successfully",
	})
}

// GetSystemStatisticsHandler 获取系统统计
func GetSystemStatisticsHandler(c *fiber.Ctx) error {
	stats, err := services.GetSystemStatistics()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}
