package models

import "time"

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"   // 等待执行
	TaskStatusRunning   TaskStatus = "running"   // 执行中
	TaskStatusCompleted TaskStatus = "completed" // 已完成
	TaskStatusFailed    TaskStatus = "failed"    // 执行失败
)

// TaskProgress 任务进度
// @Description 任务执行进度信息
type TaskProgress struct {
	Current int `json:"current" example:"5"` // 当前进度
	Total   int `json:"total" example:"10"`  // 总进度
}

// ModuleStatus 模块执行状态
// @Description 单个检测模块的执行状态
type ModuleStatus struct {
	Name        string       `json:"name" example:"website-info"`                                       // 模块名称
	Status      TaskStatus   `json:"status" example:"running" enums:"pending,running,completed,failed"` // 模块状态
	Progress    TaskProgress `json:"progress"`                                                          // 模块进度
	Error       string       `json:"error,omitempty" example:""`                                        // 错误信息（如果有）
	StartedAt   *time.Time   `json:"started_at,omitempty" example:"2024-01-01T00:00:00Z"`               // 开始时间
	CompletedAt *time.Time   `json:"completed_at,omitempty" example:"2024-01-01T00:00:00Z"`             // 完成时间
}

// Task 扫描任务
type Task struct {
	ID          string     `json:"id"`                     // 任务ID
	Status      TaskStatus `json:"status"`                 // 任务状态
	CreatedAt   time.Time  `json:"created_at"`             // 创建时间
	UpdatedAt   time.Time  `json:"updated_at"`             // 更新时间
	StartedAt   *time.Time `json:"started_at,omitempty"`   // 开始执行时间
	CompletedAt *time.Time `json:"completed_at,omitempty"` // 完成时间

	// 任务参数
	TargetURL string   `json:"target_url"` // 目标URL
	Options   []string `json:"options"`    // 扫描选项
	Language  string   `json:"language"`   // 语言 (zh/en)
	AIMode    string   `json:"ai_mode"`    // AI分析模式

	// 用户关联（可选，允许匿名任务）
	UserID   *string `json:"user_id,omitempty"`   // 用户ID（UUID字符串）
	IsPublic bool    `json:"is_public,omitempty"` // 是否公开（预留功能）

	// 进度信息
	Progress TaskProgress             `json:"progress"` // 整体进度
	Modules  map[string]*ModuleStatus `json:"modules"`  // 各模块状态

	// 结果数据
	Results *TaskResults `json:"results,omitempty"` // 任务结果（完成后填充）

	// 错误信息
	Error string `json:"error,omitempty"` // 全局错误（如果有）
}

// TaskResults 任务结果聚合
// @Description 扫描任务的完整结果数据
type TaskResults struct {
	// 链接健康检查结果
	LinkHealth []HttpxResult `json:"link_health,omitempty"`

	// 基础信息
	WebsiteInfo *WebsiteInfo `json:"website_info,omitempty"`
	DomainInfo  *DomainInfo  `json:"domain_info,omitempty"`
	SSLInfo     *SSLInfo     `json:"ssl_info,omitempty"`
	TechStack   *TechStack   `json:"tech_stack,omitempty"`

	// Lighthouse 相关结果
	Performance   *PerformanceMetrics `json:"performance,omitempty"`
	SEOCompliance *SEOCompliance      `json:"seo_compliance,omitempty"`
	SecurityRisk  *SecurityRisk       `json:"security_risk,omitempty"`
	Accessibility *AccessibilityInfo  `json:"accessibility,omitempty"`

	// AI 分析
	AIAnalysis *AIAnalysis `json:"ai_analysis,omitempty"`

	// 新工具结果（使用interface{}以支持不同工具的输出格式）
	KatanaResults  interface{} `json:"katana_results,omitempty"`  // katana发现的页面和资源
	TestSSLResults interface{} `json:"testssl_results,omitempty"` // testssl HTTPS检测结果
	WhatWebResults interface{} `json:"whatweb_results,omitempty"` // whatweb技术栈检测结果

	// 统计信息
	Summary ScanSummary `json:"summary"`
}

// CreateTaskRequest 创建任务请求
// @Description 创建扫描任务的请求参数
type CreateTaskRequest struct {
	URL      string   `json:"url" example:"https://example.com"`                                                       // 目标URL
	Options  []string `json:"options" example:"website-info,domain-info"`                                              // 扫描选项
	Language string   `json:"language" example:"zh" enums:"zh,en" default:"zh"`                                        // 语言 (zh/en)
	AIMode   string   `json:"ai_mode" example:"balanced" enums:"performance,security,seo,balanced" default:"balanced"` // AI分析模式
}

// CreateTaskResponse 创建任务响应
// @Description 创建任务成功后的响应
type CreateTaskResponse struct {
	ID        string     `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Status    TaskStatus `json:"status" example:"pending" enums:"pending,running,completed,failed"`
	CreatedAt time.Time  `json:"created_at" example:"2024-01-01T00:00:00Z"`
}

// TaskStatusResponse 任务状态响应
// @Description 任务状态查询响应
type TaskStatusResponse struct {
	ID        string                   `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Status    TaskStatus               `json:"status" example:"running" enums:"pending,running,completed,failed"`
	CreatedAt time.Time                `json:"created_at" example:"2024-01-01T00:00:00Z"`
	UpdatedAt time.Time                `json:"updated_at" example:"2024-01-01T00:00:00Z"`
	TargetURL string                   `json:"target_url,omitempty" example:"https://example.com"` // 目标URL
	Progress  TaskProgress             `json:"progress"`
	Modules   map[string]*ModuleStatus `json:"modules"`
	Error     string                   `json:"error,omitempty" example:""`
}
