package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"web-checkly/models"
)

// CreateTask 创建任务到数据库
func CreateTask(task *models.Task) error {
	// 序列化 options
	optionsJSON, err := json.Marshal(task.Options)
	if err != nil {
		return fmt.Errorf("failed to marshal options: %w", err)
	}

	// 序列化 progress
	progressJSON, err := json.Marshal(task.Progress)
	if err != nil {
		return fmt.Errorf("failed to marshal progress: %w", err)
	}

	// 序列化 modules
	modulesJSON, err := json.Marshal(task.Modules)
	if err != nil {
		return fmt.Errorf("failed to marshal modules: %w", err)
	}

	// 序列化 results（如果存在）
	var resultsJSON interface{}
	if task.Results != nil {
		resultsBytes, err := json.Marshal(task.Results)
		if err != nil {
			return fmt.Errorf("failed to marshal results: %w", err)
		}
		resultsJSON = string(resultsBytes)
	} else {
		resultsJSON = nil
	}

	// 处理 user_id（可能为 nil）
	var userIDPtr interface{}
	if task.UserID != nil {
		userIDPtr = *task.UserID
	} else {
		userIDPtr = nil
	}

	query := `
		INSERT INTO tasks (
			id, user_id, status, target_url, options, language, ai_mode,
			is_public, progress, modules, results, error,
			created_at, updated_at, started_at, completed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`

	_, err = DB.Exec(
		query,
		task.ID,
		userIDPtr,
		string(task.Status),
		task.TargetURL,
		string(optionsJSON),
		task.Language,
		task.AIMode,
		task.IsPublic,
		string(progressJSON),
		string(modulesJSON),
		resultsJSON,
		task.Error,
		task.CreatedAt,
		task.UpdatedAt,
		task.StartedAt,
		task.CompletedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create task: %w", err)
	}

	return nil
}

