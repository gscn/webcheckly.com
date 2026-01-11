package routes

import (
	"log"
	"net/url"
	"strconv"
	"time"
	"webcheckly/database"
	"webcheckly/middleware"
	"webcheckly/models"
	"webcheckly/services"
	"webcheckly/utils"

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

	// 从JWT token中提取用户ID（可选，支持匿名任务）
	var userID *string
	var userIDStr string
	if userIDPtr := middleware.GetUserID(c); userIDPtr != nil {
		userIDStr = userIDPtr.String()
		userID = &userIDStr
	}

	// 用户锁机制已移除，不再限制并发创建任务
	// 批量预扣操作已经使用数据库事务和SELECT FOR UPDATE来防止并发问题

	// 使用批量预扣函数（原子操作，防止资源竞争）
	// 先批量预扣费用（使用单个事务，确保原子性），task_id 先设为空，创建任务后再更新
	// 添加重试机制，处理临时性并发冲突（最多重试3次）
	var usageRecordIDs map[string]string
	var deductErr error
	maxRetries := 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		usageRecordIDs, deductErr = services.BatchPreDeductFeatureCosts(userIDStr, "", req.Options)
		if deductErr == nil {
			break // 成功
		}

		// 检查是否是并发冲突错误（可以重试）
		if attempt < maxRetries-1 {
			// 等待一小段时间后重试（指数退避）
			waitTime := time.Duration(attempt+1) * 100 * time.Millisecond
			log.Printf("[CreateTaskHandler] Batch deduct failed (attempt %d/%d), retrying after %v: %v", attempt+1, maxRetries, waitTime, deductErr)
			time.Sleep(waitTime)
			continue
		}

		// 最后一次尝试失败，返回错误
		log.Printf("[CreateTaskHandler] Failed to batch deduct feature costs after %d attempts: %v", maxRetries, deductErr)
		return c.Status(402).JSON(fiber.Map{
			"error":   "Credits required",
			"message": deductErr.Error(),
		})
	}

	// 创建任务
	task, err := taskManager.CreateTask(&req, userID)
	if err != nil {
		// 如果创建失败，退回已预扣的费用
		for feature, urID := range usageRecordIDs {
			if urID != "" {
				if refundErr := services.RefundFeatureCost(urID, ""); refundErr != nil {
					log.Printf("[CreateTaskHandler] Failed to refund feature cost for %s: %v", feature, refundErr)
				} else {
					log.Printf("[CreateTaskHandler] Refunded feature cost for %s due to task creation failure", feature)
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
					// 发送完成事件
					services.SendSSE(c, "done", fiber.Map{
						"task_id": taskID,
						"status":  "completed",
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

// GetUserTasksHandler 获取用户任务列表
func GetUserTasksHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")

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

	tasks, err := taskManager.GetUserTasks(userID.String(), limit, offset)
	if err != nil {
		log.Printf("[GetUserTasksHandler] Error getting user tasks: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get tasks",
		})
	}

	// 获取总数
	total, err := database.GetTaskCount(userID.String())
	if err != nil {
		log.Printf("[GetUserTasksHandler] Error getting task count: %v", err)
	}

	return c.JSON(fiber.Map{
		"tasks":  tasks,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}
