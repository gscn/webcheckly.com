package services

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"time"
	"web-checkly/database"
	"web-checkly/models"
	"web-checkly/services/plugin"
)

// Executor 任务执行器
type Executor struct {
	taskManager *TaskManager
	maxWorkers  int
	workerPool  chan struct{}
	// 动态并发控制：根据系统负载调整
	currentLoad int
	mu          sync.RWMutex
}

// NewExecutor 创建任务执行器
func NewExecutor(taskManager *TaskManager, maxWorkers int) *Executor {
	if maxWorkers <= 0 {
		maxWorkers = 3 // 默认3个并发任务
	}
	executor := &Executor{
		taskManager: taskManager,
		maxWorkers:  maxWorkers,
		workerPool:  make(chan struct{}, maxWorkers),
		currentLoad: 0,
	}
	// 启动动态负载监控
	go executor.monitorLoad()
	return executor
}

// monitorLoad 监控系统负载并动态调整并发数
func (e *Executor) monitorLoad() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		e.mu.Lock()
		currentLoad := e.currentLoad
		e.mu.Unlock()

		// 根据当前负载调整最大并发数
		// 如果负载过高，减少并发；如果负载较低，可以适当增加
		if currentLoad > e.maxWorkers*2 {
			// 负载过高，暂时不调整（避免频繁变化）
			log.Printf("[Executor] High load detected: %d active tasks", currentLoad)
		}
	}
}

// getAvailableWorkers 获取当前可用的worker数量
func (e *Executor) getAvailableWorkers() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.maxWorkers - len(e.workerPool)
}

// ExecuteTask 异步执行任务
func (e *Executor) ExecuteTask(ctx context.Context, taskID string) {
	// 更新负载计数
	e.mu.Lock()
	e.currentLoad++
	e.mu.Unlock()
	defer func() {
		e.mu.Lock()
		e.currentLoad--
		e.mu.Unlock()
	}()

	// 获取 worker（带超时机制，避免无限等待）
	select {
	case e.workerPool <- struct{}{}:
		// 成功获取worker
		defer func() { <-e.workerPool }()
	case <-ctx.Done():
		// 上下文已取消或超时
		log.Printf("[Executor] Context cancelled or timeout while waiting for worker: %v", ctx.Err())
		e.taskManager.SetTaskError(taskID, fmt.Sprintf("Service busy: unable to acquire worker (context: %v)", ctx.Err()))
		e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed)
		return
	case <-time.After(30 * time.Second):
		// 等待worker超时（30秒）
		log.Printf("[Executor] Timeout waiting for worker pool (task: %s)", taskID)
		e.taskManager.SetTaskError(taskID, "Service busy: unable to acquire worker (timeout after 30s)")
		e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed)
		return
	}

	// 添加 panic 恢复机制，确保单个任务失败不会导致整个服务崩溃
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Executor] PANIC recovered in task %s: %v", taskID, r)
			errorMsg := fmt.Sprintf("Internal error: %v", r)
			e.taskManager.SetTaskError(taskID, errorMsg)
			e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed)
			// 删除使用记录（因为还没有扣除积分）
			deleteTaskUsageRecords(taskID)
		}
	}()

	// 更新任务状态为运行中
	if err := e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusRunning); err != nil {
		log.Printf("[Executor] Error updating task status: %v", err)
		e.taskManager.SetTaskError(taskID, fmt.Sprintf("Failed to update task status: %v", err))
		e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed)
		return
	}

	log.Printf("[Executor] Starting task execution: %s", taskID)

	// 获取任务
	task, err := e.taskManager.GetTask(taskID)
	if err != nil {
		log.Printf("[Executor] Error getting task: %v", err)
		e.taskManager.SetTaskError(taskID, fmt.Sprintf("Failed to get task: %v", err))
		e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed)
		return
	}

	// 创建结果对象
	results := &models.TaskResults{
		Summary: models.ScanSummary{},
	}

	// 构建插件输入选项
	pluginOptions := make(map[string]interface{})
	pluginOptions["urls"] = []string{} // Httpx 插件需要 URL 列表，稍后填充

	// 确定需要执行的插件
	pluginsToExecute := e.determinePlugins(task)

	// 检查是否有插件需要执行
	if len(pluginsToExecute) == 0 {
		log.Printf("[Executor] No plugins to execute for task %s", taskID)
		e.taskManager.SetTaskError(taskID, "No plugins selected for execution")
		e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed)
		deleteTaskUsageRecords(taskID)
		return
	}

	// 执行插件（处理依赖关系）
	// 注意：executePlugins 总是返回 nil，即使部分插件失败也会继续执行
	pluginResults := make(map[string]*plugin.PluginOutput)
	err = e.executePlugins(ctx, taskID, task, pluginsToExecute, pluginOptions, pluginResults)
	if err != nil {
		log.Printf("[Executor] Error executing plugins: %v", err)
		// 即使有错误，也继续聚合已有结果
	}

	// 聚合插件结果到 TaskResults（即使部分插件失败，也聚合成功的结果）
	e.aggregateResults(pluginResults, results, task)

	// 设置任务结果
	if err := e.taskManager.SetTaskResults(taskID, results); err != nil {
		log.Printf("[Executor] Error setting task results: %v", err)
	} else {
		log.Printf("[Executor] Successfully saved task results for %s", taskID)
	}

	// 检查是否有任何成功的插件
	hasSuccess := false
	for _, output := range pluginResults {
		if output != nil && output.Success {
			hasSuccess = true
			break
		}
	}

	// 更新任务状态
	if hasSuccess {
		// 至少有一个插件成功，标记为已完成（即使部分失败）
		if err := e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusCompleted); err != nil {
			log.Printf("[Executor] Error updating task status: %v", err)
		}
		// 任务完成，扣除积分
		if err := BatchDeductCreditsForTask(taskID); err != nil {
			log.Printf("[Executor] Failed to deduct credits for completed task %s: %v", taskID, err)
			// 即使扣除失败，也不影响任务完成状态（可以后续手动处理）
		} else {
			log.Printf("[Executor] Successfully deducted credits for completed task %s", taskID)
		}
		log.Printf("[Executor] Task completed (with partial results): %s", taskID)
	} else {
		// 所有插件都失败，删除使用记录（因为还没有扣除积分）
		deleteTaskUsageRecords(taskID)
		// 收集所有失败的错误信息
		errorMessages := []string{}
		for name, output := range pluginResults {
			if output != nil && !output.Success && output.Error != "" {
				errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", name, output.Error))
			}
		}
		errorMsg := "All plugins failed"
		if len(errorMessages) > 0 {
			errorMsg = strings.Join(errorMessages, "; ")
		}
		// 设置错误信息
		e.taskManager.SetTaskError(taskID, errorMsg)
		// 更新任务状态为失败
		if err := e.taskManager.UpdateTaskStatus(taskID, models.TaskStatusFailed); err != nil {
			log.Printf("[Executor] Error updating task status: %v", err)
		}
		log.Printf("[Executor] Task failed (all plugins failed): %s, errors: %s", taskID, errorMsg)
	}
}