// GetTask 从数据库获取任务
func GetTask(taskID string) (*models.Task, error) {
	var task models.Task
	var userID sql.NullString
	var optionsJSON, progressJSON, modulesJSON sql.NullString
	var resultsJSON sql.NullString
	var startedAt, completedAt sql.NullTime

	query := `
		SELECT id, user_id, status, target_url, options, language, ai_mode,
		       is_public, progress, modules, results, error,
		       created_at, updated_at, started_at, completed_at
		FROM tasks
		WHERE id = $1
	`

	err := DB.QueryRow(query, taskID).Scan(
		&task.ID,
		&userID,
		&task.Status,
		&task.TargetURL,
		&optionsJSON,
		&task.Language,
		&task.AIMode,
		&task.IsPublic,
		&progressJSON,
		&modulesJSON,
		&resultsJSON,
		&task.Error,
		&task.CreatedAt,
		&task.UpdatedAt,
		&startedAt,
		&completedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task not found: %s", taskID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	// 处理 user_id
	if userID.Valid {
		userIDStr := userID.String
		task.UserID = &userIDStr
	}

	// 反序列化 options
	if optionsJSON.Valid {
		if err := json.Unmarshal([]byte(optionsJSON.String), &task.Options); err != nil {
			return nil, fmt.Errorf("failed to unmarshal options: %w", err)
		}
	} else {
		task.Options = []string{}
	}

	// 反序列化 progress
	if progressJSON.Valid {
		if err := json.Unmarshal([]byte(progressJSON.String), &task.Progress); err != nil {
			return nil, fmt.Errorf("failed to unmarshal progress: %w", err)
		}
	}

	// 反序列化 modules
	if modulesJSON.Valid {
		if err := json.Unmarshal([]byte(modulesJSON.String), &task.Modules); err != nil {
			return nil, fmt.Errorf("failed to unmarshal modules: %w", err)
		}
	} else {
		task.Modules = make(map[string]*models.ModuleStatus)
	}

	// 反序列化 results
	if resultsJSON.Valid {
		var results models.TaskResults
		if err := json.Unmarshal([]byte(resultsJSON.String), &results); err != nil {
			return nil, fmt.Errorf("failed to unmarshal results: %w", err)
		}
		task.Results = &results
	}

	// 处理时间字段
	if startedAt.Valid {
		task.StartedAt = &startedAt.Time
	}
	if completedAt.Valid {
		task.CompletedAt = &completedAt.Time
	}

	return &task, nil
}

// UpdateTaskStatus 更新任务状态
func UpdateTaskStatus(taskID string, status models.TaskStatus) error {
	query := `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := DB.Exec(query, string(status), taskID)
	if err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}
	return nil
}

// UpdateTaskProgress 更新任务进度
func UpdateTaskProgress(taskID string, progress models.TaskProgress, modules map[string]*models.ModuleStatus) error {
	progressJSON, err := json.Marshal(progress)
	if err != nil {
		return fmt.Errorf("failed to marshal progress: %w", err)
	}

	modulesJSON, err := json.Marshal(modules)
	if err != nil {
		return fmt.Errorf("failed to marshal modules: %w", err)
	}

	query := `
		UPDATE tasks 
		SET progress = $1, modules = $2, updated_at = NOW()
		WHERE id = $3
	`
	_, err = DB.Exec(query, string(progressJSON), string(modulesJSON), taskID)
	if err != nil {
		return fmt.Errorf("failed to update task progress: %w", err)
	}
	return nil
}

// UpdateTaskResults 更新任务结果
func UpdateTaskResults(taskID string, results *models.TaskResults) error {
	resultsJSON, err := json.Marshal(results)
	if err != nil {
		return fmt.Errorf("failed to marshal results: %w", err)
	}

	now := time.Now()
	query := `
		UPDATE tasks 
		SET results = $1, status = 'completed', completed_at = $2, updated_at = $2
		WHERE id = $3
	`
	_, err = DB.Exec(query, string(resultsJSON), now, taskID)
	if err != nil {
		return fmt.Errorf("failed to update task results: %w", err)
	}

	log.Printf("[Database] Successfully updated task results for %s", taskID)
	return nil
}

// UpdateTaskResultsWithoutStatus 更新任务结果（不更新状态）
// 用于实时推送时更新结果，避免覆盖任务状态和已完成的结果字段
func UpdateTaskResultsWithoutStatus(taskID string, results *models.TaskResults) error {
	// 从数据库读取现有结果，合并而不是完全替换
	existingTask, err := GetTask(taskID)
	if err != nil {
		return fmt.Errorf("failed to get existing task: %w", err)
	}

	// 如果现有结果中有 link_health 等字段，保留它们
	if existingTask.Results != nil {
		// 保留已有的 link_health（如果新结果中没有）
		if results.LinkHealth == nil && existingTask.Results.LinkHealth != nil {
			results.LinkHealth = existingTask.Results.LinkHealth
		}
		// 保留其他已有字段
		if results.WebsiteInfo == nil && existingTask.Results.WebsiteInfo != nil {
			results.WebsiteInfo = existingTask.Results.WebsiteInfo
		}
		if results.DomainInfo == nil && existingTask.Results.DomainInfo != nil {
			results.DomainInfo = existingTask.Results.DomainInfo
		}
		if results.SSLInfo == nil && existingTask.Results.SSLInfo != nil {
			results.SSLInfo = existingTask.Results.SSLInfo
		}
		if results.TechStack == nil && existingTask.Results.TechStack != nil {
			results.TechStack = existingTask.Results.TechStack
		}
		if results.Performance == nil && existingTask.Results.Performance != nil {
			results.Performance = existingTask.Results.Performance
		}
		if results.SEOCompliance == nil && existingTask.Results.SEOCompliance != nil {
			results.SEOCompliance = existingTask.Results.SEOCompliance
		}
		if results.SecurityRisk == nil && existingTask.Results.SecurityRisk != nil {
			results.SecurityRisk = existingTask.Results.SecurityRisk
		}
		if results.Accessibility == nil && existingTask.Results.Accessibility != nil {
			results.Accessibility = existingTask.Results.Accessibility
		}
		if results.AIAnalysis == nil && existingTask.Results.AIAnalysis != nil {
			results.AIAnalysis = existingTask.Results.AIAnalysis
		}
		// 保留 summary（如果新结果中没有或为空）
		if results.Summary.Total == 0 && existingTask.Results.Summary.Total > 0 {
			results.Summary = existingTask.Results.Summary
		}
	}

	resultsJSON, err := json.Marshal(results)
	if err != nil {
		return fmt.Errorf("failed to marshal results: %w", err)
	}

	now := time.Now()
	query := `
		UPDATE tasks 
		SET results = $1, updated_at = $2
		WHERE id = $3
	`
	_, err = DB.Exec(query, string(resultsJSON), now, taskID)
	if err != nil {
		return fmt.Errorf("failed to update task results: %w", err)
	}

	return nil
}

// SetTaskError 设置任务错误
func SetTaskError(taskID string, errorMsg string) error {
	now := time.Now()
	query := `
		UPDATE tasks 
		SET error = $1, status = 'failed', completed_at = $2, updated_at = $2
		WHERE id = $3
	`
	_, err := DB.Exec(query, errorMsg, now, taskID)
	if err != nil {
		return fmt.Errorf("failed to set task error: %w", err)
	}
	return nil
}

// SetTaskStarted 设置任务开始时间
func SetTaskStarted(taskID string) error {
	now := time.Now()
	query := `UPDATE tasks SET started_at = $1, updated_at = $1 WHERE id = $2`
	_, err := DB.Exec(query, now, taskID)
	if err != nil {
		return fmt.Errorf("failed to set task started: %w", err)
	}
	return nil
}

// GetUserTasks 获取用户任务列表（支持筛选和搜索）
func GetUserTasks(userID string, limit, offset int, status, search string) ([]*models.Task, error) {
	argIndex := 1
	args := []interface{}{userID}

	query := `
		SELECT id, user_id, status, target_url, options, language, ai_mode,
		       is_public, progress, modules, results, error,
		       created_at, updated_at, started_at, completed_at
		FROM tasks
		WHERE user_id = $1
	`

	if status != "" {
		argIndex++
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
	}

	if search != "" {
		argIndex++
		query += fmt.Sprintf(" AND target_url ILIKE $%d", argIndex)
		args = append(args, "%"+search+"%")
	}

	query += " ORDER BY created_at DESC"
	argIndex++
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query user tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		var task models.Task
		var userIDStr sql.NullString
		var optionsJSON, progressJSON, modulesJSON sql.NullString
		var resultsJSON sql.NullString
		var startedAt, completedAt sql.NullTime

		err := rows.Scan(
			&task.ID,
			&userIDStr,
			&task.Status,
			&task.TargetURL,
			&optionsJSON,
			&task.Language,
			&task.AIMode,
			&task.IsPublic,
			&progressJSON,
			&modulesJSON,
			&resultsJSON,
			&task.Error,
			&task.CreatedAt,
			&task.UpdatedAt,
			&startedAt,
			&completedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}

		// 处理 user_id
		if userIDStr.Valid {
			userIDStrVal := userIDStr.String
			task.UserID = &userIDStrVal
		}

		// 反序列化 JSON 字段
		if optionsJSON.Valid {
			json.Unmarshal([]byte(optionsJSON.String), &task.Options)
		}
		if progressJSON.Valid {
			json.Unmarshal([]byte(progressJSON.String), &task.Progress)
		}
		if modulesJSON.Valid {
			json.Unmarshal([]byte(modulesJSON.String), &task.Modules)
		}
		if resultsJSON.Valid {
			var results models.TaskResults
			json.Unmarshal([]byte(resultsJSON.String), &results)
			task.Results = &results
		}

		if startedAt.Valid {
			task.StartedAt = &startedAt.Time
		}
		if completedAt.Valid {
			task.CompletedAt = &completedAt.Time
		}

		tasks = append(tasks, &task)
	}

	return tasks, nil
}

// DeleteExpiredTasks 删除过期任务（根据订阅套餐的保留期限）
func DeleteExpiredTasks() error {
	// 基础版：30天，专业版：90天，高级版：永久，免费用户：24小时
	query := `
		DELETE FROM tasks
		WHERE status IN ('completed', 'failed')
		AND completed_at IS NOT NULL
		AND (
			-- 免费用户：24小时
			((user_id IS NULL OR user_id NOT IN (SELECT user_id FROM subscriptions WHERE status = 'active'))
			 AND completed_at < NOW() - INTERVAL '24 hours')
			OR
			-- 基础版：30天
			(user_id IN (SELECT user_id FROM subscriptions WHERE status = 'active' AND plan_type = 'basic')
			 AND completed_at < NOW() - INTERVAL '30 days')
			OR
			-- 专业版：90天
			(user_id IN (SELECT user_id FROM subscriptions WHERE status = 'active' AND plan_type = 'pro')
			 AND completed_at < NOW() - INTERVAL '90 days')
		)
		-- 高级版（enterprise）：永久保留，不删除
	`

	result, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to delete expired tasks: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		fmt.Printf("[TaskCleanup] Deleted %d expired tasks\n", rowsAffected)
	}

	return nil
}

// CheckDuplicateTask 检查用户是否在指定时间内创建了相同URL和选项的任务
// 返回最近的任务ID（如果存在）和是否存在重复
func CheckDuplicateTask(userID string, targetURL string, optionsJSON string, withinSeconds int) (string, bool, error) {
	if userID == "" {
		// 匿名用户不检查重复
		return "", false, nil
	}

	query := fmt.Sprintf(`
		SELECT id FROM tasks
		WHERE user_id = $1 
		  AND target_url = $2 
		  AND options = $3
		  AND created_at > NOW() - INTERVAL '%d seconds'
		  AND status IN ('pending', 'running')
		ORDER BY created_at DESC
		LIMIT 1
	`, withinSeconds)

	var taskID string
	err := DB.QueryRow(query, userID, targetURL, optionsJSON).Scan(&taskID)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("failed to check duplicate task: %w", err)
	}

	return taskID, true, nil
}

// GetTaskCount 获取用户任务总数（支持筛选和搜索）
func GetTaskCount(userID string, status, search string) (int, error) {
	var count int
	argIndex := 1
	args := []interface{}{userID}

	query := `SELECT COUNT(*) FROM tasks WHERE user_id = $1`

	if status != "" {
		argIndex++
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
	}

	if search != "" {
		argIndex++
		query += fmt.Sprintf(" AND target_url ILIKE $%d", argIndex)
		args = append(args, "%"+search+"%")
	}

	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get task count: %w", err)
	}
	return count, nil
}

// DeleteUserTask 删除用户任务（只能删除自己的任务）
func DeleteUserTask(taskID string, userID string) error {
	query := `DELETE FROM tasks WHERE id = $1 AND user_id = $2`
	result, err := DB.Exec(query, taskID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("task not found or unauthorized")
	}
	return nil
}

// GetAllTasks 获取所有任务列表（管理员功能）
func GetAllTasks(limit, offset int, status, userID string) ([]*models.Task, error) {
	var query string
	var args []interface{}
	argIndex := 1

	// 构建动态查询
	query = `
		SELECT id, user_id, status, target_url, options, language, ai_mode,
		       is_public, progress, modules, results, error,
		       created_at, updated_at, started_at, completed_at
		FROM tasks
		WHERE 1=1
	`

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	if userID != "" {
		query += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, userID)
		argIndex++
	}

	query += " ORDER BY created_at DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query all tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		var task models.Task
		var userIDStr sql.NullString
		var optionsJSON, progressJSON, modulesJSON sql.NullString
		var resultsJSON sql.NullString
		var startedAt, completedAt sql.NullTime

		err := rows.Scan(
			&task.ID,
			&userIDStr,
			&task.Status,
			&task.TargetURL,
			&optionsJSON,
			&task.Language,
			&task.AIMode,
			&task.IsPublic,
			&progressJSON,
			&modulesJSON,
			&resultsJSON,
			&task.Error,
			&task.CreatedAt,
			&task.UpdatedAt,
			&startedAt,
			&completedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}

		// 处理 user_id
		if userIDStr.Valid {
			userIDStrVal := userIDStr.String
			task.UserID = &userIDStrVal
		}

		// 反序列化 JSON 字段
		if optionsJSON.Valid {
			json.Unmarshal([]byte(optionsJSON.String), &task.Options)
		}
		if progressJSON.Valid {
			json.Unmarshal([]byte(progressJSON.String), &task.Progress)
		}
		if modulesJSON.Valid {
			json.Unmarshal([]byte(modulesJSON.String), &task.Modules)
		}
		if resultsJSON.Valid {
			var results models.TaskResults
			json.Unmarshal([]byte(resultsJSON.String), &results)
			task.Results = &results
		}

		if startedAt.Valid {
			task.StartedAt = &startedAt.Time
		}
		if completedAt.Valid {
			task.CompletedAt = &completedAt.Time
		}

		tasks = append(tasks, &task)
	}

	return tasks, nil
}

// GetTaskCountAdmin 获取任务总数（管理员功能，支持筛选）
func GetTaskCountAdmin(status, userID string) (int, error) {
	var count int
	var query string
	var args []interface{}
	argIndex := 1

	query = `SELECT COUNT(*) FROM tasks WHERE 1=1`

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	if userID != "" {
		query += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, userID)
		argIndex++
	}

	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get task count: %w", err)
	}
	return count, nil
}

// DeleteTaskByID 管理员删除任务
func DeleteTaskByID(taskID string) error {
	query := `DELETE FROM tasks WHERE id = $1`
	_, err := DB.Exec(query, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}
	return nil
}
