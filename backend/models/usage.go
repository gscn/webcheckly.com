package models

import "time"

// UsageRecord 使用记录
type UsageRecord struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	TaskID      *string   `json:"task_id,omitempty" db:"task_id"`
	FeatureType string    `json:"feature_type" db:"feature_type"`
	CreditsUsed int       `json:"credits_used" db:"credits_used"`
	IsFree      bool      `json:"is_free" db:"is_free"`
	IsRefunded  bool      `json:"is_refunded" db:"is_refunded"`
	ScanDate    time.Time `json:"scan_date" db:"scan_date"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// UsageStats 使用统计
type UsageStats struct {
	TotalScans       int            `json:"total_scans"`
	FreeScans        int            `json:"free_scans"`
	PaidScans        int            `json:"paid_scans"`
	TotalCreditsUsed int            `json:"total_credits_used"`
	FeatureUsage     map[string]int `json:"feature_usage"` // 功能使用次数统计
	DateRange        struct {
		Start time.Time `json:"start"`
		End   time.Time `json:"end"`
	} `json:"date_range"`
}