// deleteTaskUsageRecords 删除任务相关的使用记录（任务失败时调用，因为还没有扣除积分）
func deleteTaskUsageRecords(taskID string) {
	// 删除任务关联的使用记录（因为还没有扣除积分，所以只需要删除记录）
	query := `DELETE FROM usage_records WHERE task_id = $1 AND is_refunded = false`

	result, err := database.GetDB().Exec(query, taskID)
	if err != nil {
		log.Printf("[Executor] Failed to delete usage records for task %s: %v", taskID, err)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("[Executor] Failed to get rows affected: %v", err)
	} else {
		log.Printf("[Executor] Deleted %d usage records for failed task %s", rowsAffected, taskID)
	}
}

// refundTaskCosts 退回任务相关的费用（任务失败时调用，已废弃，改用deleteTaskUsageRecords）
// 保留此函数以保持向后兼容，但实际不会扣除积分（因为新逻辑在任务完成时才扣除）
func refundTaskCosts(taskID string) {
	// 新逻辑：因为积分在任务完成时才扣除，所以任务失败时只需要删除使用记录
	deleteTaskUsageRecords(taskID)
}

// determinePlugins 根据任务选项确定需要执行的插件
func (e *Executor) determinePlugins(task *models.Task) []string {
	plugins := []string{}

	// 基础信息插件
	if containsString(task.Options, "website-info") {
		plugins = append(plugins, "website-info")
	}
	if containsString(task.Options, "domain-info") {
		plugins = append(plugins, "domain-info")
	}
	if containsString(task.Options, "ssl-info") {
		plugins = append(plugins, "ssl-info")
	}
	if containsString(task.Options, "tech-stack") {
		plugins = append(plugins, "tech-stack")
	}

	// Lighthouse 相关插件
	if containsString(task.Options, "performance") || containsString(task.Options, "seo") ||
		containsString(task.Options, "security") || containsString(task.Options, "accessibility") {
		plugins = append(plugins, "lighthouse")
	}

	// 链接健康检查
	// 注意：如果同时选择了 link-health 和 katana，只执行 katana（全站链接检查），跳过 link-health
	hasKatana := containsString(task.Options, "katana")
	if containsString(task.Options, "link-health") && !hasKatana {
		plugins = append(plugins, "link-health")
	}

	// AI 分析
	if containsString(task.Options, "ai-analysis") {
		plugins = append(plugins, "ai-analysis")
	}

	// 新工具插件
	if hasKatana {
		plugins = append(plugins, "katana")
	}
	// 网站链接深度检查仅使用 katana

	return plugins
}

