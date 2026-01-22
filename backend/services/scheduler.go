package services

import (
	"log"
	"time"
	"web-checkly/database"
)

// StartScheduler 启动定时任务
func StartScheduler() {
	// 每月1号重置免费次数和月度积分
	go scheduleMonthlyReset()

	// 每小时清理过期订单
	go scheduleOrderCleanup()

	// 每天清理过期任务
	go scheduleTaskCleanup()

	// 每天检查订阅到期
	go scheduleSubscriptionCheck()

	log.Println("[Scheduler] All scheduled tasks started")
}

// scheduleMonthlyReset 每月1号重置月度积分
func scheduleMonthlyReset() {
	ticker := time.NewTicker(1 * time.Hour) // 每小时检查一次
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		// 如果是每月1号且是凌晨
		if now.Day() == 1 && now.Hour() == 0 {
			log.Println("[Scheduler] Starting monthly reset...")

			// 重置订阅用户的月度积分使用
			nextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())
			query := `UPDATE user_credits SET monthly_credits_used = 0, monthly_credits_reset_at = $1 WHERE monthly_credits_reset_at < $1`
			result, err := database.GetDB().Exec(query, nextMonth)
			if err != nil {
				log.Printf("[Scheduler] Failed to reset monthly credits: %v", err)
			} else {
				rowsAffected, _ := result.RowsAffected()
				log.Printf("[Scheduler] Reset monthly credits for %d users", rowsAffected)
			}
		}
	}
}

// scheduleOrderCleanup 每小时清理过期订单
func scheduleOrderCleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		if err := CleanupExpiredOrders(); err != nil {
			log.Printf("[Scheduler] Failed to cleanup expired orders: %v", err)
		}
	}
}

// scheduleTaskCleanup 每天清理过期任务
func scheduleTaskCleanup() {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		if err := database.DeleteExpiredTasks(); err != nil {
			log.Printf("[Scheduler] Failed to cleanup expired tasks: %v", err)
		}
	}
}

// scheduleSubscriptionCheck 每天检查订阅到期
func scheduleSubscriptionCheck() {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		query := `
			UPDATE subscriptions
			SET status = 'expired', updated_at = NOW()
			WHERE status = 'active' AND expires_at < NOW()
		`

		result, err := database.GetDB().Exec(query)
		if err != nil {
			log.Printf("[Scheduler] Failed to check subscription expiry: %v", err)
		} else {
			rowsAffected, _ := result.RowsAffected()
			if rowsAffected > 0 {
				log.Printf("[Scheduler] Expired %d subscriptions", rowsAffected)
			}
		}
	}
}
