package models

import (
	"time"

	"github.com/google/uuid"
)

// 用户角色常量
const (
	UserRoleUser  = "user"
	UserRoleAdmin = "admin"
)

// User 用户模型
type User struct {
	ID                         uuid.UUID  `json:"id" db:"id"`
	Email                      string     `json:"email" db:"email"`
	PasswordHash               string     `json:"-" db:"password_hash"`
	Role                       string     `json:"role" db:"role"`
	EmailVerified              bool       `json:"email_verified" db:"email_verified"`
	EmailVerificationToken     *string    `json:"-" db:"email_verification_token"`
	EmailVerificationExpiresAt *time.Time `json:"-" db:"email_verification_expires_at"`
	PasswordResetToken         *string    `json:"-" db:"password_reset_token"`
	PasswordResetExpiresAt     *time.Time `json:"-" db:"password_reset_expires_at"`
	CreatedAt                  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt                  time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt                *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	InviteCode                 *string    `json:"invite_code,omitempty" db:"invite_code"` // 用户的邀请码
	InvitedBy                  *uuid.UUID `json:"invited_by,omitempty" db:"invited_by"`   // 邀请人ID
}

// OAuthProvider OAuth提供商模型
type OAuthProvider struct {
	ID             uuid.UUID `json:"id" db:"id"`
	UserID         uuid.UUID `json:"user_id" db:"user_id"`
	Provider       string    `json:"provider" db:"provider"` // "google", "github"
	ProviderUserID string    `json:"provider_user_id" db:"provider_user_id"`
	Email          *string   `json:"email,omitempty" db:"email"`
	AccessToken    *string   `json:"-" db:"access_token"`  // 加密存储
	RefreshToken   *string   `json:"-" db:"refresh_token"` // 加密存储
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// UserResponse 用户响应模型（不包含敏感信息）
type UserResponse struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Role          string    `json:"role"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
}

// ToResponse 转换为响应模型
func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:            u.ID,
		Email:         u.Email,
		Role:          u.Role,
		EmailVerified: u.EmailVerified,
		CreatedAt:     u.CreatedAt,
	}
}