// executePlugins 执行插件（处理依赖关系）
func (e *Executor) executePlugins(
	ctx context.Context,
	taskID string,
	task *models.Task,
	pluginNames []string,
	pluginOptions map[string]interface{},
	results map[string]*plugin.PluginOutput,
) error {
	// 构建插件输入
	input := &plugin.PluginInput{
		TaskID:    taskID,
		TargetURL: task.TargetURL,
		Language:  task.Language,
		Options:   pluginOptions,
	}

	// 为katana插件传递taskManager以支持实时推送
	if containsString(pluginNames, "katana") {
		pluginOptions["taskManager"] = e.taskManager
	}

	// 第一阶段：执行基础插件（无依赖）
	basePlugins := []string{"website-info", "domain-info", "ssl-info", "tech-stack", "katana"}
	var wg sync.WaitGroup
	baseResults := make(map[string]*plugin.PluginOutput)
	var baseMu sync.Mutex

	for _, name := range pluginNames {
		if containsString(basePlugins, name) {
			wg.Add(1)
			go func(pluginName string) {
				// 每个插件独立执行，添加 panic 恢复
				defer func() {
					if r := recover(); r != nil {
						log.Printf("[Executor] PANIC recovered in plugin %s: %v", pluginName, r)
						baseMu.Lock()
						baseResults[pluginName] = &plugin.PluginOutput{
							Success: false,
							Error:   fmt.Sprintf("Plugin panic: %v", r),
						}
						baseMu.Unlock()
						e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusFailed, fmt.Sprintf("Plugin panic: %v", r))
					}
					wg.Done()
				}()
				e.executeSinglePlugin(ctx, taskID, pluginName, input, baseResults, &baseMu)
			}(name)
		}
	}
	wg.Wait()

	// 将基础结果添加到 pluginOptions，供后续插件使用
	for name, output := range baseResults {
		if output.Success {
			results[name] = output
			// 根据插件名称设置对应的选项
			switch name {
			case "website-info":
				if info, ok := output.Data.(*models.WebsiteInfo); ok {
					pluginOptions["website_info"] = info
				}
			case "domain-info":
				if info, ok := output.Data.(*models.DomainInfo); ok {
					pluginOptions["domain_info"] = info
				}
			case "ssl-info":
				if info, ok := output.Data.(*models.SSLInfo); ok {
					pluginOptions["ssl_info"] = info
				}
			case "tech-stack":
				if info, ok := output.Data.(*models.TechStack); ok {
					pluginOptions["tech_stack"] = info
				}
			}
		}
	}

	// 第二阶段：执行 Lighthouse（如果需要）
	// 即使 Lighthouse 失败，也不影响后续阶段
	if containsString(pluginNames, "lighthouse") {
		// 设置 Lighthouse 选项
		lighthouseOptions := make(map[string]interface{})
		needsPerformance := containsString(task.Options, "performance")
		needsSEO := containsString(task.Options, "seo")
		needsSecurity := containsString(task.Options, "security")
		needsAccessibility := containsString(task.Options, "accessibility")

		lighthouseOptions["performance"] = needsPerformance
		lighthouseOptions["seo"] = needsSEO
		lighthouseOptions["security"] = needsSecurity
		lighthouseOptions["accessibility"] = needsAccessibility

		// 为子模块设置初始状态（pending）
		if needsPerformance {
			e.taskManager.UpdateModuleStatus(taskID, "performance", models.TaskStatusPending, "")
		}
		if needsSEO {
			e.taskManager.UpdateModuleStatus(taskID, "seo", models.TaskStatusPending, "")
		}
		if needsSecurity {
			e.taskManager.UpdateModuleStatus(taskID, "security", models.TaskStatusPending, "")
		}
		if needsAccessibility {
			e.taskManager.UpdateModuleStatus(taskID, "accessibility", models.TaskStatusPending, "")
		}

		lighthouseInput := &plugin.PluginInput{
			TaskID:    taskID,
			TargetURL: task.TargetURL,
			Language:  task.Language,
			Options:   lighthouseOptions,
		}

		// 使用 defer recover 保护，确保 Lighthouse 失败不影响后续阶段
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[Executor] PANIC recovered in lighthouse plugin: %v", r)
					e.taskManager.UpdateModuleStatus(taskID, "lighthouse", models.TaskStatusFailed, fmt.Sprintf("Plugin panic: %v", r))
					// 更新所有子模块状态为失败
					if needsPerformance {
						e.taskManager.UpdateModuleStatus(taskID, "performance", models.TaskStatusFailed, fmt.Sprintf("Lighthouse panic: %v", r))
					}
					if needsSEO {
						e.taskManager.UpdateModuleStatus(taskID, "seo", models.TaskStatusFailed, fmt.Sprintf("Lighthouse panic: %v", r))
					}
					if needsSecurity {
						e.taskManager.UpdateModuleStatus(taskID, "security", models.TaskStatusFailed, fmt.Sprintf("Lighthouse panic: %v", r))
					}
					if needsAccessibility {
						e.taskManager.UpdateModuleStatus(taskID, "accessibility", models.TaskStatusFailed, fmt.Sprintf("Lighthouse panic: %v", r))
					}
				}
			}()
			output, err := e.executeSinglePluginSync(ctx, taskID, "lighthouse", lighthouseInput)
			if err == nil && output != nil && output.Success {
				results["lighthouse"] = output

				// 提取 Lighthouse 子任务结果，并为每个子模块单独更新状态
				if lighthouseData, ok := output.Data.(map[string]interface{}); ok {
					// Performance
					if perf, ok := lighthouseData["performance"].(*models.PerformanceMetrics); ok {
						pluginOptions["performance"] = perf
						results["performance"] = &plugin.PluginOutput{Success: true, Data: perf}
						// 更新 performance 模块状态
						e.taskManager.UpdateModuleStatus(taskID, "performance", models.TaskStatusCompleted, "")
						// 立即保存 performance 结果
						partialResults := &models.TaskResults{Performance: perf}
						if err := database.UpdateTaskResultsWithoutStatus(taskID, partialResults); err != nil {
							log.Printf("[Executor] Failed to save performance results: %v", err)
						} else {
							log.Printf("[Executor] Saved performance results")
						}
					}
					// SEO
					if seo, ok := lighthouseData["seo"].(*models.SEOCompliance); ok {
						pluginOptions["seo"] = seo
						results["seo"] = &plugin.PluginOutput{Success: true, Data: seo}
						// 更新 seo 模块状态
						e.taskManager.UpdateModuleStatus(taskID, "seo", models.TaskStatusCompleted, "")
						// 立即保存 seo 结果
						partialResults := &models.TaskResults{SEOCompliance: seo}
						if err := database.UpdateTaskResultsWithoutStatus(taskID, partialResults); err != nil {
							log.Printf("[Executor] Failed to save seo results: %v", err)
						} else {
							log.Printf("[Executor] Saved seo results")
						}
					}
					// Security
					if sec, ok := lighthouseData["security"].(*models.SecurityRisk); ok {
						pluginOptions["security"] = sec
						results["security"] = &plugin.PluginOutput{Success: true, Data: sec}
						// 更新 security 模块状态
						e.taskManager.UpdateModuleStatus(taskID, "security", models.TaskStatusCompleted, "")
						// 立即保存 security 结果
						partialResults := &models.TaskResults{SecurityRisk: sec}
						if err := database.UpdateTaskResultsWithoutStatus(taskID, partialResults); err != nil {
							log.Printf("[Executor] Failed to save security results: %v", err)
						} else {
							log.Printf("[Executor] Saved security results")
						}
					}
					// Accessibility
					if acc, ok := lighthouseData["accessibility"].(*models.AccessibilityInfo); ok {
						pluginOptions["accessibility"] = acc
						results["accessibility"] = &plugin.PluginOutput{Success: true, Data: acc}
						// 更新 accessibility 模块状态
						e.taskManager.UpdateModuleStatus(taskID, "accessibility", models.TaskStatusCompleted, "")
						// 立即保存 accessibility 结果
						partialResults := &models.TaskResults{Accessibility: acc}
						if err := database.UpdateTaskResultsWithoutStatus(taskID, partialResults); err != nil {
							log.Printf("[Executor] Failed to save accessibility results: %v", err)
						} else {
							log.Printf("[Executor] Saved accessibility results")
						}
					}
				}
			} else {
				// Lighthouse 执行失败，更新所有子模块状态为失败
				if err != nil {
					errorMsg := err.Error()
					if output != nil && output.Error != "" {
						errorMsg = output.Error
					}
					// 根据选项更新对应子模块的状态
					if containsString(task.Options, "performance") {
						e.taskManager.UpdateModuleStatus(taskID, "performance", models.TaskStatusFailed, errorMsg)
					}
					if containsString(task.Options, "seo") {
						e.taskManager.UpdateModuleStatus(taskID, "seo", models.TaskStatusFailed, errorMsg)
					}
					if containsString(task.Options, "security") {
						e.taskManager.UpdateModuleStatus(taskID, "security", models.TaskStatusFailed, errorMsg)
					}
					if containsString(task.Options, "accessibility") {
						e.taskManager.UpdateModuleStatus(taskID, "accessibility", models.TaskStatusFailed, errorMsg)
					}
				}
			}
		}()
	}

	// 第三阶段：执行链接健康检查（使用 Katana + httpx）
	// 即使 link-health 失败，也不影响后续阶段
	// 注意：如果同时选择了 link-health 和 katana，只执行 katana（全站链接检查），跳过 link-health
	if containsString(pluginNames, "link-health") && !containsString(pluginNames, "katana") {
		// 使用 defer recover 保护，确保 URL 提取或 httpx 失败不影响后续阶段
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[Executor] PANIC recovered in link-health plugin: %v", r)
					e.taskManager.UpdateModuleStatus(taskID, "link-health", models.TaskStatusFailed, fmt.Sprintf("Plugin panic: %v", r))
				}
			}()

			// 使用 Katana 提取当前页面的链接和资源（仅限当前页面，不进行深度爬取）
			// depth=1 确保只爬取当前页面，不跟随链接到其他页面
			log.Printf("[Executor] Using Katana to extract URLs from current page only (depth=1) for link-health check")

			// 创建子context用于Katana（避免超时影响主任务）
			katanaCtx, katanaCancel := context.WithTimeout(ctx, 60*time.Second)
			defer katanaCancel()

			// 使用 depth=1 限制只爬取当前页面，不进行深度爬取
			katanaResults, err := RunKatana(katanaCtx, task.TargetURL, taskID, e.taskManager, 1)
			if err != nil {
				log.Printf("[Executor] Katana failed to extract URLs: %v", err)
				errorMsg := fmt.Sprintf("Katana failed: %v", err)
				e.taskManager.UpdateModuleStatus(taskID, "link-health", models.TaskStatusFailed, errorMsg)
				// 即使失败，也要将失败结果添加到results，确保任务不会因为缺少结果而失败
				results["link-health"] = &plugin.PluginOutput{
					Success: false,
					Error:   errorMsg,
				}
				return
			}

			// 从 Katana 结果中提取 URL 列表并去重
			// 注意：link-health 检查应该包括页面上所有链接，包括外部链接（跨域链接）
			urlMap := make(map[string]bool)
			urls := make([]string, 0)
			skippedCount := 0
			sameDomainCount := 0
			crossDomainCount := 0

			// 解析目标URL的域名，用于统计（但不用于过滤）
			targetURLParsed, err := url.Parse(task.TargetURL)
			var targetHostname string
			if err == nil {
				targetHostname = strings.ToLower(targetURLParsed.Hostname())
			}

			for _, result := range katanaResults {
				if result.URL == "" {
					skippedCount++
					continue
				}

				// 解析URL以检查域名（用于统计）
				resultURLParsed, err := url.Parse(result.URL)
				if err != nil {
					skippedCount++
					continue
				}

				resultHostname := strings.ToLower(resultURLParsed.Hostname())

				// 统计同域和跨域链接
				if targetHostname != "" && resultHostname == targetHostname {
					sameDomainCount++
				} else if resultHostname != "" {
					crossDomainCount++
				}

				// 规范化URL用于去重（保留查询参数和路径，只移除尾部斜杠）
				// 注意：对于带查询参数的URL，不应该移除尾部斜杠，因为 /path?query 和 /path/?query 是不同的
				normalized := result.URL
				// 只对没有查询参数的URL移除尾部斜杠
				if !strings.Contains(normalized, "?") && !strings.Contains(normalized, "#") {
					normalized = strings.TrimRight(strings.ToLower(normalized), "/")
				} else {
					normalized = strings.ToLower(normalized)
				}

				if !urlMap[normalized] {
					urlMap[normalized] = true
					urls = append(urls, result.URL) // 保留原始URL格式
				}
			}

			log.Printf("[Executor] Katana extracted %d unique URLs from current page (from %d results, skipped %d invalid, same-domain: %d, cross-domain: %d)",
				len(urls), len(katanaResults), skippedCount, sameDomainCount, crossDomainCount)

			if len(urls) > 0 {
				pluginOptions["urls"] = urls

				httpxInput := &plugin.PluginInput{
					TaskID:    taskID,
					TargetURL: task.TargetURL,
					Language:  task.Language,
					Options:   pluginOptions,
				}

				output, err := e.executeSinglePluginSync(ctx, taskID, "link-health", httpxInput)
				if err != nil {
					log.Printf("[Executor] link-health plugin execution error: %v", err)
				} else if output != nil {
					log.Printf("[Executor] link-health plugin output: Success=%v, Error=%v, Data type=%T", output.Success, output.Error, output.Data)
					if output.Success {
						if linkResults, ok := output.Data.([]models.HttpxResult); ok {
							log.Printf("[Executor] link-health plugin returned %d results", len(linkResults))
							results["link-health"] = output
							pluginOptions["link_health"] = linkResults

							// 更新摘要
							alive := 0
							totalResponse := 0
							for _, r := range linkResults {
								if r.StatusCode > 0 && r.StatusCode < 400 {
									alive++
								}
								if r.ResponseTime > 0 {
									totalResponse += r.ResponseTime
								}
							}
							avgResponse := 0
							if len(linkResults) > 0 {
								avgResponse = totalResponse / len(linkResults)
							}
							pluginOptions["summary"] = models.ScanSummary{
								Total:       len(linkResults),
								Alive:       alive,
								Dead:        len(linkResults) - alive,
								AvgResponse: avgResponse,
								Timeout:     false,
							}
						} else {
							log.Printf("[Executor] link-health plugin output data type assertion failed: expected []models.HttpxResult, got %T", output.Data)
						}
					} else {
						log.Printf("[Executor] link-health plugin output marked as not successful: %v", output.Error)
					}
				} else {
					log.Printf("[Executor] Httpx check failed: %v", err)
					errorMsg := "Httpx check failed"
					if err != nil {
						errorMsg = fmt.Sprintf("Httpx check failed: %v", err)
					} else if output != nil && output.Error != "" {
						errorMsg = output.Error
					}
					e.taskManager.UpdateModuleStatus(taskID, "link-health", models.TaskStatusFailed, errorMsg)
					// 即使失败，也要将失败结果添加到results，确保任务不会因为缺少结果而失败
					results["link-health"] = &plugin.PluginOutput{
						Success: false,
						Error:   errorMsg,
					}
				}
			} else {
				log.Printf("[Executor] No URLs found by Katana for link-health check")
				errorMsg := "No URLs found by Katana"
				e.taskManager.UpdateModuleStatus(taskID, "link-health", models.TaskStatusFailed, errorMsg)
				// 即使失败，也要将失败结果添加到results，确保任务不会因为缺少结果而失败
				results["link-health"] = &plugin.PluginOutput{
					Success: false,
					Error:   errorMsg,
				}
			}
		}()
	}

	// 第四阶段：执行 AI 分析（依赖其他所有结果）
	// 确保其他模块都已完成或失败后再执行AI分析
	// 即使 AI 分析失败，也不影响任务完成（其他结果仍然可用）
	if containsString(pluginNames, "ai-analysis") {
		// 等待其他模块完成（除了ai-analysis本身）
		// 检查所有非AI模块的状态
		waitForOtherModules := func() bool {
			status, err := e.taskManager.GetTaskStatus(taskID)
			if err != nil {
				return false
			}
			// 检查所有非AI模块是否已完成或失败
			for moduleName, moduleStatus := range status.Modules {
				if moduleName != "ai-analysis" {
					if moduleStatus.Status != models.TaskStatusCompleted && moduleStatus.Status != models.TaskStatusFailed {
						return false // 还有模块未完成
					}
				}
			}
			return true // 所有其他模块都已完成或失败
		}

		// 轮询等待其他模块完成（最多等待5分钟）
		maxWaitTime := 5 * time.Minute
		checkInterval := 2 * time.Second
		waited := 0 * time.Second
		for !waitForOtherModules() && waited < maxWaitTime {
			time.Sleep(checkInterval)
			waited += checkInterval
		}

		if waited >= maxWaitTime {
			log.Printf("[Executor] Timeout waiting for other modules to complete before AI analysis")
		}

		// 使用 defer recover 保护，确保 AI 分析失败不影响任务完成
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[Executor] PANIC recovered in ai-analysis plugin: %v", r)
					e.taskManager.UpdateModuleStatus(taskID, "ai-analysis", models.TaskStatusFailed, fmt.Sprintf("Plugin panic: %v", r))
				}
			}()

			aiInput := &plugin.PluginInput{
				TaskID:    taskID,
				TargetURL: task.TargetURL,
				Language:  task.Language,
				Options:   pluginOptions,
			}
			aiInput.Options["ai_mode"] = task.AIMode

			output, err := e.executeSinglePluginSync(ctx, taskID, "ai-analysis", aiInput)
			if err == nil && output != nil && output.Success {
				results["ai-analysis"] = output
				// 验证AI分析结果是否正确
				if ai, ok := output.Data.(*models.AIAnalysis); ok {
					log.Printf("[Executor] AI analysis completed successfully. Summary length: %d, RiskLevel: %s, Scores: availability=%d, performance=%d, security=%d, seo=%d",
						len(ai.Summary), ai.RiskLevel, ai.AvailabilityScore, ai.PerformanceScore, ai.SecurityScore, ai.SEOScore)
				} else {
					log.Printf("[Executor] WARNING: AI analysis output data type assertion failed, got %T", output.Data)
				}
			} else {
				if err != nil {
					log.Printf("[Executor] AI analysis failed with error: %v", err)
				} else if output != nil {
					log.Printf("[Executor] AI analysis returned failure: %s", output.Error)
				} else {
					log.Printf("[Executor] AI analysis returned nil output")
				}
				log.Printf("[Executor] AI analysis failed, but continuing with other results")
			}
		}()
	}

	return nil
}

