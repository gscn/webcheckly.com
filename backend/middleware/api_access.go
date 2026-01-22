package middleware

import (
	"fmt"
	"log"
	"time"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// RequireAPIAccess 要求API访问权限的中间件
// 只有专业版和高级版用户可以访问API
func RequireAPIAccess() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == nil {
			return c.Status(401).JSON(fiber.Map{
				"error":   "Unauthorized",
				"details": "API access requires authentication.",
			})
		}

		// 检查API访问权限
		hasAccess, limit, used, err := services.CheckAPIAccess(userID.String())
		if err != nil {
			log.Printf("[RequireAPIAccess] Error checking API access: %v", err)
			return c.Status(500).JSON(fiber.Map{
				"error": "Internal server error",
			})
		}

		if !hasAccess {
			message := "API access limit exceeded"
			if limit != nil {
				message = fmt.Sprintf("API access limit exceeded. Monthly limit: %d, used: %d", *limit, used)
			} else {
				message = "API access is not available for your subscription plan. Please upgrade to Pro or Enterprise plan."
			}
			return c.Status(403).JSON(fiber.Map{
				"error":   "API access denied",
				"details": message,
				"limit":   limit,
				"used":    used,
			})
		}

		// 记录API访问（异步，不阻塞请求）
		go func() {
			endpoint := c.Path()
			method := c.Method()
			ipAddress := c.IP()
			if forwarded := c.Get("X-Forwarded-For"); forwarded != "" {
				ipAddress = forwarded
			}
			userAgent := c.Get("User-Agent")
			var ipPtr *string
			var userAgentPtr *string
			if ipAddress != "" {
				ipPtr = &ipAddress
			}
			if userAgent != "" {
				userAgentPtr = &userAgent
			}

			// 记录访问（不包含响应时间和状态码，因为此时响应还未发送）
			if err := services.RecordAPIAccess(userID.String(), endpoint, method, ipPtr, userAgentPtr, nil, nil); err != nil {
				log.Printf("[RequireAPIAccess] Failed to record API access: %v", err)
			}
		}()

		return c.Next()
	}
}

// RecordAPIAccessResponse 记录API访问响应（在响应发送后调用）
func RecordAPIAccessResponse(c *fiber.Ctx, statusCode int, responseTime time.Duration) {
	userID := GetUserID(c)
	if userID == nil {
		return
	}

	// 异步更新访问记录（添加状态码和响应时间）
	go func() {
		// 这里可以更新最后一条记录，但由于是异步的，我们可以在中间件中记录完整信息
		// 为了简化，我们在RequireAPIAccess中已经记录了基本信息
		// 如果需要更详细的响应信息，可以在这里更新
	}()
}
