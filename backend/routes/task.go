package routes

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"web-checkly/database"
	"web-checkly/middleware"
	"web-checkly/models"
	"web-checkly/services"
	"web-checkly/utils"

	"github.com/gofiber/fiber/v2"
)

var (
	taskManager = services.NewTaskManager()
	executor    = services.NewExecutor(taskManager, 3) // 最多3个并发任务
)

// canAccessTask 检查用户是否有权限访问任务
// 规则：
// 1. 如果任务没有user_id（匿名任务），任何人都可以访问
// 2. 如果任务有user_id，只有任务的所有者可以访问
// 3. 如果任务标记为is_public，任何人都可以访问（预留功能）
func canAccessTask(c *fiber.Ctx, task *models.Task) bool {
	userID := middleware.GetUserID(c)

	// 匿名任务，任何人都可以访问
	if task.UserID == nil {
		return true
	}

	// 公开任务，任何人都可以访问（预留功能）
	if task.IsPublic {
		return true
	}

	// 私有任务，只有所有者可以访问
	if userID != nil && userID.String() == *task.UserID {
		return true
	}

	return false
}

// CreateTaskHandler 创建扫描任务
// @Summary 创建扫描任务
// @Description 创建一个新的网站扫描任务，支持多种检测选项。任务创建后会异步执行，可通过任务ID查询状态和结果。
// @Description
// @Description 支持的扫描选项：
// @Description - website-info: 网站基础信息（标题、描述、关键词等）
// @Description - domain-info: 域名DNS信息（IP、MX、NS、TXT记录等）
// @Description - ssl-info: SSL证书信息（有效期、签名算法等）
// @Description - tech-stack: 技术栈识别（框架、CMS、CDN等）
// @Description - link-health: 链接健康检查（检测页面内所有链接的可用性）
// @Description - performance: 性能检测（Lighthouse性能指标）
// @Description - seo: SEO合规性检测（Lighthouse SEO指标）
// @Description - security: 安全风险检测（Lighthouse安全指标）
// @Description - accessibility: 可访问性检测（Lighthouse A11y指标）
// @Description - ai-analysis: AI智能分析报告（需要配置DEEPSEEK_API_KEY）
// @Tags 任务管理
// @Accept json
// @Produce json
// @Param request body models.CreateTaskRequest true "任务创建请求"
// @Success 201 {object} models.CreateTaskResponse "任务创建成功，返回任务ID和初始状态"
// @Failure 400 {object} map[string]string "请求参数错误（URL格式错误、私有IP等）"
// @Failure 500 {object} map[string]string "服务器内部错误"
// @Router /api/scans [post]
func CreateTaskHandler(c *fiber.Ctx) error {
	var req models.CreateTaskRequest
	if err := c.BodyParser(&req); err != nil {
		log.Printf("[CreateTaskHandler] Error parsing request body: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 验证 URL
	if req.URL == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "URL parameter is required",
		})
	}

	// 规范化 URL
	target, err := utils.NormalizeURL(req.URL)
	if err != nil {
		log.Printf("[CreateTaskHandler] Error normalizing URL: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid URL",
		})
	}
	req.URL = target

	// SSRF 防护：从 URL 中提取主机名进行检查
	parsedURL, err := url.Parse(target)
	if err != nil {
		log.Printf("[CreateTaskHandler] Error parsing URL: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid URL format",
		})
	}

	hostname := parsedURL.Hostname()
	if hostname == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Missing hostname",
		})
	}

	if utils.IsPrivateIP(hostname) {
		log.Printf("[CreateTaskHandler] Error: Private IP detected: %s (from URL: %s)", hostname, target)
		return c.Status(400).JSON(fiber.Map{
			"error": "Private IP not allowed",
		})
	}
	log.Printf("[CreateTaskHandler] SSRF check passed for hostname: %s", hostname)

	// ========== 黑名单检查：必须在创建任务前进行，存在则立即中断后续流程 ==========

	// 1. 检查网站黑名单（优先检查，因为这是URL级别的检查）
	if database.IsWebsiteBlacklisted(target) {
		log.Printf("[CreateTaskHandler] Website is blacklisted, aborting task creation: %s", target)
		return c.Status(403).JSON(fiber.Map{
			"error":   "Website blacklisted",
			"message": "This website is not allowed for detection. Please contact support if you believe this is an error.",
		})
	}

	// 2. 检查用户黑名单（如果用户已登录）
	// 从JWT token中提取用户ID（可选，支持匿名任务）
	var userID *string
	var userIDStr string
	if userIDPtr := middleware.GetUserID(c); userIDPtr != nil {
		userIDStr = userIDPtr.String()
		userID = &userIDStr

		// 检查用户是否在黑名单中
		if database.IsUserBlacklisted(*userIDPtr) {
			log.Printf("[CreateTaskHandler] User is blacklisted, aborting task creation: %s", userIDStr)
			return c.Status(403).JSON(fiber.Map{
				"error":   "User blacklisted",
				"message": "Your account has been restricted from creating detection tasks. Please contact support for assistance.",
			})
		}
	}

	// ========== 黑名单检查完成，继续后续流程 ==========

	// 检查重复任务（30秒内相同URL和选项的任务）
	if userIDStr != "" {
		// 序列化选项用于比较
		optionsJSON, err := json.Marshal(req.Options)
		if err != nil {
			log.Printf("[CreateTaskHandler] Error marshaling options: %v", err)
		} else {
			duplicateTaskID, isDuplicate, err := database.CheckDuplicateTask(userIDStr, req.URL, string(optionsJSON), 30)
			if err != nil {
				log.Printf("[CreateTaskHandler] Error checking duplicate task: %v", err)
			} else if isDuplicate {
				log.Printf("[CreateTaskHandler] Duplicate task detected: %s (within 30 seconds)", duplicateTaskID)
				return c.Status(409).JSON(fiber.Map{
					"error":   "Duplicate task",
					"message": "A similar task was created recently. Please wait a moment.",
					"task_id": duplicateTaskID,
				})
			}
		}
	}

	// 用户锁机制已移除，不再限制并发创建任务
	// 批量预扣操作已经使用数据库事务和SELECT FOR UPDATE来防止并发问题

	// 使用批量创建使用记录函数（不扣除积分，只创建记录）
	// 添加重试机制，处理临时性并发冲突（最多重试3次）
	var usageRecordIDs map[string]string
	var deductErr error
	maxRetries := 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		usageRecordIDs, deductErr = services.BatchCreateUsageRecords(userIDStr, "", req.Options)
		if deductErr == nil {
			break // 成功
		}

		// 检查是否是并发冲突错误（可以重试）
		if attempt < maxRetries-1 {
			// 等待一小段时间后重试（指数退避）
			waitTime := time.Duration(attempt+1) * 100 * time.Millisecond
			log.Printf("[CreateTaskHandler] Batch create usage records failed (attempt %d/%d), retrying after %v: %v", attempt+1, maxRetries, waitTime, deductErr)
			time.Sleep(waitTime)
			continue
		}

		// 最后一次尝试失败，返回错误
		log.Printf("[CreateTaskHandler] Failed to batch create usage records after %d attempts: %v", maxRetries, deductErr)

		// 解析错误信息，提取功能名称和积分信息
		errorMsg := deductErr.Error()
		var errorDetails fiber.Map = fiber.Map{
			"error":   "Credits required",
			"message": errorMsg,
		}

		// 尝试提取功能名称和所需积分
		if strings.Contains(errorMsg, "access denied for feature") {
			// 提取功能代码和名称
			parts := strings.Split(errorMsg, ":")
			if len(parts) > 0 {
				featurePart := strings.TrimSpace(parts[0])
				if strings.HasPrefix(featurePart, "access denied for feature") {
					featureInfo := strings.TrimPrefix(featurePart, "access denied for feature")
					featureInfo = strings.TrimSpace(featureInfo)
					// 提取功能代码（第一个单词）
					featureCode := strings.Fields(featureInfo)[0]
					errorDetails["feature"] = featureCode
				}
			}
			// 提取所需积分
			if strings.Contains(errorMsg, "need") {
				re := regexp.MustCompile(`need (\d+)`)
				matches := re.FindStringSubmatch(errorMsg)
				if len(matches) > 1 {
					if creditsNeeded, err := strconv.Atoi(matches[1]); err == nil {
						errorDetails["credits_required"] = creditsNeeded
					}
				}
			}
			// 提取当前积分
			if strings.Contains(errorMsg, "have") {
				re := regexp.MustCompile(`have (\d+)`)
				matches := re.FindStringSubmatch(errorMsg)
				if len(matches) > 1 {
					if currentCredits, err := strconv.Atoi(matches[1]); err == nil {
						errorDetails["current_credits"] = currentCredits
					}
				}
			}
		}

		return c.Status(402).JSON(errorDetails)
	}

	// 创建任务
	task, err := taskManager.CreateTask(&req, userID)
	if err != nil {
		// 如果创建失败，删除已创建的使用记录（因为还没有扣除积分，所以只需要删除记录）
		for feature, urID := range usageRecordIDs {
			if urID != "" {
				if deleteErr := services.DeleteUsageRecord(urID); deleteErr != nil {
					log.Printf("[CreateTaskHandler] Failed to delete usage record for %s: %v", feature, deleteErr)
				} else {
					log.Printf("[CreateTaskHandler] Deleted usage record for %s due to task creation failure", feature)
				}
			}
		}
		log.Printf("[CreateTaskHandler] Error creating task: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to create task",
			"message": err.Error(),
		})
	}

	// 更新使用记录中的task_id（将预扣的使用记录关联到任务）
	// 注意：在释放锁之前完成所有数据库操作，确保数据一致性
	for feature, urID := range usageRecordIDs {
		if urID == "" {
			continue // 跳过匿名用户使用基础功能的情况
		}
		// 更新usage_record的task_id
		query := `UPDATE usage_records SET task_id = $1 WHERE id = $2`
		if _, err := database.GetDB().Exec(query, task.ID, urID); err != nil {
			log.Printf("[CreateTaskHandler] Warning: Failed to link usage record %s to task %s: %v", urID, task.ID, err)
		} else {
			log.Printf("[CreateTaskHandler] Linked usage record %s to task %s for feature %s", urID, task.ID, feature)
		}
	}

	log.Printf("[CreateTaskHandler] Created task: %s for URL: %s", task.ID, req.URL)

	// 异步启动任务执行
	executor.StartTaskExecution(task.ID)

	// 返回任务ID和状态
	return c.Status(201).JSON(fiber.Map{
		"id":         task.ID,
		"status":     task.Status,
		"created_at": task.CreatedAt,
	})
}

