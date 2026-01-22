package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
	"web-checkly/models"
)

// CreditsRecord 积分记录（包含用户信息）
type CreditsRecord struct {
	models.UsageRecord
	UserEmail string `json:"user_email"` // 用户邮箱
}

// CreditsStatistics 积分统计信息
type CreditsStatistics struct {
	TotalUsers          int            `json:"total_users"`           // 有积分记录的用户数
	TotalCreditsUsed    int            `json:"total_credits_used"`     // 总积分使用量
	TotalRecords        int            `json:"total_records"`         // 总记录数
	ByFeatureType       map[string]int `json:"by_feature_type"`        // 按功能类型统计
	ByUser              map[string]int `json:"by_user"`                // 按用户统计（用户ID -> 积分使用量）
	FreeRecords         int            `json:"free_records"`            // 免费记录数
	PaidRecords         int            `json:"paid_records"`           // 付费记录数
	RefundedRecords     int            `json:"refunded_records"`        // 退款记录数
	DateRange           struct {
		Start time.Time `json:"start"`
		End   time.Time `json:"end"`
	} `json:"date_range"`
}

// GetCreditsRecords 获取积分记录列表（管理员功能，支持多维度筛选）
func GetCreditsRecords(page, pageSize int, filters map[string]interface{}) ([]*CreditsRecord, error) {
	offset := (page - 1) * pageSize

	// 构建WHERE子句
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// 时间范围筛选
	if startDate, ok := filters["start_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("usage_records.scan_date >= $%d", argIndex))
		args = append(args, startDate)
		argIndex++
	}
	if endDate, ok := filters["end_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("usage_records.scan_date <= $%d", argIndex))
		args = append(args, endDate)
		argIndex++
	}

	// 用户ID筛选
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("usage_records.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	// 功能类型筛选
	if featureType, ok := filters["feature_type"].(string); ok && featureType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("usage_records.feature_type = $%d", argIndex))
		args = append(args, featureType)
		argIndex++
	}

	// 是否免费筛选
	if isFree, ok := filters["is_free"].(bool); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("usage_records.is_free = $%d", argIndex))
		args = append(args, isFree)
		argIndex++
	}

	// 是否退款筛选
	if isRefunded, ok := filters["is_refunded"].(bool); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("usage_records.is_refunded = $%d", argIndex))
		args = append(args, isRefunded)
		argIndex++
	}

	// 构建WHERE子句
	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// 查询积分记录列表（包含用户邮箱）
	query := fmt.Sprintf(`
		SELECT 
			usage_records.id, usage_records.user_id, usage_records.task_id, 
			usage_records.feature_type, usage_records.credits_used, 
			usage_records.is_free, usage_records.is_refunded, 
			usage_records.scan_date, usage_records.created_at,
			COALESCE(users.email, '') as email
		FROM usage_records
		LEFT JOIN users ON usage_records.user_id = users.id
		%s
		ORDER BY usage_records.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query credits records: %w", err)
	}
	defer rows.Close()

	var records []*CreditsRecord
	for rows.Next() {
		var record CreditsRecord
		var taskID sql.NullString

		err := rows.Scan(
			&record.ID,
			&record.UserID,
			&taskID,
			&record.FeatureType,
			&record.CreditsUsed,
			&record.IsFree,
			&record.IsRefunded,
			&record.ScanDate,
			&record.CreatedAt,
			&record.UserEmail,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan credits record: %w", err)
		}

		if taskID.Valid {
			record.TaskID = &taskID.String
		}

		records = append(records, &record)
	}

	return records, nil
}

// GetCreditsRecordsCount 获取积分记录总数
func GetCreditsRecordsCount(filters map[string]interface{}) (int, error) {
	// 构建WHERE子句
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// 时间范围筛选
	if startDate, ok := filters["start_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("scan_date >= $%d", argIndex))
		args = append(args, startDate)
		argIndex++
	}
	if endDate, ok := filters["end_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("scan_date <= $%d", argIndex))
		args = append(args, endDate)
		argIndex++
	}

	// 用户ID筛选
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	// 功能类型筛选
	if featureType, ok := filters["feature_type"].(string); ok && featureType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("feature_type = $%d", argIndex))
		args = append(args, featureType)
		argIndex++
	}

	// 是否免费筛选
	if isFree, ok := filters["is_free"].(bool); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("is_free = $%d", argIndex))
		args = append(args, isFree)
		argIndex++
	}

	// 是否退款筛选
	if isRefunded, ok := filters["is_refunded"].(bool); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("is_refunded = $%d", argIndex))
		args = append(args, isRefunded)
		argIndex++
	}

	// 构建WHERE子句
	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// 查询总数
	query := fmt.Sprintf("SELECT COUNT(*) FROM usage_records %s", whereClause)

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count credits records: %w", err)
	}

	return count, nil
}

// GetCreditsStatistics 获取积分统计信息
func GetCreditsStatistics(filters map[string]interface{}) (*CreditsStatistics, error) {
	stats := &CreditsStatistics{
		ByFeatureType: make(map[string]int),
		ByUser:        make(map[string]int),
	}

	// 构建WHERE子句
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// 时间范围筛选
	if startDate, ok := filters["start_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("scan_date >= $%d", argIndex))
		args = append(args, startDate)
		stats.DateRange.Start = startDate
		argIndex++
	} else {
		// 默认最近30天
		stats.DateRange.Start = time.Now().AddDate(0, 0, -30)
	}

	if endDate, ok := filters["end_date"].(time.Time); ok {
		whereConditions = append(whereConditions, fmt.Sprintf("scan_date <= $%d", argIndex))
		args = append(args, endDate)
		stats.DateRange.End = endDate
		argIndex++
	} else {
		stats.DateRange.End = time.Now()
	}

	// 用户ID筛选
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	// 功能类型筛选
	if featureType, ok := filters["feature_type"].(string); ok && featureType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("feature_type = $%d", argIndex))
		args = append(args, featureType)
		argIndex++
	}

	// 构建WHERE子句
	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// 1. 获取总记录数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM usage_records %s", whereClause)
	var countArgs []interface{}
	if whereClause != "" {
		countArgs = args
	}
	err := DB.QueryRow(countQuery, countArgs...).Scan(&stats.TotalRecords)
	if err != nil {
		return nil, fmt.Errorf("failed to get total records: %w", err)
	}

	// 2. 获取总积分使用量
	creditsQuery := fmt.Sprintf("SELECT COALESCE(SUM(credits_used), 0) FROM usage_records %s", whereClause)
	err = DB.QueryRow(creditsQuery, countArgs...).Scan(&stats.TotalCreditsUsed)
	if err != nil {
		return nil, fmt.Errorf("failed to get total credits used: %w", err)
	}

	// 3. 获取有积分记录的用户数
	usersQuery := fmt.Sprintf("SELECT COUNT(DISTINCT user_id) FROM usage_records %s", whereClause)
	err = DB.QueryRow(usersQuery, countArgs...).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get total users: %w", err)
	}

	// 4. 获取免费/付费/退款记录数
	var freeQuery string
	var freeArgs []interface{}
	if whereClause != "" {
		freeQuery = fmt.Sprintf("SELECT COUNT(*) FROM usage_records %s AND is_free = true", whereClause)
		freeArgs = args
	} else {
		freeQuery = "SELECT COUNT(*) FROM usage_records WHERE is_free = true"
		freeArgs = []interface{}{}
	}
	if err := DB.QueryRow(freeQuery, freeArgs...).Scan(&stats.FreeRecords); err != nil {
		stats.FreeRecords = 0
	}

	var paidQuery string
	var paidArgs []interface{}
	if whereClause != "" {
		paidQuery = fmt.Sprintf("SELECT COUNT(*) FROM usage_records %s AND is_free = false", whereClause)
		paidArgs = args
	} else {
		paidQuery = "SELECT COUNT(*) FROM usage_records WHERE is_free = false"
		paidArgs = []interface{}{}
	}
	if err := DB.QueryRow(paidQuery, paidArgs...).Scan(&stats.PaidRecords); err != nil {
		stats.PaidRecords = 0
	}

	var refundedQuery string
	var refundedArgs []interface{}
	if whereClause != "" {
		refundedQuery = fmt.Sprintf("SELECT COUNT(*) FROM usage_records %s AND is_refunded = true", whereClause)
		refundedArgs = args
	} else {
		refundedQuery = "SELECT COUNT(*) FROM usage_records WHERE is_refunded = true"
		refundedArgs = []interface{}{}
	}
	if err := DB.QueryRow(refundedQuery, refundedArgs...).Scan(&stats.RefundedRecords); err != nil {
		stats.RefundedRecords = 0
	}

	// 5. 按功能类型统计
	featureQuery := fmt.Sprintf(`
		SELECT feature_type, COUNT(*) as count
		FROM usage_records
		%s
		GROUP BY feature_type
	`, whereClause)

	var featureArgs []interface{}
	if whereClause != "" {
		featureArgs = args
	}
	featureRows, err := DB.Query(featureQuery, featureArgs...)
	if err == nil {
		defer featureRows.Close()
		for featureRows.Next() {
			var featureType string
			var count int
			if err := featureRows.Scan(&featureType, &count); err == nil {
				stats.ByFeatureType[featureType] = count
			}
		}
	}

	// 6. 按用户统计（积分使用量，包含用户邮箱）
	userQuery := fmt.Sprintf(`
		SELECT usage_records.user_id, COALESCE(users.email, '') as email, SUM(usage_records.credits_used) as total
		FROM usage_records
		LEFT JOIN users ON usage_records.user_id = users.id
		%s
		GROUP BY usage_records.user_id, users.email
		ORDER BY total DESC
		LIMIT 20
	`, whereClause)

	var userArgs []interface{}
	if whereClause != "" {
		userArgs = args
	}
	userRows, err := DB.Query(userQuery, userArgs...)
	if err == nil {
		defer userRows.Close()
		for userRows.Next() {
			var userID string
			var userEmail string
			var total int
			if err := userRows.Scan(&userID, &userEmail, &total); err == nil {
				// 使用邮箱作为键，如果没有邮箱则使用用户ID
				key := userEmail
				if key == "" {
					key = userID
				}
				stats.ByUser[key] = total
			}
		}
	}

	return stats, nil
}

// GetAllUsersCredits 获取所有用户的积分余额（用于统计）
func GetAllUsersCredits() (map[string]int, error) {
	query := `
		SELECT user_id, credits
		FROM user_credits
		ORDER BY credits DESC
	`

	rows, err := DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users credits: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var userID string
		var credits int
		if err := rows.Scan(&userID, &credits); err == nil {
			result[userID] = credits
		}
	}

	return result, nil
}