// executeSinglePlugin 执行单个插件（异步）
func (e *Executor) executeSinglePlugin(
	ctx context.Context,
	taskID string,
	pluginName string,
	input *plugin.PluginInput,
	results map[string]*plugin.PluginOutput,
	mu *sync.Mutex,
) {
	output, err := e.executeSinglePluginSync(ctx, taskID, pluginName, input)
	mu.Lock()
	defer mu.Unlock()
	if err != nil {
		results[pluginName] = &plugin.PluginOutput{Success: false, Error: err.Error()}
	} else {
		results[pluginName] = output
	}
}

// executeSinglePluginSync 同步执行单个插件
// 此函数确保插件执行失败不会导致 panic，所有错误都会被捕获
func (e *Executor) executeSinglePluginSync(
	ctx context.Context,
	taskID string,
	pluginName string,
	input *plugin.PluginInput,
) (*plugin.PluginOutput, error) {
	// 更新模块状态为运行中
	e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusRunning, "")

	// 获取插件
	p, err := plugin.GetPlugin(pluginName)
	if err != nil {
		errorMsg := fmt.Sprintf("Plugin not found: %s", pluginName)
		e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusFailed, errorMsg)
		return &plugin.PluginOutput{Success: false, Error: errorMsg}, err
	}

	// 执行插件（使用 defer recover 保护，防止插件内部 panic）
	var output *plugin.PluginOutput
	var execErr error
	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Executor] PANIC recovered in plugin %s execution: %v", pluginName, r)
				execErr = fmt.Errorf("plugin panic: %v", r)
				output = &plugin.PluginOutput{
					Success: false,
					Error:   fmt.Sprintf("Plugin panic: %v", r),
				}
			}
		}()
		output, execErr = p.Execute(ctx, input)
	}()

	// 如果发生 panic，使用捕获的错误
	if execErr != nil {
		err = execErr
	}
	if output == nil && err == nil {
		// 如果既没有输出也没有错误，说明发生了 panic 但被捕获
		err = fmt.Errorf("plugin execution failed with panic")
		output = &plugin.PluginOutput{Success: false, Error: "Plugin execution failed"}
	}

	// 更新模块状态（根据错误类型决定是否失败）
	if err != nil {
		errorMsg := err.Error()

		// 可忽略的错误：标记为完成但记录错误
		if plugin.IsIgnorable(err) {
			log.Printf("[Executor] Plugin %s failed with ignorable error: %v", pluginName, err)
			e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusCompleted, errorMsg)
			// 返回一个标记为成功但包含错误的输出
			output = &plugin.PluginOutput{
				Success: true, // 标记为成功，允许继续执行
				Error:   errorMsg,
			}
		} else {
			// 致命或可重试错误：标记为失败
			e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusFailed, errorMsg)
		}
	} else if !output.Success {
		// 插件返回失败
		if plugin.IsIgnorable(fmt.Errorf(output.Error)) {
			log.Printf("[Executor] Plugin %s returned ignorable error: %s", pluginName, output.Error)
			e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusCompleted, output.Error)
			output.Success = true // 允许继续执行
		} else {
			e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusFailed, output.Error)
		}
	} else {
		// 成功
		e.taskManager.UpdateModuleStatus(taskID, pluginName, models.TaskStatusCompleted, "")
		// 更新进度
		if output.Progress != nil {
			e.taskManager.UpdateModuleProgress(taskID, pluginName, output.Progress.Current, output.Progress.Total)
		}

		// 立即保存该模块的结果，以便前端实时获取
		// 使用部分更新，只更新当前模块的结果，保留其他模块的结果
		if output.Success && output.Data != nil {
			partialResults := &models.TaskResults{}
			switch pluginName {
			case "website-info":
				if info, ok := output.Data.(*models.WebsiteInfo); ok {
					partialResults.WebsiteInfo = info
				}
			case "domain-info":
				if info, ok := output.Data.(*models.DomainInfo); ok {
					partialResults.DomainInfo = info
				}
			case "ssl-info":
				if info, ok := output.Data.(*models.SSLInfo); ok {
					partialResults.SSLInfo = info
				}
			case "tech-stack":
				if info, ok := output.Data.(*models.TechStack); ok {
					partialResults.TechStack = info
				}
			case "link-health":
				if linkResults, ok := output.Data.([]models.HttpxResult); ok {
					partialResults.LinkHealth = linkResults
				}
			case "performance":
				if perf, ok := output.Data.(*models.PerformanceMetrics); ok {
					partialResults.Performance = perf
				}
			case "seo":
				if seo, ok := output.Data.(*models.SEOCompliance); ok {
					partialResults.SEOCompliance = seo
				}
			case "security":
				if sec, ok := output.Data.(*models.SecurityRisk); ok {
					partialResults.SecurityRisk = sec
				}
			case "accessibility":
				if acc, ok := output.Data.(*models.AccessibilityInfo); ok {
					partialResults.Accessibility = acc
				}
			case "ai-analysis":
				if ai, ok := output.Data.(*models.AIAnalysis); ok {
					partialResults.AIAnalysis = ai
				}
			}

			// 如果部分结果不为空，立即保存（使用UpdateTaskResultsWithoutStatus进行部分更新）
			if partialResults.WebsiteInfo != nil || partialResults.DomainInfo != nil ||
				partialResults.SSLInfo != nil || partialResults.TechStack != nil ||
				partialResults.LinkHealth != nil || partialResults.Performance != nil ||
				partialResults.SEOCompliance != nil || partialResults.SecurityRisk != nil ||
				partialResults.Accessibility != nil || partialResults.AIAnalysis != nil {
				// 使用UpdateTaskResultsWithoutStatus进行部分更新，保留其他模块的结果
				if err := database.UpdateTaskResultsWithoutStatus(taskID, partialResults); err != nil {
					log.Printf("[Executor] Failed to save partial results for module %s: %v", pluginName, err)
				} else {
					log.Printf("[Executor] Saved partial results for module %s", pluginName)
				}
			}
		}
	}

	return output, err
}

