package services

import (
	"fmt"
	"math"
	"time"
	"web-checkly/database"
	"web-checkly/models"
)

// GetRevenueOrders 获取收入订单列表
func GetRevenueOrders(page, pageSize int, filters map[string]interface{}) (*models.RevenueOrderListResponse, error) {
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

	// 获取订单列表
	orders, err := database.GetRevenueOrders(page, pageSize, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get revenue orders: %w", err)
	}

	// 获取总数
	total, err := database.GetRevenueOrdersCount(filters)
	if err != nil {
		return nil, fmt.Errorf("failed to count revenue orders: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &models.RevenueOrderListResponse{
		Orders:     orders,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetRevenueStatistics 获取收入统计信息
func GetRevenueStatistics(filters map[string]interface{}) (*models.RevenueStatistics, error) {
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

	stats, err := database.GetRevenueStatistics(filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get revenue statistics: %w", err)
	}

	return stats, nil
}

// ExportRevenueOrders 导出订单数据（返回CSV格式的字符串）
func ExportRevenueOrders(filters map[string]interface{}) (string, error) {
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

	// 获取所有订单（不分页）
	orders, err := database.GetRevenueOrders(1, 10000, filters) // 最多导出10000条
	if err != nil {
		return "", fmt.Errorf("failed to get revenue orders for export: %w", err)
	}

	// 生成CSV内容
	csv := "订单ID,用户邮箱,订单类型,金额(USD),积分数量,支付方式,订单状态,创建时间,支付时间\n"
	for _, order := range orders {
		orderType := string(order.OrderType)
		status := string(order.Status)
		createdAt := order.CreatedAt.Format("2006-01-02 15:04:05")
		paidAt := ""
		if order.PaidAt != nil {
			paidAt = order.PaidAt.Format("2006-01-02 15:04:05")
		}

		csv += fmt.Sprintf("%s,%s,%s,%.2f,%d,%s,%s,%s,%s\n",
			order.ID,
			order.UserEmail,
			orderType,
			order.Amount,
			order.CreditsAmount,
			order.PaymentMethod,
			status,
			createdAt,
			paidAt,
		)
	}

	return csv, nil
}