// GetTaskStatusHandler 获取任务状态
// @Summary 获取任务状态
// @Description 查询指定任务的执行状态和进度信息，包括各模块的执行状态
// @Tags 任务管理
// @Accept json
// @Produce json
// @Param id path string true "任务ID" example:"550e8400-e29b-41d4-a716-446655440000"
// @Success 200 {object} models.TaskStatusResponse "任务状态"
// @Failure 400 {object} map[string]string "请求参数错误"
// @Failure 403 {object} map[string]string "无权访问"
// @Failure 404 {object} map[string]string "任务不存在"
// @Router /api/scans/{id} [get]
func GetTaskStatusHandler(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Task ID is required",
		})
	}

	task, err := taskManager.GetTask(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	// 检查访问权限
	if !canAccessTask(c, task) {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	status, err := taskManager.GetTaskStatus(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	return c.JSON(status)
}

// GetTaskResultsHandler 获取任务结果
// @Summary 获取任务结果
// @Description 获取已完成任务的扫描结果数据。只有当任务状态为"completed"时才能获取完整结果。
// @Description 如果任务仍在执行中，将返回202状态码。
// @Tags 任务管理
// @Accept json
// @Produce json
// @Param id path string true "任务ID" example:"550e8400-e29b-41d4-a716-446655440000"
// @Success 200 {object} models.TaskResults "任务结果"
// @Failure 202 {object} map[string]string "任务仍在执行中"
// @Failure 403 {object} map[string]string "无权访问"
// @Failure 404 {object} map[string]string "任务不存在"
// @Router /api/scans/{id}/results [get]
func GetTaskResultsHandler(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Task ID is required",
		})
	}

	task, err := taskManager.GetTask(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	// 检查访问权限
	if !canAccessTask(c, task) {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// 如果任务还在执行中，返回202
	if task.Status == models.TaskStatusPending || task.Status == models.TaskStatusRunning {
		return c.Status(202).JSON(fiber.Map{
			"message": "Task is still running",
			"status":  task.Status,
		})
	}

	results, err := taskManager.GetTaskResults(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(results)
}

// StreamTaskHandler SSE流式响应端点
func StreamTaskHandler(c *fiber.Ctx) error {
	taskID := c.Params("id")
	if taskID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Task ID is required",
		})
	}

	task, err := taskManager.GetTask(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	// 检查访问权限
	if !canAccessTask(c, task) {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// 设置SSE响应头
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	// 启用流式响应
	c.Context().Response.ImmediateHeaderFlush = true

	// 发送初始状态
	status, err := taskManager.GetTaskStatus(taskID)
	if err == nil {
		services.SendSSE(c, "status", status)
	}

	// 轮询任务状态
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	lastStatus := task.Status
	lastKatanaCount := 0

	for {
		select {
		case <-c.Context().Done():
			return nil
		case <-ticker.C:
			currentStatus, err := taskManager.GetTaskStatus(taskID)
			if err != nil {
				services.SendSSE(c, "error", fiber.Map{
					"message": "Failed to get task status: " + err.Error(),
				})
				return nil
			}

			// 如果状态变化，发送更新
			if currentStatus.Status != lastStatus {
				services.SendSSE(c, "status", currentStatus)
				lastStatus = currentStatus.Status
			}

			// 发送模块状态更新
			for name, module := range currentStatus.Modules {
				services.SendSSE(c, "module-status", fiber.Map{
					"task_id":  taskID,
					"module":   name,
					"status":   module.Status,
					"progress": module.Progress,
					"error":    module.Error,
				})
			}

			// 如果任务有结果，发送katana结果（实时）
			if currentStatus.Status == models.TaskStatusRunning || currentStatus.Status == models.TaskStatusCompleted {
				task, _ := taskManager.GetTask(taskID)
				if task != nil && task.Results != nil {
					if katanaResults, ok := task.Results.KatanaResults.([]interface{}); ok {
						if len(katanaResults) > lastKatanaCount {
							for i := lastKatanaCount; i < len(katanaResults); i++ {
								services.SendSSE(c, "katana-result", katanaResults[i])
							}
							lastKatanaCount = len(katanaResults)
						}
					}
				}

				// 如果任务完成，发送完整结果
				if currentStatus.Status == models.TaskStatusCompleted {
					results, err := taskManager.GetTaskResults(taskID)
					if err == nil && results != nil {
						services.SendSSE(c, "results", results)
					}
					// 发送完成事件，并通知积分已扣除
					services.SendSSE(c, "done", fiber.Map{
						"task_id":         taskID,
						"status":          "completed",
						"credits_updated": true, // 通知前端积分已更新
					})
					return nil
				}
			}

			// 如果任务失败，发送错误
			if currentStatus.Status == models.TaskStatusFailed {
				services.SendSSE(c, "error", fiber.Map{
					"task_id": taskID,
					"message": currentStatus.Error,
				})
				services.SendSSE(c, "done", fiber.Map{
					"task_id": taskID,
					"status":  "failed",
				})
				return nil
			}
		}
	}
}

// GetUserTasksHandler 获取用户任务列表（支持筛选和搜索）
func GetUserTasksHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		log.Printf("[GetUserTasksHandler] Unauthorized: userID is nil")
		return c.Status(401).JSON(fiber.Map{
			"error":   "Unauthorized",
			"details": "User not logged in.",
		})
	}

	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")
	status := c.Query("status", "") // 筛选状态：pending, running, completed, failed
	search := c.Query("search", "") // 搜索URL

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	log.Printf("[GetUserTasksHandler] Getting tasks for user %s: limit=%d, offset=%d, status=%s, search=%s",
		userID.String(), limit, offset, status, search)

	tasks, err := taskManager.GetUserTasks(userID.String(), limit, offset, status, search)
	if err != nil {
		log.Printf("[GetUserTasksHandler] Error getting user tasks: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to get tasks",
			"details": fmt.Sprintf("Database query failed: %v", err),
		})
	}

	// 获取总数（支持筛选和搜索）
	total, err := database.GetTaskCount(userID.String(), status, search)
	if err != nil {
		log.Printf("[GetUserTasksHandler] Error getting task count: %v", err)
		// 如果获取总数失败，使用任务列表的长度作为总数（不准确，但不会导致请求失败）
		total = len(tasks)
	}

	log.Printf("[GetUserTasksHandler] Successfully retrieved %d tasks (total: %d) for user %s",
		len(tasks), total, userID.String())

	return c.JSON(fiber.Map{
		"tasks":  tasks,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// DeleteUserTaskHandler 删除用户任务（只能删除自己的任务）
func DeleteUserTaskHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	taskID := c.Params("id")
	if taskID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Task ID is required",
		})
	}

	// 验证任务是否属于当前用户
	task, err := database.GetTask(taskID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Task not found",
		})
	}

	if task.UserID == nil || *task.UserID != userID.String() {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized to delete this task",
		})
	}

	// 先删除关联的使用记录（避免外键约束问题）
	query := `DELETE FROM usage_records WHERE task_id = $1`
	if _, err := database.GetDB().Exec(query, taskID); err != nil {
		log.Printf("[DeleteUserTaskHandler] Warning: Failed to delete usage records: %v", err)
		// 继续执行，不因为使用记录删除失败而阻止任务删除
	}

	// 删除任务
	if err := database.DeleteUserTask(taskID, userID.String()); err != nil {
		log.Printf("[DeleteUserTaskHandler] Error deleting task %s for user %s: %v", taskID, userID.String(), err)
		// 返回更详细的错误信息
		errorMsg := "Failed to delete task"
		if err.Error() == "task not found or unauthorized" {
			return c.Status(404).JSON(fiber.Map{
				"error": "Task not found or you don't have permission to delete it",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"error":   errorMsg,
			"details": err.Error(),
		})
	}

	log.Printf("[DeleteUserTaskHandler] Successfully deleted task %s for user %s", taskID, userID.String())
	return c.JSON(fiber.Map{
		"message": "Task deleted successfully",
	})
}
