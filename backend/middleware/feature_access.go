package middleware

import (
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// RequireFeatureAccess 要求功能访问权限
func RequireFeatureAccess(feature string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		var userIDStr string
		if userID != nil {
			userIDStr = userID.String()
		}

		canAccess, accessType, err := services.CheckFeatureAccess(userIDStr, feature)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to check feature access",
			})
		}

		if !canAccess {
			return c.Status(403).JSON(fiber.Map{
				"error":       "Feature access denied",
				"access_type": accessType,
			})
		}

		// 将访问类型存储到上下文，供后续使用
		c.Locals("feature_access_type", accessType)
		return c.Next()
	}
}

// PreDeductFeatureCost 预扣费用（在任务创建时，返回usageRecordID）
func PreDeductFeatureCost(feature string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		var userIDStr string
		if userID != nil {
			userIDStr = userID.String()
		}

		// 从请求中获取taskID（如果存在）
		taskID := c.Locals("task_id")
		var taskIDStr string
		if taskID != nil {
			taskIDStr = taskID.(string)
		}

		usageRecordID, err := services.PreDeductFeatureCost(userIDStr, feature, taskIDStr)
		if err != nil {
			return c.Status(402).JSON(fiber.Map{
				"error":   "Failed to deduct feature cost",
				"message": err.Error(),
			})
		}

		// 将usageRecordID存储到上下文
		c.Locals("usage_record_id", usageRecordID)
		return c.Next()
	}
}
