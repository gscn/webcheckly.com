package services

import (
	"fmt"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// CreateWebsiteBlacklist 创建网站黑名单
func CreateWebsiteBlacklist(target, matchType, reason string, bannedBy uuid.UUID) (*models.WebsiteBlacklist, error) {
	// 验证匹配类型
	if matchType != "exact" && matchType != "domain" {
		return nil, fmt.Errorf("invalid match type: must be 'exact' or 'domain'")
	}

	// 验证目标不能为空
	if target == "" {
		return nil, fmt.Errorf("target cannot be empty")
	}

	return database.CreateWebsiteBlacklist(target, matchType, reason, bannedBy)
}

// GetWebsiteBlacklistList 获取网站黑名单列表
func GetWebsiteBlacklistList(page, pageSize int, search string) (*models.BlacklistListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	items, total, err := database.GetAllWebsiteBlacklist(page, pageSize, search)
	if err != nil {
		return nil, err
	}

	// 转换为响应模型并填充管理员信息
	responseItems := make([]*models.BlacklistResponse, 0, len(items))
	for _, item := range items {
		responseItem := &models.BlacklistResponse{
			ID:        item.ID,
			Target:    item.Target,
			MatchType: item.MatchType,
			Reason:    item.Reason,
			BannedBy:  item.BannedBy,
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
			IsActive:  item.IsActive,
		}

		// 获取操作管理员信息
		adminUser, err := database.GetUserByID(item.BannedBy)
		if err == nil {
			responseItem.BannedByUser = &models.UserResponse{
				ID:    adminUser.ID,
				Email: adminUser.Email,
				Role:  adminUser.Role,
			}
		}

		responseItems = append(responseItems, responseItem)
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &models.BlacklistListResponse{
		Items:      responseItems,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// ToggleWebsiteBlacklistStatus 切换网站黑名单状态（拉黑/解禁）
func ToggleWebsiteBlacklistStatus(id uuid.UUID, isActive bool) error {
	return database.UpdateWebsiteBlacklistStatus(id, isActive)
}

// DeleteWebsiteBlacklist 删除网站黑名单记录
func DeleteWebsiteBlacklist(id uuid.UUID) error {
	return database.DeleteWebsiteBlacklist(id)
}

// CreateUserBlacklist 创建用户黑名单
func CreateUserBlacklist(userID, bannedBy uuid.UUID, reason string) (*models.UserBlacklist, error) {
	// 验证用户是否存在
	user, err := database.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// 不能拉黑管理员
	if user.Role == models.UserRoleAdmin {
		return nil, fmt.Errorf("cannot blacklist admin users")
	}

	return database.CreateUserBlacklist(userID, bannedBy, reason)
}

// GetUserBlacklistList 获取用户黑名单列表
func GetUserBlacklistList(page, pageSize int, search string) (*models.BlacklistListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	items, total, err := database.GetAllUserBlacklist(page, pageSize, search)
	if err != nil {
		return nil, err
	}

	// 转换为响应模型并填充用户和管理员信息
	responseItems := make([]*models.BlacklistResponse, 0, len(items))
	for _, item := range items {
		responseItem := &models.BlacklistResponse{
			ID:        item.ID,
			UserID:    item.UserID,
			Reason:    item.Reason,
			BannedBy:  item.BannedBy,
			CreatedAt: item.CreatedAt,
			UpdatedAt: item.UpdatedAt,
			IsActive:  item.IsActive,
		}

		// 获取被拉黑的用户信息
		user, err := database.GetUserByID(item.UserID)
		if err == nil {
			responseItem.User = &models.UserResponse{
				ID:    user.ID,
				Email: user.Email,
				Role:  user.Role,
			}
		}

		// 获取操作管理员信息
		adminUser, err := database.GetUserByID(item.BannedBy)
		if err == nil {
			responseItem.BannedByUser = &models.UserResponse{
				ID:    adminUser.ID,
				Email: adminUser.Email,
				Role:  adminUser.Role,
			}
		}

		responseItems = append(responseItems, responseItem)
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &models.BlacklistListResponse{
		Items:      responseItems,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// ToggleUserBlacklistStatus 切换用户黑名单状态（拉黑/解禁）
func ToggleUserBlacklistStatus(id uuid.UUID, isActive bool) error {
	return database.UpdateUserBlacklistStatus(id, isActive)
}

// DeleteUserBlacklist 删除用户黑名单记录
func DeleteUserBlacklist(id uuid.UUID) error {
	return database.DeleteUserBlacklist(id)
}