// aggregateResults 聚合插件结果到 TaskResults
func (e *Executor) aggregateResults(
	pluginResults map[string]*plugin.PluginOutput,
	results *models.TaskResults,
	task *models.Task,
) {
	for name, output := range pluginResults {
		if !output.Success {
			continue
		}

		switch name {
		case "website-info":
			if info, ok := output.Data.(*models.WebsiteInfo); ok {
				results.WebsiteInfo = info
			}
		case "domain-info":
			if info, ok := output.Data.(*models.DomainInfo); ok {
				results.DomainInfo = info
			}
		case "ssl-info":
			if info, ok := output.Data.(*models.SSLInfo); ok {
				results.SSLInfo = info
			}
		case "tech-stack":
			if info, ok := output.Data.(*models.TechStack); ok {
				results.TechStack = info
			}
		case "link-health":
			if linkResults, ok := output.Data.([]models.HttpxResult); ok {
				log.Printf("[Executor] Aggregating link-health results: %d results", len(linkResults))
				results.LinkHealth = linkResults
			} else {
				log.Printf("[Executor] Failed to aggregate link-health results: type assertion failed, got %T", output.Data)
			}
		case "performance":
			if perf, ok := output.Data.(*models.PerformanceMetrics); ok {
				results.Performance = perf
			}
		case "seo":
			if seo, ok := output.Data.(*models.SEOCompliance); ok {
				results.SEOCompliance = seo
			}
		case "security":
			if sec, ok := output.Data.(*models.SecurityRisk); ok {
				results.SecurityRisk = sec
			}
		case "accessibility":
			if acc, ok := output.Data.(*models.AccessibilityInfo); ok {
				results.Accessibility = acc
			}
		case "ai-analysis":
			if ai, ok := output.Data.(*models.AIAnalysis); ok {
				results.AIAnalysis = ai
			}
		case "katana":
			// katana结果直接存储
			results.KatanaResults = output.Data
		}
	}

	// 检测是否为网站链接深度检查模式并自动合并结果
	pluginNames := make([]string, 0, len(pluginResults))
	for name := range pluginResults {
		pluginNames = append(pluginNames, name)
	}

	if IsDeepCheckMode(pluginNames) {
		log.Printf("[Executor] Website link deep check mode detected, merging results...")
		merger := NewResultMerger()

		// 准备插件结果数据（转换为interface{}格式）
		pluginDataMap := make(map[string]interface{})
		for name, output := range pluginResults {
			if output.Success {
				pluginDataMap[name] = output.Data
			}
		}

		// 执行结果合并（仅合并 katana 到 link-health）
		merger.MergeDeepCheckResults(results, pluginDataMap)
	}

	// 更新摘要
	if results.LinkHealth != nil {
		alive := 0
		totalResponse := 0
		for _, r := range results.LinkHealth {
			if r.StatusCode > 0 && r.StatusCode < 400 {
				alive++
			}
			if r.ResponseTime > 0 {
				totalResponse += r.ResponseTime
			}
		}
		avgResponse := 0
		if len(results.LinkHealth) > 0 {
			avgResponse = totalResponse / len(results.LinkHealth)
		}
		results.Summary = models.ScanSummary{
			Total:       len(results.LinkHealth),
			Alive:       alive,
			Dead:        len(results.LinkHealth) - alive,
			AvgResponse: avgResponse,
			Timeout:     false,
		}
	}
}

// containsString 检查切片中是否包含指定字符串（不区分大小写）
func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}

// StartTaskExecution 启动任务执行（在后台 goroutine 中执行）
func (e *Executor) StartTaskExecution(taskID string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 300*time.Second) // 增加到300秒
		defer cancel()
		e.ExecuteTask(ctx, taskID)
	}()
}
