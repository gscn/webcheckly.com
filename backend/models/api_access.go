package models

import "time"

// APIAccessRecord API访问记录
type APIAccessRecord struct {
	ID            string    `json:"id" db:"id"`
	UserID       string    `json:"user_id" db:"user_id"`
	APIEndpoint  string    `json:"api_endpoint" db:"api_endpoint"`
	Method       string    `json:"method" db:"method"`
	IPAddress    *string   `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent    *string   `json:"user_agent,omitempty" db:"user_agent"`
	StatusCode   *int      `json:"status_code,omitempty" db:"status_code"`
	ResponseTime *int      `json:"response_time_ms,omitempty" db:"response_time_ms"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// APIAccessStats API访问统计
type APIAccessStats struct {
	TotalRequests    int `json:"total_requests"`
	MonthlyRequests  int `json:"monthly_requests"`
	MonthlyLimit     *int `json:"monthly_limit,omitempty"`
	RemainingRequests *int `json:"remaining_requests,omitempty"`
}
