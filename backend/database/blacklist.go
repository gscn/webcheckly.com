package database

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"
	"web-checkly/models"

	"github.com/google/uuid"
)

// CreateWebsiteBlacklist 创建网站黑名单记录
func CreateWebsiteBlacklist(target, matchType, reason string, bannedBy uuid.UUID) (*models.WebsiteBlacklist, error) {
	blacklist := &models.WebsiteBlacklist{
		ID:        uuid.New(),
		Target:    target,
		MatchType: matchType,
		BannedBy:  bannedBy,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if reason != "" {
		blacklist.Reason = &reason
	}

	query := `
		INSERT INTO website_blacklist (id, target, match_type, reason, banned_by, created_at, updated_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, target, match_type, reason, banned_by, created_at, updated_at, is_active
	`

	err := DB.QueryRow(
		query,
		blacklist.ID,
		blacklist.Target,
		blacklist.MatchType,
		blacklist.Reason,
		blacklist.BannedBy,
		blacklist.CreatedAt,
		blacklist.UpdatedAt,
		blacklist.IsActive,
	).Scan(
		&blacklist.ID,
		&blacklist.Target,
		&blacklist.MatchType,
		&blacklist.Reason,
		&blacklist.BannedBy,
		&blacklist.CreatedAt,
		&blacklist.UpdatedAt,
		&blacklist.IsActive,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create website blacklist: %w", err)
	}

	return blacklist, nil
}

// GetWebsiteBlacklist 根据ID获取网站黑名单记录
func GetWebsiteBlacklist(id uuid.UUID) (*models.WebsiteBlacklist, error) {
	blacklist := &models.WebsiteBlacklist{}

	query := `
		SELECT id, target, match_type, reason, banned_by, created_at, updated_at, is_active
		FROM website_blacklist
		WHERE id = $1
	`

	err := DB.QueryRow(query, id).Scan(
		&blacklist.ID,
		&blacklist.Target,
		&blacklist.MatchType,
		&blacklist.Reason,
		&blacklist.BannedBy,
		&blacklist.CreatedAt,
		&blacklist.UpdatedAt,
		&blacklist.IsActive,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("website blacklist not found")
		}
		return nil, fmt.Errorf("failed to get website blacklist: %w", err)
	}

	return blacklist, nil
}

