package routes

import (
	"log"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var oauthService = services.NewOAuthService()

// InitiateOAuthHandler 发起OAuth登录
// @Summary 发起OAuth登录
// @Description 生成OAuth授权URL并重定向用户到第三方登录页面
// @Tags 认证
// @Accept json
// @Produce json
// @Param provider path string true "OAuth提供商" example:"google"
// @Success 302 "重定向到OAuth授权页面"
// @Failure 400 {object} map[string]string "不支持的提供商或配置错误"
// @Router /api/auth/oauth/{provider} [get]
func InitiateOAuthHandler(c *fiber.Ctx) error {
	provider := c.Params("provider")
	if provider == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Provider is required",
		})
	}

	// 生成state（用于防止CSRF攻击）
	state := uuid.New().String()
	// 可以将state存储到session或cookie中，这里简化处理

	authURL, err := oauthService.InitiateOAuth(provider, state)
	if err != nil {
		log.Printf("[OAuth] Failed to initiate OAuth for %s: %v", provider, err)
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 重定向到OAuth授权页面
	return c.Redirect(authURL, 302)
}

// OAuthCallbackHandler 处理OAuth回调
// @Summary OAuth回调处理
// @Description 处理第三方OAuth登录回调，创建或登录用户
// @Tags 认证
// @Accept json
// @Produce json
// @Param provider path string true "OAuth提供商" example:"google"
// @Param code query string true "授权码"
// @Param state query string false "状态参数"
// @Success 200 {object} services.LoginResponse "登录成功"
// @Failure 400 {object} map[string]string "回调处理失败"
// @Router /api/auth/oauth/{provider}/callback [get]
func OAuthCallbackHandler(c *fiber.Ctx) error {
	provider := c.Params("provider")
	code := c.Query("code")
	state := c.Query("state")

	if code == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Authorization code is required",
		})
	}

	// 验证state（防止CSRF攻击）
	// 这里应该从session或cookie中获取并验证state
	// 简化处理，实际应该验证state

	_, err := oauthService.HandleOAuthCallback(provider, code, state)
	if err != nil {
		log.Printf("[OAuth] Failed to handle OAuth callback for %s: %v", provider, err)
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 生成JWT token
	// 注意：OAuth用户没有密码，需要特殊处理
	// 这里需要修改Login方法或创建新的OAuth登录方法
	// 暂时返回错误，提示需要实现
	return c.Status(501).JSON(fiber.Map{
		"error":   "OAuth login not yet fully implemented",
		"message": "User authenticated via OAuth, but token generation needs to be implemented",
	})
}
