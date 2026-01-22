package services

import (
	"fmt"
	"log"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// TaskManager 任务管理器（使用数据库存储）
type TaskManager struct{}

// NewTaskManager 创建任务管理器
func NewTaskManager() *TaskManager {
	return &TaskManager{}
}

// CreateTask 创建新任务
// userID 可以为 nil（匿名任务）
func (tm *TaskManager) CreateTask(req *models.CreateTaskRequest, userID *string) (*models.Task, error) {
	// 生成任务ID
	taskID := uuid.New().String()

	// 解析选项，初始化模块状态
	modules := make(map[string]*models.ModuleStatus)
	options := req.Options
	if len(options) == 0 {
		options = []string{"link-health"} // 默认启用链接健康检查
	}

	// 根据选项初始化模块状态
	moduleNames := []string{
		"website-info", "domain-info", "ssl-info", "tech-stack",
		"link-health", "performance", "seo", "security", "accessibility",
		"ai-analysis",
	}

	for _, opt := range options {
		for _, name := range moduleNames {
			if opt == name {
				modules[name] = &models.ModuleStatus{
					Name:     name,
					Status:   models.TaskStatusPending,
					Progress: models.TaskProgress{Current: 0, Total: 0},
				}
			}
		}
	}

	// 如果启用了 performance/seo/security/accessibility，需要 lighthouse 模块
	needLighthouse := false
	for _, opt := range options {
		if opt == "performance" || opt == "seo" || opt == "security" || opt == "accessibility" {
			needLighthouse = true
			break
		}
	}
	if needLighthouse {
		modules["lighthouse"] = &models.ModuleStatus{
			Name:     "lighthouse",
			Status:   models.TaskStatusPending,
			Progress: models.TaskProgress{Current: 0, Total: 0},
		}
	}

	// 确定语言
	lang := req.Language
	if lang != "en" && lang != "zh" {
		lang = "zh" // 默认中文
	}

	// 确定 AI 模式
	aiMode := req.AIMode
	if aiMode != "performance" && aiMode != "security" && aiMode != "seo" && aiMode != "balanced" {
		aiMode = "balanced"
	}

	// 创建任务
	task := &models.Task{
		ID:        taskID,
		Status:    models.TaskStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		TargetURL: req.URL,
		Options:   options,
		Language:  lang,
		AIMode:    aiMode,
		UserID:    userID,
		IsPublic:  false,
		Progress:  models.TaskProgress{Current: 0, Total: 0},
		Modules:   modules,
	}

	// 存储任务到数据库
	if err := database.CreateTask(task); err != nil {
		return nil, fmt.Errorf("failed to save task to database: %w", err)
	}

	log.Printf("[TaskManager] Created task: %s for URL: %s", taskID, req.URL)
	return task, nil
}

// GetTask 获取任务
func (tm *TaskManager) GetTask(taskID string) (*models.Task, error) {
	return database.GetTask(taskID)
}

// GetTaskStatus 获取任务状态（不包含结果数据）
func (tm *TaskManager) GetTaskStatus(taskID string) (*models.TaskStatusResponse, error) {
	task, err := tm.GetTask(taskID)
	if err != nil {
		return nil, err
	}

	return &models.TaskStatusResponse{
		ID:        task.ID,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
		UpdatedAt: task.UpdatedAt,
		TargetURL: task.TargetURL,
		Progress:  task.Progress,
		Modules:   task.Modules,
		Error:     task.Error,
	}, nil
}

// GetTaskResults 获取任务结果
func (tm *TaskManager) GetTaskResults(taskID string) (*models.TaskResults, error) {
	task, err := tm.GetTask(taskID)
	if err != nil {
		return nil, err
	}

	if task.Results == nil {
		return nil, fmt.Errorf("task results not available yet")
	}

	return task.Results, nil
}

// UpdateTaskStatus 更新任务状态
func (tm *TaskManager) UpdateTaskStatus(taskID string, status models.TaskStatus) error {
	if err := database.UpdateTaskStatus(taskID, status); err != nil {
		return err
	}

	// 如果状态变为running，设置开始时间
	if status == models.TaskStatusRunning {
		if err := database.SetTaskStarted(taskID); err != nil {
			log.Printf("[TaskManager] Failed to set task started time: %v", err)
		}
	}

	return nil
}

// UpdateTaskProgress 更新任务进度
func (tm *TaskManager) UpdateTaskProgress(taskID string, current, total int) error {
	// 获取当前任务以获取modules
	task, err := database.GetTask(taskID)
	if err != nil {
		return err
	}

	progress := models.TaskProgress{Current: current, Total: total}
	return database.UpdateTaskProgress(taskID, progress, task.Modules)
}

// UpdateModuleStatus 更新模块状态
func (tm *TaskManager) UpdateModuleStatus(taskID, moduleName string, status models.TaskStatus, errorMsg string) error {
	// 获取当前任务
	task, err := database.GetTask(taskID)
	if err != nil {
		return err
	}

	// 更新模块状态
	module, ok := task.Modules[moduleName]
	if !ok {
		// 如果模块不存在，创建它
		module = &models.ModuleStatus{
			Name:     moduleName,
			Status:   status,
			Progress: models.TaskProgress{Current: 0, Total: 0},
		}
		task.Modules[moduleName] = module
	}

	module.Status = status
	module.Error = errorMsg

	if status == models.TaskStatusRunning && module.StartedAt == nil {
		now := time.Now()
		module.StartedAt = &now
	}

	if status == models.TaskStatusCompleted || status == models.TaskStatusFailed {
		now := time.Now()
		module.CompletedAt = &now
	}

	// 更新到数据库
	return database.UpdateTaskProgress(taskID, task.Progress, task.Modules)
}

// UpdateModuleProgress 更新模块进度
func (tm *TaskManager) UpdateModuleProgress(taskID, moduleName string, current, total int) error {
	// 获取当前任务
	task, err := database.GetTask(taskID)
	if err != nil {
		return err
	}

	// 更新模块进度
	module, ok := task.Modules[moduleName]
	if !ok {
		module = &models.ModuleStatus{
			Name:     moduleName,
			Status:   models.TaskStatusRunning,
			Progress: models.TaskProgress{Current: current, Total: total},
		}
		task.Modules[moduleName] = module
	}

	module.Progress.Current = current
	module.Progress.Total = total

	// 更新到数据库
	return database.UpdateTaskProgress(taskID, task.Progress, task.Modules)
}

// SetTaskResults 设置任务结果
func (tm *TaskManager) SetTaskResults(taskID string, results *models.TaskResults) error {
	return database.UpdateTaskResults(taskID, results)
}

// AppendKatanaResult 追加katana发现的链接（用于实时推送）
// 注意：这个方法主要用于实时推送，实际结果最终通过SetTaskResults保存
// 重要：此方法只更新 katana_results 字段，不会覆盖其他字段（如 link_health）
func (tm *TaskManager) AppendKatanaResult(taskID string, result interface{}) error {
	// 获取当前任务
	task, err := database.GetTask(taskID)
	if err != nil {
		return err
	}

	// 初始化结果对象（如果不存在）
	if task.Results == nil {
		task.Results = &models.TaskResults{
			Summary: models.ScanSummary{},
		}
	}

	// 保存现有的 link_health 和其他字段，避免被覆盖
	existingLinkHealth := task.Results.LinkHealth
	existingWebsiteInfo := task.Results.WebsiteInfo
	existingDomainInfo := task.Results.DomainInfo
	existingSSLInfo := task.Results.SSLInfo
	existingTechStack := task.Results.TechStack
	existingPerformance := task.Results.Performance
	existingSEOCompliance := task.Results.SEOCompliance
	existingSecurityRisk := task.Results.SecurityRisk
	existingAccessibility := task.Results.Accessibility
	existingAIAnalysis := task.Results.AIAnalysis
	existingSummary := task.Results.Summary

	// 追加katana结果
	if task.Results.KatanaResults == nil {
		task.Results.KatanaResults = []interface{}{}
	}

	if katanaResults, ok := task.Results.KatanaResults.([]interface{}); ok {
		task.Results.KatanaResults = append(katanaResults, result)
	} else {
		// 如果不是数组，转换为数组
		task.Results.KatanaResults = []interface{}{task.Results.KatanaResults, result}
	}

	// 恢复其他字段，确保不会被覆盖
	task.Results.LinkHealth = existingLinkHealth
	task.Results.WebsiteInfo = existingWebsiteInfo
	task.Results.DomainInfo = existingDomainInfo
	task.Results.SSLInfo = existingSSLInfo
	task.Results.TechStack = existingTechStack
	task.Results.Performance = existingPerformance
	task.Results.SEOCompliance = existingSEOCompliance
	task.Results.SecurityRisk = existingSecurityRisk
	task.Results.Accessibility = existingAccessibility
	task.Results.AIAnalysis = existingAIAnalysis
	task.Results.Summary = existingSummary

	// 更新到数据库（注意：频繁更新可能影响性能，可以考虑批量更新）
	// 注意：这里不更新 status，因为任务可能还在运行中
	return database.UpdateTaskResultsWithoutStatus(taskID, task.Results)
}

// SetTaskError 设置任务错误
func (tm *TaskManager) SetTaskError(taskID string, errorMsg string) error {
	return database.SetTaskError(taskID, errorMsg)
}

// GetUserTasks 获取用户任务列表（支持筛选和搜索）
func (tm *TaskManager) GetUserTasks(userID string, limit, offset int, status, search string) ([]*models.Task, error) {
	return database.GetUserTasks(userID, limit, offset, status, search)
}
