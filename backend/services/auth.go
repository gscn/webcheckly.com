package services

import (
	"errors"
	"log"
	"strings"
	"time"
	"web-checkly/database"
	"web-checkly/models"
	"web-checkly/utils"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// AuthService 认证服务
type AuthService struct{}

// NewAuthService 创建认证服务实例
func NewAuthService() *AuthService {
	return &AuthService{}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	InviteCode *string `json:"invite_code,omitempty"` // 可选：邀请码
}

// LoginRequest 登录请求
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	AccessToken  string               `json:"access_token"`
	RefreshToken string               `json:"refresh_token"`
	User         *models.UserResponse `json:"user"`
}

// Register 用户注册
func (s *AuthService) Register(req RegisterRequest) (*models.User, error) {
	// 验证邮箱格式
	if !isValidEmail(req.Email) {
		return nil, errors.New("invalid email format")
	}

	// 验证密码
	if err := validatePassword(req.Password); err != nil {
		return nil, err
	}

	// 检查邮箱是否已存在
	existingUser, err := database.GetUserByEmail(strings.ToLower(req.Email))
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	// 哈希密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// 处理邀请码（如果提供）
	var invitedByID *uuid.UUID
	if req.InviteCode != nil && *req.InviteCode != "" {
		inviter, err := database.GetUserByInviteCode(*req.InviteCode)
		if err != nil {
			log.Printf("[AuthService] Failed to get inviter by invite code: %v", err)
			// 邀请码无效，但不阻止注册
		} else if inviter != nil {
			invitedByID = &inviter.ID
		}
	}

	// 创建用户（带邀请信息）
	user, err := database.CreateUser(strings.ToLower(req.Email), string(passwordHash), invitedByID)
	if err != nil {
		return nil, err
	}

	// 初始化用户积分（新用户获得50积分）
	if err := InitializeUserCredits(user.ID.String()); err != nil {
		log.Printf("[AuthService] Failed to initialize user credits: %v", err)
		// 不返回错误，用户仍然可以注册成功
	}

	// 如果使用了邀请码，给邀请人10积分
	if invitedByID != nil {
		if err := AddCredits(invitedByID.String(), 10); err != nil {
			log.Printf("[AuthService] Failed to add credits to inviter: %v", err)
			// 不返回错误，用户仍然可以注册成功
		}
	}

	// 生成邮箱验证token
	verificationToken := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour) // 24小时过期
	if err := database.SetEmailVerificationToken(user.ID, verificationToken, expiresAt); err != nil {
		log.Printf("[AuthService] Failed to set verification token: %v", err)
		// 不返回错误，用户仍然可以注册成功，稍后可以重新发送验证邮件
	} else {
		// 发送验证邮件
		emailService := NewEmailService()
		if err := emailService.SendVerificationEmail(user.Email, verificationToken); err != nil {
			log.Printf("[AuthService] Failed to send verification email: %v", err)
			// 不返回错误，用户仍然可以注册成功
		}
	}

	return user, nil
}

// Login 用户登录
func (s *AuthService) Login(req LoginRequest) (*LoginResponse, error) {
	// 获取用户
	user, err := database.GetUserByEmail(strings.ToLower(req.Email))
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// 更新最后登录时间
	if err := database.UpdateLastLogin(user.ID); err != nil {
		log.Printf("[AuthService] Failed to update last login: %v", err)
	}

	// 检查并发放每日登录奖励（每日1积分）
	if _, err := CheckAndGrantDailyLoginReward(user.ID.String()); err != nil {
		log.Printf("[AuthService] Failed to grant daily login reward: %v", err)
		// 不返回错误，登录仍然成功
	}

	// 生成token
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user.ToResponse(),
	}, nil
}

// VerifyEmail 验证邮箱
func (s *AuthService) VerifyEmail(token string) error {
	user, err := database.GetUserByVerificationToken(token)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("invalid verification token")
	}

	// 检查token是否过期
	if user.EmailVerificationExpiresAt != nil && time.Now().After(*user.EmailVerificationExpiresAt) {
		return errors.New("verification token expired")
	}

	// 更新验证状态
	if err := database.UpdateUserEmailVerification(user.ID, true); err != nil {
		return err
	}

	return nil
}

// ResendVerificationEmail 重新发送验证邮件
func (s *AuthService) ResendVerificationEmail(email string) error {
	user, err := database.GetUserByEmail(strings.ToLower(email))
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	if user.EmailVerified {
		return errors.New("email already verified")
	}

	// 生成新的验证token
	verificationToken := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)
	if err := database.SetEmailVerificationToken(user.ID, verificationToken, expiresAt); err != nil {
		return err
	}

	// 发送验证邮件
	emailService := NewEmailService()
	return emailService.SendVerificationEmail(user.Email, verificationToken)
}

// RequestPasswordReset 请求密码重置
func (s *AuthService) RequestPasswordReset(email string) error {
	user, err := database.GetUserByEmail(strings.ToLower(email))
	if err != nil {
		return err
	}
	if user == nil {
		// 不返回错误，防止邮箱枚举攻击
		return nil
	}

	// 生成重置token
	resetToken := uuid.New().String()
	expiresAt := time.Now().Add(1 * time.Hour) // 1小时过期
	if err := database.SetPasswordResetToken(user.ID, resetToken, expiresAt); err != nil {
		return err
	}

	// 发送重置邮件
	emailService := NewEmailService()
	return emailService.SendPasswordResetEmail(user.Email, resetToken)
}

// ResetPassword 重置密码
func (s *AuthService) ResetPassword(token, newPassword string) error {
	// 验证密码
	if err := validatePassword(newPassword); err != nil {
		return err
	}

	user, err := database.GetUserByPasswordResetToken(token)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("invalid reset token")
	}

	// 检查token是否过期
	if user.PasswordResetExpiresAt != nil && time.Now().After(*user.PasswordResetExpiresAt) {
		return errors.New("reset token expired")
	}

	// 哈希新密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// 更新密码
	return database.UpdatePassword(user.ID, string(passwordHash))
}

// RefreshToken 刷新token
func (s *AuthService) RefreshToken(refreshTokenString string) (*LoginResponse, error) {
	claims, err := utils.ValidateToken(refreshTokenString)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// 获取用户
	user, err := database.GetUserByID(claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// 生成新token
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		User:         user.ToResponse(),
	}, nil
}

// ValidateToken 验证token
func (s *AuthService) ValidateToken(tokenString string) (*utils.TokenClaims, error) {
	return utils.ValidateToken(tokenString)
}

// 辅助函数

// isValidEmail 邮箱验证（使用简单规则）
func isValidEmail(email string) bool {
	email = strings.TrimSpace(email)
	if len(email) < 5 || len(email) > 255 {
		return false
	}

	// 必须包含@符号
	atIndex := strings.Index(email, "@")
	if atIndex <= 0 || atIndex >= len(email)-1 {
		return false
	}

	// @符号后必须包含点号
	localPart := email[:atIndex]
	domainPart := email[atIndex+1:]

	if len(localPart) == 0 || len(domainPart) == 0 {
		return false
	}

	// 域名部分必须包含点号
	if !strings.Contains(domainPart, ".") {
		return false
	}

	// 基本字符检查（不允许空格和特殊字符在关键位置）
	if strings.Contains(email, " ") {
		return false
	}

	return true
}

// validatePassword 验证密码
func validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}
	if len(password) > 128 {
		return errors.New("password must be at most 128 characters long")
	}

	// 密码验证通过
	// 注意：可以在这里添加更多验证规则，如要求包含字母、数字、特殊字符等
	// 当前实现只要求长度在8-128字符之间

	return nil
}