// GetAllWebsiteBlacklist 获取网站黑名单列表（分页、搜索）
func GetAllWebsiteBlacklist(page, pageSize int, search string) ([]*models.WebsiteBlacklist, int, error) {
	offset := (page - 1) * pageSize

	var whereClause string
	var args []interface{}
	argIndex := 1

	if search != "" {
		whereClause = fmt.Sprintf("WHERE target ILIKE $%d", argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// 查询总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM website_blacklist %s", whereClause)
	var total int
	err := DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count website blacklist: %w", err)
	}

	// 查询列表
	query := fmt.Sprintf(`
		SELECT id, target, match_type, reason, banned_by, created_at, updated_at, is_active
		FROM website_blacklist
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query website blacklist: %w", err)
	}
	defer rows.Close()

	var items []*models.WebsiteBlacklist
	for rows.Next() {
		item := &models.WebsiteBlacklist{}
		err := rows.Scan(
			&item.ID,
			&item.Target,
			&item.MatchType,
			&item.Reason,
			&item.BannedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.IsActive,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan website blacklist: %w", err)
		}
		items = append(items, item)
	}

	return items, total, nil
}

// UpdateWebsiteBlacklistStatus 更新网站黑名单状态
func UpdateWebsiteBlacklistStatus(id uuid.UUID, isActive bool) error {
	query := `
		UPDATE website_blacklist
		SET is_active = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := DB.Exec(query, isActive, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update website blacklist status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("website blacklist not found")
	}

	return nil
}

// DeleteWebsiteBlacklist 删除网站黑名单记录
func DeleteWebsiteBlacklist(id uuid.UUID) error {
	query := `DELETE FROM website_blacklist WHERE id = $1`

	result, err := DB.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete website blacklist: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("website blacklist not found")
	}

	return nil
}

// IsWebsiteBlacklisted 检查URL是否在黑名单中
func IsWebsiteBlacklisted(targetURL string) bool {
	log.Printf("[IsWebsiteBlacklisted] Checking blacklist for URL: %s", targetURL)

	// 解析URL
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		log.Printf("[IsWebsiteBlacklisted] Error parsing URL: %v", err)
		return false
	}

	hostname := parsedURL.Hostname()
	if hostname == "" {
		log.Printf("[IsWebsiteBlacklisted] No hostname found in URL: %s", targetURL)
		return false
	}

	log.Printf("[IsWebsiteBlacklisted] Extracted hostname: %s", hostname)

	// 规范化URL用于比较（去除尾部斜杠，统一格式）
	normalizedTargetURL := strings.TrimSuffix(targetURL, "/")
	if normalizedTargetURL == "" {
		normalizedTargetURL = targetURL
	}

	// 检查精确匹配：查询所有精确匹配类型的记录，进行规范化比较
	query := `
		SELECT target FROM website_blacklist
		WHERE is_active = true
		AND match_type = 'exact'
	`
	exactRows, err := DB.Query(query)
	if err != nil {
		log.Printf("[IsWebsiteBlacklisted] Error querying exact blacklist: %v", err)
	} else {
		defer exactRows.Close()
		for exactRows.Next() {
			var blacklistedURL string
			if err := exactRows.Scan(&blacklistedURL); err != nil {
				log.Printf("[IsWebsiteBlacklisted] Error scanning blacklisted URL: %v", err)
				continue
			}
			
			// 规范化黑名单URL（去除尾部斜杠）
			normalizedBlacklistedURL := strings.TrimSuffix(blacklistedURL, "/")
			
			// 精确匹配：规范化后的URL完全相等
			if normalizedTargetURL == normalizedBlacklistedURL {
				log.Printf("[IsWebsiteBlacklisted] Exact URL match found: %s == %s", targetURL, blacklistedURL)
				return true
			}
			
			// 也检查原始格式（兼容性）
			if targetURL == blacklistedURL {
				log.Printf("[IsWebsiteBlacklisted] Exact URL match found (original format): %s == %s", targetURL, blacklistedURL)
				return true
			}
			
			// 如果黑名单目标是URL格式，也提取域名进行比较（兼容性：用户可能误将URL添加到精确匹配）
			if strings.HasPrefix(blacklistedURL, "http://") || strings.HasPrefix(blacklistedURL, "https://") {
				parsedBlacklistedURL, err := url.Parse(blacklistedURL)
				if err == nil && parsedBlacklistedURL.Hostname() != "" {
					blacklistedDomainFromURL := strings.ToLower(parsedBlacklistedURL.Hostname())
					hostnameLower := strings.ToLower(hostname)
					if hostnameLower == blacklistedDomainFromURL {
						log.Printf("[IsWebsiteBlacklisted] Domain match found from exact-type URL: %s (from %s)", hostname, blacklistedURL)
						return true
					}
				}
			}
		}
	}

	// 检查域名匹配：获取所有生效的域名黑名单记录
	query = `
		SELECT target FROM website_blacklist
		WHERE is_active = true
		AND match_type = 'domain'
	`
	rows, err := DB.Query(query)
	if err != nil {
		log.Printf("[IsWebsiteBlacklisted] Error querying domain blacklist: %v", err)
		return false
	}
	defer rows.Close()

	// 转换为小写进行比较（域名不区分大小写）
	hostnameLower := strings.ToLower(hostname)

	for rows.Next() {
		var blacklistedTarget string
		if err := rows.Scan(&blacklistedTarget); err != nil {
			log.Printf("[IsWebsiteBlacklisted] Error scanning blacklisted domain: %v", err)
			continue
		}

		// 处理黑名单目标：可能是域名，也可能是URL格式
		blacklistedDomain := strings.TrimSpace(blacklistedTarget)
		
		// 如果黑名单目标是URL格式，提取域名
		if strings.HasPrefix(blacklistedDomain, "http://") || strings.HasPrefix(blacklistedDomain, "https://") {
			parsedBlacklistedURL, err := url.Parse(blacklistedDomain)
			if err == nil && parsedBlacklistedURL.Hostname() != "" {
				blacklistedDomain = parsedBlacklistedURL.Hostname()
			}
		}
		
		// 转换为小写进行比较
		blacklistedDomainLower := strings.ToLower(blacklistedDomain)

		// 精确匹配：hostname 完全等于黑名单域名
		if hostnameLower == blacklistedDomainLower {
			log.Printf("[IsWebsiteBlacklisted] Exact domain match found: %s == %s", hostname, blacklistedDomain)
			return true
		}

		// 子域名匹配：hostname 是 blacklistedDomain 的子域名
		// 例如：如果黑名单是 "example.com"，则 "sub.example.com" 应该被匹配
		if strings.HasSuffix(hostnameLower, "."+blacklistedDomainLower) {
			log.Printf("[IsWebsiteBlacklisted] Subdomain match found: %s ends with .%s", hostname, blacklistedDomain)
			return true
		}
	}

	log.Printf("[IsWebsiteBlacklisted] No blacklist match found for URL: %s (hostname: %s)", targetURL, hostname)
	return false
}

