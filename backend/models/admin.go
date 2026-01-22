package models

import "time"

// AdminUserListResponse 管理员用户列表响应
type AdminUserListResponse struct {
	Users      []*UserResponse `json:"users"`
	Total      int             `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"page_size"`
	TotalPages int             `json:"total_pages"`
}

// AdminUserDetailResponse 管理员用户详情响应
type AdminUserDetailResponse struct {
	User         *UserResponse `json:"user"`
	Credits      *UserCredits  `json:"credits,omitempty"`
	Subscription *Subscription `json:"subscription,omitempty"`
	TaskCount    int           `json:"task_count"`
}

// AdminTaskListResponse 管理员任务列表响应
type AdminTaskListResponse struct {
	Tasks      []*Task `json:"tasks"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	PageSize   int     `json:"page_size"`
	TotalPages int     `json:"total_pages"`
}

// AdminSubscriptionListResponse 管理员订阅列表响应
type AdminSubscriptionListResponse struct {
	Subscriptions []*Subscription `json:"subscriptions"`
	Total         int             `json:"total"`
	Page          int             `json:"page"`
	PageSize      int             `json:"page_size"`
	TotalPages    int             `json:"total_pages"`
}

// SystemStatistics 系统统计信息
type SystemStatistics struct {
	TotalUsers          int     `json:"total_users"`
	ActiveUsers         int     `json:"active_users"` // 30天内有登录的用户
	TotalTasks          int     `json:"total_tasks"`
	CompletedTasks      int     `json:"completed_tasks"`
	TotalSubscriptions  int     `json:"total_subscriptions"`
	ActiveSubscriptions int     `json:"active_subscriptions"`
	TotalCredits        int     `json:"total_credits"` // 所有用户积分总和
	TotalRevenue        float64 `json:"total_revenue"` // 总收入（从订单表统计）
	TaskStatistics      struct {
		Pending   int `json:"pending"`
		Running   int `json:"running"`
		Completed int `json:"completed"`
		Failed    int `json:"failed"`
	} `json:"task_statistics"`
	SubscriptionStatistics struct {
		Basic      int `json:"basic"`
		Pro        int `json:"pro"`
		Enterprise int `json:"enterprise"`
	} `json:"subscription_statistics"`
	DateRange struct {
		Start time.Time `json:"start"`
		End   time.Time `json:"end"`
	} `json:"date_range"`
}

// TaskStatistics 任务统计信息
type TaskStatistics struct {
	Total     int            `json:"total"`
	ByStatus  map[string]int `json:"by_status"`
	ByUser    map[string]int `json:"by_user"` // 用户ID -> 任务数
	DateRange struct {
		Start time.Time `json:"start"`
		End   time.Time `json:"end"`
	} `json:"date_range"`
}

// SubscriptionStatistics 订阅统计信息
type SubscriptionStatistics struct {
	Total      int            `json:"total"`
	ByStatus   map[string]int `json:"by_status"`
	ByPlanType map[string]int `json:"by_plan_type"`
}
