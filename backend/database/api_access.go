package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
	"web-checkly/models"

	"github.com/google/uuid"
)

// contains 检查字符串是否包含子字符串（不区分大小写）
func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// CreateAPIAccessRecord 创建API访问记录
func CreateAPIAccessRecord(record *models.APIAccessRecord) error {
	if record.ID == "" {
		record.ID = uuid.New().String()
	}

	query := `
		INSERT INTO api_access_records (
			id, user_id, api_endpoint, method, ip_address, user_agent,
			status_code, response_time_ms, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := DB.Exec(
		query,
		record.ID,
		record.UserID,
		record.APIEndpoint,
		record.Method,
		record.IPAddress,
		record.UserAgent,
		record.StatusCode,
		record.ResponseTime,
		record.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create API access record: %w", err)
	}

	return nil
}

// GetUserAPIAccessCount 获取用户API访问次数（指定月份）
func GetUserAPIAccessCount(userID string, month time.Time) (int, error) {
	monthStart := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	query := `
		SELECT COUNT(*)
		FROM api_access_records
		WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
	`

	var count int
	err := DB.QueryRow(query, userID, monthStart, monthEnd).Scan(&count)
	if err != nil {
		// 如果表不存在，返回0而不是错误
		errStr := err.Error()
		if errStr != "" && (contains(errStr, "does not exist") || (contains(errStr, "relation") && contains(errStr, "api_access_records"))) {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get API access count: %w", err)
	}

	return count, nil
}

// GetUserTotalAPIAccessCount 获取用户API访问总次数
func GetUserTotalAPIAccessCount(userID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM api_access_records
		WHERE user_id = $1
	`

	var count int
	err := DB.QueryRow(query, userID).Scan(&count)
	if err != nil {
		// 如果表不存在，返回0而不是错误
		errStr := err.Error()
		if errStr != "" && (contains(errStr, "does not exist") || (contains(errStr, "relation") && contains(errStr, "api_access_records"))) {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get total API access count: %w", err)
	}

	return count, nil
}

// IncrementMonthlyAPIAccessUsed 增加月度API访问使用计数
func IncrementMonthlyAPIAccessUsed(userID string, subscriptionID string, month time.Time) error {
	monthStart := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())

	// 先尝试插入，如果已存在则更新
	query := `
		INSERT INTO subscription_usage (
			user_id, subscription_id, month, api_access_used, created_at, updated_at
		) VALUES ($1, $2, $3, 1, NOW(), NOW())
		ON CONFLICT (user_id, month)
		DO UPDATE SET
			api_access_used = subscription_usage.api_access_used + 1,
			updated_at = NOW()
	`

	_, err := DB.Exec(query, userID, subscriptionID, monthStart)
	if err != nil {
		return fmt.Errorf("failed to increment monthly API access used: %w", err)
	}

	return nil
}

// GetAPIAccessRecords 获取API访问记录列表（分页）
func GetAPIAccessRecords(userID string, limit, offset int) ([]*models.APIAccessRecord, error) {
	query := `
		SELECT id, user_id, api_endpoint, method, ip_address, user_agent,
			status_code, response_time_ms, created_at
		FROM api_access_records
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := DB.Query(query, userID, limit, offset)
	if err != nil {
		// 如果表不存在，返回空数组而不是错误
		errStr := err.Error()
		if errStr != "" && (contains(errStr, "does not exist") || (contains(errStr, "relation") && contains(errStr, "api_access_records"))) {
			return []*models.APIAccessRecord{}, nil
		}
		return nil, fmt.Errorf("failed to query API access records: %w", err)
	}
	defer rows.Close()

	var records []*models.APIAccessRecord
	for rows.Next() {
		var record models.APIAccessRecord
		var ipAddress, userAgent sql.NullString
		var statusCode, responseTime sql.NullInt64

		err := rows.Scan(
			&record.ID,
			&record.UserID,
			&record.APIEndpoint,
			&record.Method,
			&ipAddress,
			&userAgent,
			&statusCode,
			&responseTime,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan API access record: %w", err)
		}

		if ipAddress.Valid {
			record.IPAddress = &ipAddress.String
		}
		if userAgent.Valid {
			record.UserAgent = &userAgent.String
		}
		if statusCode.Valid {
			code := int(statusCode.Int64)
			record.StatusCode = &code
		}
		if responseTime.Valid {
			time := int(responseTime.Int64)
			record.ResponseTime = &time
		}

		records = append(records, &record)
	}

	return records, nil
}

// GetAPIAccessRecordCount 获取API访问记录总数
func GetAPIAccessRecordCount(userID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM api_access_records
		WHERE user_id = $1
	`

	var count int
	err := DB.QueryRow(query, userID).Scan(&count)
	if err != nil {
		// 如果表不存在，返回0而不是错误
		errStr := err.Error()
		if errStr != "" && (contains(errStr, "does not exist") || (contains(errStr, "relation") && contains(errStr, "api_access_records"))) {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get API access record count: %w", err)
	}

	return count, nil
}
