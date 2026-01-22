package models

import (
	"time"

	"github.com/google/uuid"
)

// WebsiteBlacklist 网站黑名单模型
type WebsiteBlacklist struct {
	ID           uuid.UUID     `json:"id" db:"id"`
	Target       string        `json:"target" db:"target"`
	MatchType    string        `json:"match_type" db:"match_type"` // "exact" 或 "domain"
	Reason       *string       `json:"reason,omitempty" db:"reason"`
	BannedBy     uuid.UUID     `json:"banned_by" db:"banned_by"`
	CreatedAt    time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at" db:"updated_at"`
	IsActive     bool          `json:"is_active" db:"is_active"`
	BannedByUser *UserResponse `json:"banned_by_user,omitempty"` // 操作管理员信息
}

// UserBlacklist 用户黑名单模型
type UserBlacklist struct {
	ID           uuid.UUID     `json:"id" db:"id"`
	UserID       uuid.UUID     `json:"user_id" db:"user_id"`
	Reason       *string       `json:"reason,omitempty" db:"reason"`
	BannedBy     uuid.UUID     `json:"banned_by" db:"banned_by"`
	CreatedAt    time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at" db:"updated_at"`
	IsActive     bool          `json:"is_active" db:"is_active"`
	User         *UserResponse `json:"user,omitempty"`           // 被拉黑的用户信息
	BannedByUser *UserResponse `json:"banned_by_user,omitempty"` // 操作管理员信息
}

// BlacklistResponse 黑名单响应模型
type BlacklistResponse struct {
	ID           uuid.UUID     `json:"id"`
	Target       string        `json:"target,omitempty"`     // 网站黑名单使用
	MatchType    string        `json:"match_type,omitempty"` // 网站黑名单使用
	UserID       uuid.UUID     `json:"user_id,omitempty"`    // 用户黑名单使用
	Reason       *string       `json:"reason,omitempty"`
	BannedBy     uuid.UUID     `json:"banned_by"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	IsActive     bool          `json:"is_active"`
	User         *UserResponse `json:"user,omitempty"` // 用户黑名单使用
	BannedByUser *UserResponse `json:"banned_by_user,omitempty"`
}

// BlacklistListResponse 黑名单列表响应模型
type BlacklistListResponse struct {
	Items      []*BlacklistResponse `json:"items"`
	Total      int                  `json:"total"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"page_size"`
	TotalPages int                  `json:"total_pages"`
}