// CreateUserBlacklist 创建用户黑名单记录
func CreateUserBlacklist(userID, bannedBy uuid.UUID, reason string) (*models.UserBlacklist, error) {
	// 检查是否已存在生效的黑名单记录
	existing, err := GetUserBlacklistByUserID(userID)
	if err == nil && existing != nil && existing.IsActive {
		return nil, fmt.Errorf("user is already blacklisted")
	}

	blacklist := &models.UserBlacklist{
		ID:        uuid.New(),
		UserID:    userID,
		BannedBy:  bannedBy,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if reason != "" {
		blacklist.Reason = &reason
	}

	query := `
		INSERT INTO user_blacklist (id, user_id, reason, banned_by, created_at, updated_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, reason, banned_by, created_at, updated_at, is_active
	`

	err = DB.QueryRow(
		query,
		blacklist.ID,
		blacklist.UserID,
		blacklist.Reason,
		blacklist.BannedBy,
		blacklist.CreatedAt,
		blacklist.UpdatedAt,
		blacklist.IsActive,
	).Scan(
		&blacklist.ID,
		&blacklist.UserID,
		&blacklist.Reason,
		&blacklist.BannedBy,
		&blacklist.CreatedAt,
		&blacklist.UpdatedAt,
		&blacklist.IsActive,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user blacklist: %w", err)
	}

	return blacklist, nil
}

// GetUserBlacklist 根据ID获取用户黑名单记录
func GetUserBlacklist(id uuid.UUID) (*models.UserBlacklist, error) {
	blacklist := &models.UserBlacklist{}

	query := `
		SELECT id, user_id, reason, banned_by, created_at, updated_at, is_active
		FROM user_blacklist
		WHERE id = $1
	`

	err := DB.QueryRow(query, id).Scan(
		&blacklist.ID,
		&blacklist.UserID,
		&blacklist.Reason,
		&blacklist.BannedBy,
		&blacklist.CreatedAt,
		&blacklist.UpdatedAt,
		&blacklist.IsActive,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user blacklist not found")
		}
		return nil, fmt.Errorf("failed to get user blacklist: %w", err)
	}

	return blacklist, nil
}

// GetUserBlacklistByUserID 根据用户ID获取生效的黑名单记录
func GetUserBlacklistByUserID(userID uuid.UUID) (*models.UserBlacklist, error) {
	blacklist := &models.UserBlacklist{}

	query := `
		SELECT id, user_id, reason, banned_by, created_at, updated_at, is_active
		FROM user_blacklist
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := DB.QueryRow(query, userID).Scan(
		&blacklist.ID,
		&blacklist.UserID,
		&blacklist.Reason,
		&blacklist.BannedBy,
		&blacklist.CreatedAt,
		&blacklist.UpdatedAt,
		&blacklist.IsActive,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user is not blacklisted")
		}
		return nil, fmt.Errorf("failed to get user blacklist: %w", err)
	}

	return blacklist, nil
}

// GetAllUserBlacklist 获取用户黑名单列表（分页、搜索）
func GetAllUserBlacklist(page, pageSize int, search string) ([]*models.UserBlacklist, int, error) {
	offset := (page - 1) * pageSize

	var whereClause string
	var args []interface{}
	argIndex := 1

	if search != "" {
		// 通过用户邮箱搜索
		whereClause = fmt.Sprintf(`
			WHERE EXISTS (
				SELECT 1 FROM users
				WHERE users.id = user_blacklist.user_id
				AND users.email ILIKE $%d
			)
		`, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// 查询总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM user_blacklist %s", whereClause)
	var total int
	err := DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count user blacklist: %w", err)
	}

	// 查询列表
	query := fmt.Sprintf(`
		SELECT id, user_id, reason, banned_by, created_at, updated_at, is_active
		FROM user_blacklist
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query user blacklist: %w", err)
	}
	defer rows.Close()

	var items []*models.UserBlacklist
	for rows.Next() {
		item := &models.UserBlacklist{}
		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Reason,
			&item.BannedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.IsActive,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user blacklist: %w", err)
		}
		items = append(items, item)
	}

	return items, total, nil
}

// UpdateUserBlacklistStatus 更新用户黑名单状态
func UpdateUserBlacklistStatus(id uuid.UUID, isActive bool) error {
	query := `
		UPDATE user_blacklist
		SET is_active = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := DB.Exec(query, isActive, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update user blacklist status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user blacklist not found")
	}

	return nil
}

// DeleteUserBlacklist 删除用户黑名单记录
func DeleteUserBlacklist(id uuid.UUID) error {
	query := `DELETE FROM user_blacklist WHERE id = $1`

	result, err := DB.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user blacklist: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user blacklist not found")
	}

	return nil
}

// IsUserBlacklisted 检查用户是否被拉黑
func IsUserBlacklisted(userID uuid.UUID) bool {
	query := `
		SELECT COUNT(*) FROM user_blacklist
		WHERE user_id = $1 AND is_active = true
	`

	var count int
	err := DB.QueryRow(query, userID).Scan(&count)
	if err != nil {
		log.Printf("[IsUserBlacklisted] Error checking user blacklist: %v", err)
		return false
	}

	return count > 0
}
