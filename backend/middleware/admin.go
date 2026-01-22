package middleware

import (
	"web-checkly/database"
	"web-checkly/models"

	"github.com/gofiber/fiber/v2"
)

// RequireAdmin 要求用户为管理员的中间件
// 必须在 RequireAuth() 之后使用
func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// 从数据库获取用户角色（确保实时性）
		user, err := database.GetUserByID(*userID)
		if err != nil || user == nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "User not found",
			})
		}

		// 检查是否为管理员
		if user.Role != models.UserRoleAdmin {
			return c.Status(403).JSON(fiber.Map{
				"error": "Forbidden: Admin access required",
			})
		}

		// 将用户角色存储到locals中，供后续使用
		c.Locals("userRole", user.Role)

		return c.Next()
	}
}

// GetUserRole 从context获取用户角色
func GetUserRole(c *fiber.Ctx) string {
	role, ok := c.Locals("userRole").(string)
	if !ok {
		return ""
	}
	return role
}
