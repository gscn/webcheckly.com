package middleware

import (
	"strings"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RequireAuth 要求用户登录的中间件
func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		token, err := extractToken(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		authService := services.NewAuthService()
		claims, err := authService.ValidateToken(token)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// 将用户信息存储到locals中
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)

		return c.Next()
	}
}

// OptionalAuth 可选认证中间件（支持匿名和已登录用户）
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		token, err := extractToken(c)
		if err != nil {
			// 没有token，继续执行（匿名用户）
			return c.Next()
		}

		authService := services.NewAuthService()
		claims, err := authService.ValidateToken(token)
		if err != nil {
			// token无效，继续执行（匿名用户）
			return c.Next()
		}

		// 将用户信息存储到locals中
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)

		return c.Next()
	}
}

// GetUserID 从context获取用户ID
func GetUserID(c *fiber.Ctx) *uuid.UUID {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return nil
	}
	return &userID
}

// GetUserEmail 从context获取用户邮箱
func GetUserEmail(c *fiber.Ctx) string {
	email, ok := c.Locals("userEmail").(string)
	if !ok {
		return ""
	}
	return email
}

// extractToken 从请求头或query参数提取token
// 支持两种方式：
// 1. Authorization: Bearer <token> (标准方式)
// 2. ?token=<token> (用于SSE等不支持自定义headers的场景)
func extractToken(c *fiber.Ctx) (string, error) {
	// 优先从Authorization header获取
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		// 支持 "Bearer <token>" 格式
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1], nil
		}
	}

	// 如果没有Authorization header，尝试从query参数获取（用于SSE）
	token := c.Query("token")
	if token != "" {
		return token, nil
	}

	return "", fiber.NewError(401, "Missing Authorization header or token parameter")
}
