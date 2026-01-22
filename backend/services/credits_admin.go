package services

import (
	"fmt"
	"math"
	"time"
	"web-checkly/database"
)

// CreditsRecordListResponse 积分记录列表响应
type CreditsRecordListResponse struct {
	Records    []*database.CreditsRecord `json:"records"`
	Total      int                       `json:"total"`
	Page       int                       `json:"page"`
	PageSize   int                       `json:"page_size"`
	TotalPages int                       `json:"total_pages"`
	Statistics *database.CreditsStatistics `json:"statistics,omitempty"` // 可选的统计信息
}

// GetCreditsRecords 获取积分记录列表（管理员功能）
func GetCreditsRecords(page, pageSize int, filters map[string]interface{}) (*CreditsRecordListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// 解析时间范围
	if startDateStr, ok := filters["start_date"].(string); ok && startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err == nil {
			filters["start_date"] = startDate
		} else {
			delete(filters, "start_date")
		}
	}

	if endDateStr, ok := filters["end_date"].(string); ok && endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err == nil {
			// 设置为当天的23:59:59
			endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
			filters["end_date"] = endDate
		} else {
			delete(filters, "end_date")
		}
	}

	// 解析布尔值
	if isFreeStr, ok := filters["is_free"].(string); ok && isFreeStr != "" {
		filters["is_free"] = isFreeStr == "true"
	}
	if isRefundedStr, ok := filters["is_refunded"].(string); ok && isRefundedStr != "" {
		filters["is_refunded"] = isRefundedStr == "true"
	}

	// 获取记录列表
	records, err := database.GetCreditsRecords(page, pageSize, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get credits records: %w", err)
	}

	// 获取总数
	total, err := database.GetCreditsRecordsCount(filters)
	if err != nil {
		return nil, fmt.Errorf("failed to count credits records: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &CreditsRecordListResponse{
		Records:    records,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetCreditsStatistics 获取积分统计信息（管理员功能）
func GetCreditsStatistics(filters map[string]interface{}) (*database.CreditsStatistics, error) {
	// 解析时间范围
	if startDateStr, ok := filters["start_date"].(string); ok && startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err == nil {
			filters["start_date"] = startDate
		} else {
			delete(filters, "start_date")
		}
	}

	if endDateStr, ok := filters["end_date"].(string); ok && endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err == nil {
			endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
			filters["end_date"] = endDate
		} else {
			delete(filters, "end_date")
		}
	}

	// 解析布尔值
	if isFreeStr, ok := filters["is_free"].(string); ok && isFreeStr != "" {
		filters["is_free"] = isFreeStr == "true"
	}
	if isRefundedStr, ok := filters["is_refunded"].(string); ok && isRefundedStr != "" {
		filters["is_refunded"] = isRefundedStr == "true"
	}

	stats, err := database.GetCreditsStatistics(filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get credits statistics: %w", err)
	}

	return stats, nil
}
