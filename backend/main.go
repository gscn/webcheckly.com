// @title WebCheckly API
// @version 1.0
// @description WebCheckly 网站检测服务 API 文档
// @termsOfService http://swagger.io/terms/
// @contact.name API Support
// @contact.email support@webcheckly.com
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
// @host localhost:8080
// @BasePath /
// @schemes http https
//
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
// @description 可选：Bearer token认证（当前版本暂未启用）
package main

import (
	"fmt"
	"log"
	"os"
	"time"
	"web-checkly/database"
	"web-checkly/middleware"
	"web-checkly/routes"
	"web-checkly/services"
	"web-checkly/services/payment"
	"web-checkly/services/plugins"
	"web-checkly/utils"

	_ "web-checkly/docs" // 导入生成的docs包

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	fiberSwagger "github.com/swaggo/fiber-swagger"
)

// healthCheckHandler 健康检查
// @Summary 健康检查
// @Description 检查服务是否正常运行，返回服务状态和当前时间戳。此接口不受限流影响，可用于监控服务可用性。
// @Tags 系统
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "服务状态正常"
// @Router /health [get]
func healthCheckHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "ok",
		"timestamp": time.Now().Unix(),
	})
}

func main() {
	// 优先从本地环境变量文件加载配置（.env.local / .env）
	utils.LoadEnvFromFile()

	// 初始化数据库
	if err := database.InitDB(); err != nil {
		log.Fatalf("[Main] Failed to initialize database: %v", err)
	}
	defer func() {
		if err := database.CloseDB(); err != nil {
			log.Printf("[Main] Error closing database: %v", err)
		}
	}()

	// 执行数据库迁移
	if err := database.RunMigrations(); err != nil {
		log.Fatalf("[Main] Failed to run migrations: %v", err)
	}

	// 初始化JWT
	if err := utils.InitJWT(); err != nil {
		log.Fatalf("[Main] Failed to initialize JWT: %v", err)
	}

	// 初始化Stripe（可选，如果未配置则只记录警告）
	// if err := payment.InitStripe(); err != nil {
	// 	log.Printf("[Main] Warning: Stripe payment is not configured: %v. Payment features will be disabled.", err)
	// } else {
	// 	log.Printf("[Main] Stripe payment initialized successfully")
	// }

	// 验证必需的命令是否可用（非阻塞，只记录警告）
	if err := services.VerifyCommands(); err != nil {
		log.Printf("[Main] Warning: Some required commands are not available: %v", err)
		log.Printf("[Main] Note: This may cause some features to fail. Please ensure katana and lighthouse are installed and in PATH.")
	} else {
		log.Printf("[Main] All required commands verified successfully")
	}

	// 初始化PayPal（可选，如果未配置则只记录警告）
	if err := payment.InitPayPal(); err != nil {
		log.Printf("[Main] Warning: PayPal payment is not configured: %v. PayPal payment features will be disabled.", err)
	} else {
		log.Printf("[Main] PayPal payment initialized successfully")
	}

	// 启动定时任务
	services.StartScheduler()

	// 初始化插件系统
	plugins.InitPlugins()

	app := fiber.New(fiber.Config{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
		BodyLimit:    10 * 1024 * 1024, // 10MB
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": "Internal server error",
			})
		},
	})

	// 恢复中间件 - 防止panic导致服务崩溃
	app.Use(recover.New())

	// 请求ID中间件 - 便于日志追踪
	app.Use(requestid.New())

	// CORS配置 - 允许前端访问
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,Cache-Control,Pragma",
		AllowCredentials: true,
		MaxAge:           86400, // 24小时
	}))

	// 全局限流已移除 - 除了 /api/scans POST 接口外，所有接口不再限流

	// 认证路由（不需要认证，已移除限流）
	authRoutes := app.Group("/api/auth")
	authRoutes.Post("/register", routes.RegisterHandler)
	authRoutes.Post("/login", routes.LoginHandler)
	authRoutes.Post("/verify-email", routes.VerifyEmailHandler)
	authRoutes.Post("/resend-verification", routes.ResendVerificationHandler)
	authRoutes.Post("/forgot-password", routes.ForgotPasswordHandler)
	authRoutes.Post("/reset-password", routes.ResetPasswordHandler)
	authRoutes.Post("/refresh", routes.RefreshTokenHandler)
	authRoutes.Post("/logout", routes.LogoutHandler)

	// 需要认证的路由
	authRequiredRoutes := app.Group("/api/auth", middleware.RequireAuth())
	authRequiredRoutes.Get("/me", routes.GetMeHandler)

	// OAuth路由（预留）
	oauthRoutes := app.Group("/api/auth/oauth")
	oauthRoutes.Get("/:provider", routes.InitiateOAuthHandler)
	oauthRoutes.Get("/:provider/callback", routes.OAuthCallbackHandler)

	// 任务创建限流器（防止短时间内重复创建任务）
	// 对于已登录用户：每分钟最多10次创建任务
	// 对于匿名用户：每分钟最多5次创建任务（基于IP）
	scanCreateLimiter := limiter.New(limiter.Config{
		Max:        10, // 每分钟最多10次（已登录用户）
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// 对于已认证的请求，使用用户ID
			userID := middleware.GetUserID(c)
			if userID != nil {
				return fmt.Sprintf("scan:user:%s", userID.String())
			}
			// 对于匿名请求，使用IP地址
			ip := c.IP()
			if forwarded := c.Get("X-Forwarded-For"); forwarded != "" {
				ip = forwarded
			}
			return fmt.Sprintf("scan:ip:%s", ip)
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error":   "Too many scan requests",
				"message": "Please wait a moment before creating another scan task.",
			})
		},
		SkipFailedRequests:     false,
		SkipSuccessfulRequests: false,
	})

	// 任务管理 API 路由
	// 使用OptionalAuth中间件，支持匿名和已登录用户
	taskRoutes := app.Group("/api/scans", middleware.OptionalAuth())
	// 任务创建端点使用限流器
	taskRoutes.Post("/", scanCreateLimiter, routes.CreateTaskHandler)
	taskRoutes.Get("/:id", routes.GetTaskStatusHandler)
	taskRoutes.Get("/:id/results", routes.GetTaskResultsHandler)
	taskRoutes.Get("/:id/stream", routes.StreamTaskHandler) // SSE流式响应端点

	// 用户任务列表（需要认证，已移除限流）
	userTaskRoutes := app.Group("/api/tasks", middleware.RequireAuth())
	userTaskRoutes.Get("/", routes.GetUserTasksHandler)
	userTaskRoutes.Delete("/:id", routes.DeleteUserTaskHandler)

	// 付费系统路由（需要认证）
	paymentRoutes := app.Group("/api/payment", middleware.RequireAuth())
	paymentRoutes.Post("/create-checkout", routes.CreateCheckoutHandler)
	paymentRoutes.Get("/verify/:orderId", routes.VerifyPaymentHandler)
	paymentRoutes.Post("/confirm", routes.ConfirmPaymentHandler)
	paymentRoutes.Get("/verify-session", routes.VerifySessionHandler)
	app.Post("/api/payment/webhook", routes.WebhookHandler)              // Stripe Webhook不需要认证，使用Stripe签名验证
	app.Post("/api/payment/paypal-webhook", routes.PayPalWebhookHandler) // PayPal Webhook不需要认证，使用PayPal签名验证

	orderRoutes := app.Group("/api/orders", middleware.RequireAuth())
	orderRoutes.Post("/create", routes.CreateOrderHandler)
	orderRoutes.Get("/:id", routes.GetOrderHandler)
	orderRoutes.Get("/", routes.GetOrdersHandler)
	orderRoutes.Post("/:id/cancel", routes.CancelOrderHandler)

	// 积分路由（需要认证，已移除限流）
	creditsRoutes := app.Group("/api/credits", middleware.RequireAuth())
	creditsRoutes.Get("/balance", routes.GetCreditsBalanceHandler)
	creditsRoutes.Post("/purchase", routes.PurchaseCreditsHandler)
	creditsRoutes.Get("/usage", routes.GetUsageRecordsHandler)
	creditsRoutes.Get("/stats", routes.GetUsageStatsHandler)

	// Dashboard统一数据端点（需要认证，已移除限流）
	dashboardRoutes := app.Group("/api/dashboard", middleware.RequireAuth())
	dashboardRoutes.Get("/", routes.GetDashboardDataHandler)

	// 管理员路由（需要认证和管理员权限）
	// 注意：管理员接口不设置限流，因为管理员需要频繁操作且已通过严格的身份验证
	adminRoutes := app.Group("/api/admin", middleware.RequireAuth(), middleware.RequireAdmin())
	// 用户管理
	adminRoutes.Get("/users", routes.GetUsersListHandler)
	adminRoutes.Get("/users/:id", routes.GetUserDetailsHandler)
	adminRoutes.Put("/users/:id/role", routes.UpdateUserRoleHandler)
	adminRoutes.Put("/users/:id/status", routes.UpdateUserStatusHandler)
	adminRoutes.Put("/users/:id/info", routes.UpdateUserInfoHandler)
	adminRoutes.Delete("/users/:id", routes.DeleteUserHandler)
	// 任务管理
	adminRoutes.Get("/tasks", routes.GetAllTasksHandler)
	adminRoutes.Get("/tasks/:id", routes.GetTaskDetailsHandler)
	adminRoutes.Delete("/tasks/:id", routes.DeleteTaskHandler)
	adminRoutes.Get("/tasks/statistics", routes.GetTaskStatisticsHandler)
	// 订阅管理
	adminRoutes.Get("/subscriptions", routes.GetAllSubscriptionsHandler)
	adminRoutes.Put("/subscriptions/:id", routes.UpdateSubscriptionHandler)
	adminRoutes.Get("/subscriptions/statistics", routes.GetSubscriptionStatisticsHandler)
	// 积分管理
	adminRoutes.Post("/credits/adjust", routes.AdjustUserCreditsHandler)
	adminRoutes.Get("/credits/records", routes.GetCreditsRecordsHandler)
	adminRoutes.Get("/credits/statistics", routes.GetCreditsStatisticsHandler)
	// 系统统计
	adminRoutes.Get("/statistics", routes.GetSystemStatisticsHandler)
	// 收入对账
	adminRoutes.Get("/revenue/orders", routes.GetRevenueOrdersHandler)
	adminRoutes.Get("/revenue/statistics", routes.GetRevenueStatisticsHandler)
	adminRoutes.Get("/revenue/export", routes.ExportRevenueOrdersHandler)
	// 黑名单管理
	adminRoutes.Post("/blacklist/websites", routes.CreateWebsiteBlacklistHandler)
	adminRoutes.Get("/blacklist/websites", routes.GetWebsiteBlacklistListHandler)
	adminRoutes.Put("/blacklist/websites/:id/status", routes.ToggleWebsiteBlacklistStatusHandler)
	adminRoutes.Delete("/blacklist/websites/:id", routes.DeleteWebsiteBlacklistHandler)
	adminRoutes.Post("/blacklist/users", routes.CreateUserBlacklistHandler)
	adminRoutes.Get("/blacklist/users", routes.GetUserBlacklistListHandler)
	adminRoutes.Put("/blacklist/users/:id/status", routes.ToggleUserBlacklistStatusHandler)
	adminRoutes.Delete("/blacklist/users/:id", routes.DeleteUserBlacklistHandler)

	// 公开的定价和套餐路由（无需认证）
	app.Get("/api/subscription/plans", routes.GetSubscriptionPlansHandler)
	app.Get("/api/pricing/features", routes.GetFeaturePricingHandler)

	// 需要认证的订阅路由（已移除限流）
	subscriptionRoutes := app.Group("/api/subscription", middleware.RequireAuth())
	subscriptionRoutes.Get("/status", routes.GetSubscriptionStatusHandler)
	subscriptionRoutes.Get("/usage", routes.GetMonthlyUsageHandler)
	subscriptionRoutes.Post("/subscribe", routes.CreateSubscriptionHandler)
	subscriptionRoutes.Post("/cancel", routes.CancelSubscriptionHandler)

	// API访问路由
	// 统计接口只需要认证（用于查看自己的使用情况）
	apiAccessStatsRoutes := app.Group("/api/api-access", middleware.RequireAuth())
	apiAccessStatsRoutes.Get("/stats", routes.GetAPIAccessStatsHandler)
	apiAccessStatsRoutes.Get("/records", routes.GetAPIAccessRecordsHandler)

	// Swagger文档路由
	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	// 健康检查
	app.Get("/health", healthCheckHandler)

	// 扫描接口（保留原有 SSE 接口作为降级方案）
	app.Get("/api/scan", routes.ScanHandler)

	// 注意：任务管理 API 路由已在上面通过 taskRoutes 注册，这里不再重复注册

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running at http://localhost:%s", port)
	log.Fatal(app.Listen(":" + port))
}
