package routes

import (
	"log"
	"web-checkly/database"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var authService = services.NewAuthService()

// RegisterHandler 用户注册
// @Summary 用户注册
// @Description 创建新用户账户，注册成功后发送验证邮件
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body services.RegisterRequest true "注册请求"
// @Success 201 {object} models.UserResponse "注册成功"
// @Failure 400 {object} map[string]string "请求参数错误"
// @Failure 409 {object} map[string]string "邮箱已注册"
// @Router /api/auth/register [post]
func RegisterHandler(c *fiber.Ctx) error {
	var req services.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := authService.Register(req)
	if err != nil {
		if err.Error() == "email already registered" {
			return c.Status(409).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(201).JSON(user.ToResponse())
}

// LoginHandler 用户登录
// @Summary 用户登录
// @Description 用户登录，返回JWT token
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body services.LoginRequest true "登录请求"
// @Success 200 {object} services.LoginResponse "登录成功"
// @Failure 401 {object} map[string]string "邮箱或密码错误"
// @Router /api/auth/login [post]
func LoginHandler(c *fiber.Ctx) error {
	var req services.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := authService.Login(req)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// VerifyEmailHandler 验证邮箱
// @Summary 验证邮箱
// @Description 使用验证token验证用户邮箱
// @Tags 认证
// @Accept json
// @Produce json
// @Param token query string true "验证token"
// @Success 200 {object} map[string]string "验证成功"
// @Failure 400 {object} map[string]string "验证失败"
// @Router /api/auth/verify-email [post]
func VerifyEmailHandler(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		// 也支持从body中获取
		var body struct {
			Token string `json:"token"`
		}
		if err := c.BodyParser(&body); err == nil && body.Token != "" {
			token = body.Token
		}
	}

	if token == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Token is required",
		})
	}

	if err := authService.VerifyEmail(token); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Email verified successfully",
	})
}

// ResendVerificationHandler 重新发送验证邮件
// @Summary 重新发送验证邮件
// @Description 为已注册但未验证的用户重新发送验证邮件
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body map[string]string true "邮箱地址"
// @Success 200 {object} map[string]string "邮件已发送"
// @Failure 400 {object} map[string]string "请求错误"
// @Router /api/auth/resend-verification [post]
func ResendVerificationHandler(c *fiber.Ctx) error {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := authService.ResendVerificationEmail(body.Email); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Verification email sent",
	})
}

// ForgotPasswordHandler 请求密码重置
// @Summary 请求密码重置
// @Description 发送密码重置邮件
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body map[string]string true "邮箱地址"
// @Success 200 {object} map[string]string "重置邮件已发送"
// @Router /api/auth/forgot-password [post]
func ForgotPasswordHandler(c *fiber.Ctx) error {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 不返回错误，防止邮箱枚举攻击
	_ = authService.RequestPasswordReset(body.Email)

	return c.JSON(fiber.Map{
		"message": "If the email exists, a password reset link has been sent",
	})
}

// ResetPasswordHandler 重置密码
// @Summary 重置密码
// @Description 使用重置token重置用户密码
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body map[string]string true "重置请求（token和new_password）"
// @Success 200 {object} map[string]string "密码重置成功"
// @Failure 400 {object} map[string]string "重置失败"
// @Router /api/auth/reset-password [post]
func ResetPasswordHandler(c *fiber.Ctx) error {
	var body struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := authService.ResetPassword(body.Token, body.NewPassword); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Password reset successfully",
	})
}

// RefreshTokenHandler 刷新token
// @Summary 刷新token
// @Description 使用refresh token获取新的access token
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body map[string]string true "刷新请求（refresh_token）"
// @Success 200 {object} services.LoginResponse "刷新成功"
// @Failure 401 {object} map[string]string "token无效"
// @Router /api/auth/refresh [post]
func RefreshTokenHandler(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := authService.RefreshToken(body.RefreshToken)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// GetMeHandler 获取当前用户信息
// @Summary 获取当前用户信息
// @Description 获取当前登录用户的信息
// @Tags 认证
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} models.UserResponse "用户信息"
// @Failure 401 {object} map[string]string "未授权"
// @Router /api/auth/me [get]
func GetMeHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// 类型断言为uuid.UUID
	uid, ok := userID.(uuid.UUID)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	user, err := database.GetUserByID(uid)
	if err != nil {
		log.Printf("[GetMeHandler] Error getting user: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Internal server error",
		})
	}

	if user == nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(user.ToResponse())
}

// LogoutHandler 登出
// @Summary 用户登出
// @Description 登出（客户端应删除token）
// @Tags 认证
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string "登出成功"
// @Router /api/auth/logout [post]
func LogoutHandler(c *fiber.Ctx) error {
	// JWT是无状态的，服务端不需要做任何操作
	// 客户端删除token即可
	return c.JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}
