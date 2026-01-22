package routes

import (
	"log"
	"time"
	"web-checkly/middleware"
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// GetDashboardDataHandler 获取dashboard统一数据
func GetDashboardDataHandler(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// 并行获取所有数据
	creditsChan := make(chan *struct {
		data interface{}
		err  error
	}, 1)
	subscriptionChan := make(chan *struct {
		data interface{}
		err  error
	}, 1)
	monthlyUsageChan := make(chan *struct {
		data interface{}
		err  error
	}, 1)
	usageStatsChan := make(chan *struct {
		data interface{}
		err  error
	}, 1)

	// 获取积分余额
	go func() {
		credits, err := services.GetUserCredits(userID.String())
		if err != nil {
			creditsChan <- &struct {
				data interface{}
				err  error
			}{nil, err}
			return
		}
		creditsChan <- &struct {
			data interface{}
			err  error
		}{credits, nil}
	}()

	// 获取订阅状态
	go func() {
		subscription, err := services.GetUserSubscription(userID.String())
		if err != nil {
			subscriptionChan <- &struct {
				data interface{}
				err  error
			}{nil, err}
			return
		}
		subscriptionChan <- &struct {
			data interface{}
			err  error
		}{subscription, nil}
	}()

	// 获取月度使用记录
	go func() {
		usage, err := services.GetMonthlyUsage(userID.String(), time.Now())
		if err != nil {
			monthlyUsageChan <- &struct {
				data interface{}
				err  error
			}{nil, err}
			return
		}
		monthlyUsageChan <- &struct {
			data interface{}
			err  error
		}{usage, nil}
	}()

	// 获取使用统计（最近30天）
	go func() {
		startDate := time.Now().AddDate(0, 0, -30)
		endDate := time.Now()
		stats, err := services.GetUsageStats(userID.String(), startDate, endDate)
		if err != nil {
			usageStatsChan <- &struct {
				data interface{}
				err  error
			}{nil, err}
			return
		}
		usageStatsChan <- &struct {
			data interface{}
			err  error
		}{stats, nil}
	}()

	// 获取API访问统计
	apiAccessStatsChan := make(chan *struct {
		data interface{}
		err  error
	}, 1)
	go func() {
		stats, err := services.GetAPIAccessStats(userID.String())
		if err != nil {
			apiAccessStatsChan <- &struct {
				data interface{}
				err  error
			}{nil, err}
			return
		}
		apiAccessStatsChan <- &struct {
			data interface{}
			err  error
		}{stats, nil}
	}()

	// 收集结果
	var credits interface{}
	var subscription interface{}
	var monthlyUsage interface{}
	var usageStats interface{}

	creditsResult := <-creditsChan
	if creditsResult.err != nil {
		log.Printf("[Dashboard] Failed to get credits: %v", creditsResult.err)
	} else {
		credits = creditsResult.data
	}

	subscriptionResult := <-subscriptionChan
	if subscriptionResult.err != nil {
		log.Printf("[Dashboard] Failed to get subscription: %v", subscriptionResult.err)
	} else {
		subscription = subscriptionResult.data
	}

	monthlyUsageResult := <-monthlyUsageChan
	if monthlyUsageResult.err != nil {
		log.Printf("[Dashboard] Failed to get monthly usage: %v", monthlyUsageResult.err)
	} else {
		monthlyUsage = monthlyUsageResult.data
	}

	usageStatsResult := <-usageStatsChan
	if usageStatsResult.err != nil {
		log.Printf("[Dashboard] Failed to get usage stats: %v", usageStatsResult.err)
	} else {
		usageStats = usageStatsResult.data
	}

	var apiAccessStats interface{}
	apiAccessStatsResult := <-apiAccessStatsChan
	if apiAccessStatsResult.err != nil {
		log.Printf("[Dashboard] Failed to get API access stats: %v", apiAccessStatsResult.err)
	} else {
		apiAccessStats = apiAccessStatsResult.data
	}

	// 获取套餐信息（用于显示限制）
	plans := services.GetPricingPlans()
	planMap := make(map[string]map[string]interface{})
	for _, plan := range plans {
		planMap[plan.PlanType] = map[string]interface{}{
			"plan_type":             plan.PlanType,
			"plan_name":             plan.PlanName,
			"monthly_price_cny":     plan.MonthlyPriceCNY,
			"monthly_price_usd":     plan.MonthlyPriceUSD,
			"basic_scans_limit":     plan.BasicScansLimit,
			"monthly_credits_limit": plan.MonthlyCreditsLimit,
			"task_history_days":     plan.TaskHistoryDays,
			"api_access_limit":      plan.APIAccessLimit,
			"features":              plan.Features,
		}
	}

	return c.JSON(fiber.Map{
		"credits":          credits,
		"subscription":     subscription,
		"monthly_usage":    monthlyUsage,
		"usage_stats":      usageStats,
		"api_access_stats": apiAccessStats,
		"plans":            planMap,
	})
}
