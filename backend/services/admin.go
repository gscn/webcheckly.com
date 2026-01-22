package services

import (
	"fmt"
	"log"
	"math"
	"strings"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// GetUsersList 获取用户列表（管理员功能）
func GetUsersList(page, pageSize int, search string) (*models.AdminUserListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	users, err := database.GetAllUsers(pageSize, offset, search)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	total, err := database.GetUserCount(search)
	if err != nil {
		return nil, fmt.Errorf("failed to get user count: %w", err)
	}

	// 转换为响应模型
	userResponses := make([]*models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &models.AdminUserListResponse{
		Users:      userResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// UpdateUserRole 更新用户角色（管理员功能）
func UpdateUserRole(userID string, role string) error {
	// 验证角色
	if role != models.UserRoleUser && role != models.UserRoleAdmin {
		return fmt.Errorf("invalid role: %s", role)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	// 验证用户是否存在
	user, err := database.GetUserByID(userUUID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}

	err = database.UpdateUserRole(userUUID, role)
	if err == nil {
		log.Printf("[Admin] User role updated: user_id=%s, old_role=%s, new_role=%s", userID, user.Role, role)
	}
	return err
}

// UpdateUserStatus 更新用户状态（管理员功能）
func UpdateUserStatus(userID string, emailVerified bool) error {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	return database.UpdateUserStatus(userUUID, emailVerified)
}

// UpdateUserInfo 更新用户信息（管理员功能，可更新邮箱等）
func UpdateUserInfo(userID string, email string) error {
	// 验证邮箱格式
	if email == "" {
		return fmt.Errorf("email cannot be empty")
	}
	// 简单的邮箱格式验证
	if len(email) < 3 || !strings.Contains(email, "@") {
		return fmt.Errorf("invalid email format")
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	// 验证用户是否存在
	user, err := database.GetUserByID(userUUID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}

	// 检查邮箱是否已被其他用户使用
	existingUser, err := database.GetUserByEmail(email)
	if err != nil {
		return fmt.Errorf("failed to check email: %w", err)
	}
	if existingUser != nil && existingUser.ID != userUUID {
		return fmt.Errorf("email already in use")
	}

	err = database.UpdateUserInfo(userUUID, email)
	if err == nil {
		log.Printf("[Admin] User info updated: user_id=%s, old_email=%s, new_email=%s", userID, user.Email, email)
	}
	return err
}

// DeleteUser 删除用户（管理员功能）
func DeleteUser(userID string) error {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	// 验证用户是否存在
	user, err := database.GetUserByID(userUUID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}

	err = database.DeleteUser(userUUID)
	if err == nil {
		log.Printf("[Admin] User deleted: user_id=%s, email=%s", userID, user.Email)
	}
	return err
}

// GetUserDetails 获取用户详细信息（管理员功能）
func GetUserDetails(userID string) (*models.AdminUserDetailResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	user, err := database.GetUserByID(userUUID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// 获取用户积分
	credits, err := GetUserCredits(userID)
	if err != nil {
		// 如果获取积分失败，继续执行，只是不返回积分信息
		credits = nil
	}

	// 获取用户订阅
	subscription, err := GetUserSubscription(userID)
	if err != nil {
		subscription = nil
	}

	// 获取任务数量（不筛选，获取全部）
	taskCount, err := database.GetTaskCount(userID, "", "")
	if err != nil {
		taskCount = 0
	}

	return &models.AdminUserDetailResponse{
		User:         user.ToResponse(),
		Credits:      credits,
		Subscription: subscription,
		TaskCount:    taskCount,
	}, nil
}

// GetAllTasks 获取所有任务（管理员功能）
func GetAllTasks(page, pageSize int, filters map[string]string) (*models.AdminTaskListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	status := filters["status"]
	userID := filters["user_id"]

	tasks, err := database.GetAllTasks(pageSize, offset, status, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}

	total, err := database.GetTaskCountAdmin(status, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task count: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &models.AdminTaskListResponse{
		Tasks:      tasks,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// DeleteTask 删除任务（管理员功能）
func DeleteTask(taskID string) error {
	// 验证任务是否存在
	task, err := database.GetTask(taskID)
	if err != nil {
		return fmt.Errorf("failed to get task: %w", err)
	}
	if task == nil {
		return fmt.Errorf("task not found")
	}

	err = database.DeleteTaskByID(taskID)
	if err == nil {
		log.Printf("[Admin] Task deleted: task_id=%s, target_url=%s", taskID, task.TargetURL)
	}
	return err
}

// GetTaskStatistics 获取任务统计信息（管理员功能）
func GetTaskStatistics() (*models.TaskStatistics, error) {
	stats := &models.TaskStatistics{
		ByStatus: make(map[string]int),
		ByUser:   make(map[string]int),
	}

	// 获取总任务数（不筛选）
	total, err := database.GetTaskCountAdmin("", "")
	if err == nil {
		stats.Total = total
	}

	// 获取按状态统计的任务数
	statuses := []string{"pending", "running", "completed", "failed"}
	for _, status := range statuses {
		count, err := database.GetTaskCountAdmin(status, "")
		if err == nil {
			stats.ByStatus[status] = count
		}
	}

	// 设置日期范围（最近30天）
	stats.DateRange.Start = time.Now().AddDate(0, 0, -30)
	stats.DateRange.End = time.Now()

	return stats, nil
}

// GetAllSubscriptions 获取所有订阅（管理员功能）
func GetAllSubscriptions(page, pageSize int, filters map[string]string) (*models.AdminSubscriptionListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	status := filters["status"]
	planType := filters["plan_type"]

	subscriptions, err := database.GetAllSubscriptions(pageSize, offset, status, planType)
	if err != nil {
		return nil, fmt.Errorf("failed to get subscriptions: %w", err)
	}

	total, err := database.GetSubscriptionCount(status, planType)
	if err != nil {
		return nil, fmt.Errorf("failed to get subscription count: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &models.AdminSubscriptionListResponse{
		Subscriptions: subscriptions,
		Total:         total,
		Page:          page,
		PageSize:      pageSize,
		TotalPages:    totalPages,
	}, nil
}

// UpdateSubscription 更新订阅（管理员功能）
func UpdateSubscription(subscriptionID string, updates map[string]interface{}) error {
	// 验证订阅是否存在
	subscription, err := database.GetSubscriptionByID(subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get subscription: %w", err)
	}
	if subscription == nil {
		return fmt.Errorf("subscription not found")
	}

	// 如果更新状态
	if status, ok := updates["status"].(string); ok {
		// 验证状态值
		validStatuses := []string{"active", "canceled", "expired", "pending"}
		valid := false
		for _, vs := range validStatuses {
			if status == vs {
				valid = true
				break
			}
		}
		if !valid {
			return fmt.Errorf("invalid status: %s", status)
		}

		oldStatus := string(subscription.Status)
		err = database.UpdateSubscriptionStatus(subscriptionID, status)
		if err == nil {
			log.Printf("[Admin] Subscription status updated: subscription_id=%s, old_status=%s, new_status=%s", subscriptionID, oldStatus, status)
		}
		return err
	}

	return fmt.Errorf("no valid updates provided")
}

// GetSubscriptionStatistics 获取订阅统计（管理员功能）
func GetSubscriptionStatistics() (*models.SubscriptionStatistics, error) {
	stats := &models.SubscriptionStatistics{
		ByStatus:   make(map[string]int),
		ByPlanType: make(map[string]int),
	}

	// 获取总订阅数（不筛选）
	total, err := database.GetSubscriptionCount("", "")
	if err == nil {
		stats.Total = total
	}

	// 获取按状态统计
	statuses := []string{"active", "canceled", "expired", "pending"}
	for _, status := range statuses {
		count, err := database.GetSubscriptionCount(status, "")
		if err == nil {
			stats.ByStatus[status] = count
		}
	}

	// 获取按套餐类型统计
	planTypes := []string{"basic", "pro", "enterprise"}
	for _, planType := range planTypes {
		count, err := database.GetSubscriptionCount("", planType)
		if err == nil {
			stats.ByPlanType[planType] = count
		}
	}

	return stats, nil
}

// AdjustUserCredits 调整用户积分（管理员功能）
func AdjustUserCredits(userID string, amount int, reason string) error {
	if amount == 0 {
		return fmt.Errorf("amount cannot be zero")
	}

	// 验证用户是否存在
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	user, err := database.GetUserByID(userUUID)
	if err != nil || user == nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// 如果扣除积分，DeductCredits函数内部会检查余额
	var err2 error
	if amount < 0 {
		err2 = database.DeductCredits(userID, -amount)
	} else {
		// 增加积分
		err2 = database.AddCredits(userID, amount)
	}

	if err2 == nil {
		log.Printf("[Admin] Credits adjusted: user_id=%s, amount=%d, reason=%s", userID, amount, reason)
	}
	return err2
}

// GetSystemStatistics 获取系统整体统计（管理员功能）
func GetSystemStatistics() (*models.SystemStatistics, error) {
	stats := &models.SystemStatistics{}

	// 获取用户总数
	totalUsers, err := database.GetUserCount("")
	if err == nil {
		stats.TotalUsers = totalUsers
	}

	// 获取活跃用户数（30天内有登录，last_login_at不为NULL）
	activeUsersQuery := `
		SELECT COUNT(DISTINCT id)
		FROM users
		WHERE last_login_at IS NOT NULL 
		AND last_login_at >= NOW() - INTERVAL '30 days'
	`
	var activeUsers int
	err = database.GetDB().QueryRow(activeUsersQuery).Scan(&activeUsers)
	if err == nil {
		stats.ActiveUsers = activeUsers
	}

	// 获取任务统计
	taskStats, err := GetTaskStatistics()
	if err == nil {
		stats.TotalTasks = taskStats.Total
		stats.CompletedTasks = taskStats.ByStatus["completed"]
		stats.TaskStatistics.Pending = taskStats.ByStatus["pending"]
		stats.TaskStatistics.Running = taskStats.ByStatus["running"]
		stats.TaskStatistics.Completed = taskStats.ByStatus["completed"]
		stats.TaskStatistics.Failed = taskStats.ByStatus["failed"]
	}

	// 获取订阅统计
	subStats, err := GetSubscriptionStatistics()
	if err == nil {
		stats.TotalSubscriptions = subStats.Total
		stats.ActiveSubscriptions = subStats.ByStatus["active"]
		stats.SubscriptionStatistics.Basic = subStats.ByPlanType["basic"]
		stats.SubscriptionStatistics.Pro = subStats.ByPlanType["pro"]
		stats.SubscriptionStatistics.Enterprise = subStats.ByPlanType["enterprise"]
	}

	// 获取总积分（所有用户积分总和）
	totalCreditsQuery := `SELECT COALESCE(SUM(credits), 0) FROM user_credits`
	err = database.GetDB().QueryRow(totalCreditsQuery).Scan(&stats.TotalCredits)
	if err != nil {
		stats.TotalCredits = 0
	}

	// 获取总收入（从订单表统计已支付的订单）
	totalRevenueQuery := `
		SELECT COALESCE(SUM(amount), 0)
		FROM orders
		WHERE status = 'paid'
	`
	err = database.GetDB().QueryRow(totalRevenueQuery).Scan(&stats.TotalRevenue)
	if err != nil {
		stats.TotalRevenue = 0
	}

	// 设置日期范围
	stats.DateRange.Start = time.Now().AddDate(0, 0, -30)
	stats.DateRange.End = time.Now()

	return stats, nil
}
