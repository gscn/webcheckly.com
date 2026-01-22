package routes

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"time"
	"web-checkly/database"
	"web-checkly/middleware"
	"web-checkly/models"
	"web-checkly/services"
	"web-checkly/utils"

	"github.com/gofiber/fiber/v2"
)

// 并发控制 - 最多同时处理3个扫描任务
var scanSemaphore = make(chan struct{}, 3)

// 最大URL数量限制
const maxURLs = 200

// contains 检查切片中是否包含指定字符串
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}

// ScanHandler SSE扫描接口（降级方案）
// @Summary SSE扫描接口（降级方案）
// @Description 使用Server-Sent Events进行实时流式扫描。此接口已废弃，建议使用任务管理API（POST /api/scans）。
// @Description
// @Description SSE事件类型：
// @Description - start: 扫描开始
// @Description - result: 单个链接检测结果
// @Description - progress: 进度更新
// @Description - website-info: 网站信息
// @Description - domain-info: 域名信息
// @Description - ssl-info: SSL证书信息
// @Description - tech-stack: 技术栈信息
// @Description - performance-info: 性能指标
// @Description - seo-info: SEO合规性
// @Description - security-info: 安全风险
// @Description - accessibility-info: 可访问性
// @Description - ai-analysis: AI分析报告
// @Description - done: 扫描完成
// @Description - error: 错误信息
// @Tags 扫描
// @Accept json
// @Produce text/event-stream
// @Param url query string true "目标URL" example:"https://example.com"
// @Param options query []string false "扫描选项" collectionFormat(multi) example:"website-info,domain-info"
// @Param lang query string false "语言" Enums(zh,en) default(zh)
// @Param ai_mode query string false "AI分析模式" Enums(performance,security,seo,balanced) default(balanced)
// @Success 200 {string} string "SSE事件流（text/event-stream格式）"
// @Failure 400 {object} map[string]string "请求参数错误（URL格式错误、私有IP等）"
// @Failure 429 {object} map[string]string "请求过于频繁（触发限流）"
// @Failure 503 {object} map[string]string "服务繁忙（并发任务数已达上限）"
// @Router /api/scan [get]
func ScanHandler(c *fiber.Ctx) error {
	raw := c.Query("url")

	// 获取所有options参数（可能多个同名参数）
	optionsArgs := c.Context().QueryArgs().PeekMulti("options")
	var options []string
	for _, arg := range optionsArgs {
		options = append(options, string(arg))
	}

	log.Printf("[ScanHandler] Received scan request for URL: %s, Options: %v", raw, options)

	// 解析选项
	hasWebsiteInfo := contains(options, "website-info")
	hasDomainInfo := contains(options, "domain-info")
	hasSSLInfo := contains(options, "ssl-info") || contains(options, "ssl")
	hasTechStack := contains(options, "tech-stack") || contains(options, "techstack")
	hasLinkHealth := contains(options, "link-health") || len(options) == 0 // 默认启用链接健康检查
	hasAIAnalysis := contains(options, "ai-analysis")

	// 新增性能/SEO/安全/可访问性选项
	hasPerformance := contains(options, "performance")
	hasSEO := contains(options, "seo")
	hasSecurity := contains(options, "security")
	hasAccessibility := contains(options, "accessibility")

	// 只要选择了其中一个，就启用 Lighthouse
	needLighthouse := hasPerformance || hasSEO || hasSecurity || hasAccessibility

	// 解析 AI 分析模式
	aiMode := strings.ToLower(strings.TrimSpace(c.Query("ai_mode")))
	switch aiMode {
	case "performance", "security", "seo", "balanced":
		// 合法模式，保持不变
	case "":
		aiMode = "balanced"
	default:
		// 非法值时回退为 balanced，避免提示错误
		aiMode = "balanced"
	}

	// 解析语言参数（用于AI分析报告）
	lang := strings.ToLower(strings.TrimSpace(c.Query("lang")))
	if lang != "en" && lang != "zh" {
		lang = "zh" // 默认中文
	}

	if raw == "" {
		log.Printf("[ScanHandler] Error: URL parameter is missing")
		return c.Status(400).JSON(fiber.Map{
			"error": "URL parameter is required",
		})
	}

	target, err := utils.NormalizeURL(raw)
	if err != nil {
		log.Printf("[ScanHandler] Error normalizing URL: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid URL",
		})
	}
	log.Printf("[ScanHandler] Normalized URL: %s", target)

	// SSRF防护
	parsedURL, err := url.Parse(target)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid URL format",
		})
	}

	hostname := parsedURL.Hostname()
	log.Printf("[ScanHandler] Parsed hostname: %s", hostname)

	if utils.IsPrivateIP(hostname) {
		log.Printf("[ScanHandler] Error: Private IP detected: %s", hostname)
		return c.Status(400).JSON(fiber.Map{
			"error": "Private IP not allowed",
		})
	}
	log.Printf("[ScanHandler] SSRF check passed for hostname: %s", hostname)

	// ========== 黑名单检查：必须在扫描前进行，存在则立即中断后续流程 ==========

	// 1. 检查网站黑名单（优先检查，因为这是URL级别的检查）
	if database.IsWebsiteBlacklisted(target) {
		log.Printf("[ScanHandler] Website is blacklisted, aborting scan: %s", target)
		return c.Status(403).JSON(fiber.Map{
			"error":   "Website blacklisted",
			"message": "This website is not allowed for detection. Please contact support if you believe this is an error.",
		})
	}

	// 2. 检查用户黑名单（如果用户已登录）
	if userIDPtr := middleware.GetUserID(c); userIDPtr != nil {
		if database.IsUserBlacklisted(*userIDPtr) {
			log.Printf("[ScanHandler] User is blacklisted, aborting scan: %s", userIDPtr.String())
			return c.Status(403).JSON(fiber.Map{
				"error":   "User blacklisted",
				"message": "Your account has been restricted from creating detection tasks. Please contact support for assistance.",
			})
		}
	}

	// ========== 黑名单检查完成，继续后续流程 ==========

	// 并发控制 - 防止资源耗尽
	select {
	case scanSemaphore <- struct{}{}:
		defer func() { <-scanSemaphore }()
	case <-time.After(10 * time.Second):
		log.Printf("[ScanHandler] Service busy, semaphore timeout")
		return c.Status(503).JSON(fiber.Map{
			"error": "Service busy, please try again later",
		})
	}

	// 设置SSE响应头
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	// 启用流式响应模式，允许实时刷新
	// 通过设置ImmediateHeaderFlush来确保数据立即发送
	c.Context().Response.ImmediateHeaderFlush = true

	// 创建带超时的context（60秒整体超时，增加时间以处理更多URL）
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// 预先声明，用于后续 AI 分析聚合
	var websiteInfo *models.WebsiteInfo
	var domainInfo *models.DomainInfo
	var sslInfo *models.SSLInfo
	var techStack *models.TechStack
	var performance *models.PerformanceMetrics
	var seoCompliance *models.SEOCompliance
	var securityRisk *models.SecurityRisk
	var accessibility *models.AccessibilityInfo
	var lighthouseReport *services.FullLighthouseReport

	// 使用 WaitGroup 并行收集基础信息和运行 Lighthouse
	var wg sync.WaitGroup

	// 1. 运行 Lighthouse (耗时最长)
	if needLighthouse {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report, err := services.RunLighthouse(target, lang)
			if err != nil {
				log.Printf("[ScanHandler] Lighthouse scan failed: %v", err)
				return
			}
			lighthouseReport = report

			// 根据用户选择解析并发送相关指标
			if hasPerformance {
				performance = services.ParsePerformanceMetrics(report)
				services.SendSSE(c, "performance-info", performance)
			}

			if hasSEO {
				// SEO 解析需要原始 HTML 来计算可见性，这里我们先简单处理
				seoCompliance = services.ParseSEOCompliance(report, "")
				services.SendSSE(c, "seo-info", seoCompliance)
			}

			if hasSecurity {
				securityRisk = services.ParseSecurityRisk(report, lang)
				services.SendSSE(c, "security-info", securityRisk)
			}

			if hasAccessibility {
				accessibility = services.ParseAccessibilityInfo(report, lang)
				services.SendSSE(c, "accessibility-info", accessibility)
			}
		}()
	}

	// 2. 收集网站基础信息 (并行)
	if hasWebsiteInfo {
		wg.Add(1)
		go func() {
			defer wg.Done()
			log.Printf("[ScanHandler] Collecting website info...")
			wInfo, err := services.CollectWebsiteInfo(target)
			if err != nil {
				log.Printf("[ScanHandler] Error collecting website info: %v", err)
			} else {
				websiteInfo = wInfo
				services.SendSSE(c, "website-info", websiteInfo)
			}
		}()
	}

	// 3. 收集域名信息 (并行)
	if hasDomainInfo {
		wg.Add(1)
		go func() {
			defer wg.Done()
			log.Printf("[ScanHandler] Collecting domain info...")
			dInfo, err := services.CollectDomainInfo(target)
			if err != nil {
				log.Printf("[ScanHandler] Error collecting domain info: %v", err)
			} else {
				domainInfo = dInfo
				services.SendSSE(c, "domain-info", domainInfo)
			}
		}()
	}

	// 4. 收集 SSL 信息 (并行)
	if hasSSLInfo {
		wg.Add(1)
		go func() {
			defer wg.Done()
			log.Printf("[ScanHandler] Collecting SSL certificate info...")
			sInfo, err := services.CollectSSLInfo(target)
			if err != nil {
				log.Printf("[ScanHandler] Error collecting SSL info: %v", err)
			} else {
				sslInfo = sInfo
				services.SendSSE(c, "ssl-info", sslInfo)
			}
		}()
	}

	// 5. 收集技术栈信息 (并行)
	if hasTechStack {
		wg.Add(1)
		go func() {
			defer wg.Done()
			log.Printf("[ScanHandler] Collecting tech stack info...")
			tStack, err := services.CollectTechStack(target)
			if err != nil {
				log.Printf("[ScanHandler] Error collecting tech stack: %v", err)
			} else {
				techStack = tStack
				services.SendSSE(c, "tech-stack", techStack)
			}
		}()
	}

	// 等待所有基础信息收集完成
	wg.Wait()
	// 确保在请求结束前清除 Lighthouse 缓存
	defer services.ClearLighthouseCache(target)

	// 如果没有启用链接健康检查，直接返回
	if !hasLinkHealth {
		log.Printf("[ScanHandler] Link health check disabled, sending done event")
		services.SendSSE(c, "done", fiber.Map{
			"total": 0,
			"alive": 0,
			"dead":  0,
		})
		return nil
	}

	// 提取页面URL (传入 lighthouseReport 以优化提取)
	urls, err := services.ExtractPageUrls(target, lighthouseReport)
	if err != nil {
		log.Printf("[ScanHandler] Error extracting URLs: %v", err)
		services.SendSSE(c, "error", fiber.Map{
			"message": "Failed to crawl page: " + err.Error(),
		})
		return nil
	}

	log.Printf("[ScanHandler] Extracted %d URLs from page", len(urls))

	// 对URL进行去重（使用map确保唯一性）
	urlMap := make(map[string]bool)
	uniqueURLs := make([]string, 0, len(urls))
	for _, u := range urls {
		// 规范化URL用于去重（移除尾部斜杠、统一大小写等）
		normalized := strings.TrimRight(strings.ToLower(u), "/")
		if !urlMap[normalized] {
			urlMap[normalized] = true
			uniqueURLs = append(uniqueURLs, u) // 保留原始URL格式
		}
	}

	urls = uniqueURLs
	log.Printf("[ScanHandler] After deduplication: %d unique URLs", len(urls))

	// 再次检查URL数量（防止在提取过程中超过限制）
	if len(urls) > maxURLs {
		log.Printf("[ScanHandler] URL count (%d) exceeds limit (%d) after extraction", len(urls), maxURLs)
		services.SendSSE(c, "error", fiber.Map{
			"message": fmt.Sprintf("Too many URLs found (%d). Maximum allowed: %d", len(urls), maxURLs),
		})
		return nil
	}

	if len(urls) == 0 {
		log.Printf("[ScanHandler] WARNING: No URLs found in the page")
		services.SendSSE(c, "error", fiber.Map{
			"message": "No URLs found in the page. Please check if the URL is accessible and contains links.",
		})
		return nil
	}

	for i, u := range urls {
		log.Printf("[ScanHandler] URL %d: %s", i+1, u)
	}

	// 发送开始事件
	services.SendSSE(c, "start", fiber.Map{
		"total":   len(urls),
		"message": "Starting scan...",
	})

	// 启动httpx检测
	results := make(chan models.HttpxResult, 100)
	errChan := make(chan error, 1)

	go func() {
		defer close(errChan)
		// RunHttpx 内部负责关闭 channel，这里不需要关闭
		err := services.RunHttpx(ctx, urls, results)
		if err != nil {
			log.Printf("[ScanHandler] RunHttpx returned error: %v", err)
			select {
			case errChan <- err:
			default:
			}
		} else {
			log.Printf("[ScanHandler] RunHttpx completed without error")
		}
	}()

	total := len(urls)
	count := 0
	alive := 0
	totalResponseTime := 0

	// 如需 AI 分析，则在内存中保留一份结果（最多 200 条）
	var allResults []models.HttpxResult

	for {
		select {
		case <-ctx.Done():
			log.Printf("[ScanHandler] Context timeout. Processed %d/%d results", count, total)
			services.SendSSE(c, "done", fiber.Map{
				"total":   total,
				"scanned": count,
				"alive":   alive,
				"timeout": true,
			})
			return nil
		case err, ok := <-errChan:
			if !ok {
				// errChan 已关闭，设置为 nil 以避免重复选择
				// 在 select 中，nil channel 永远不会被选择
				errChan = nil
				continue
			}
			if err != nil {
				log.Printf("[ScanHandler] Received error from httpx: %v", err)
				services.SendSSE(c, "error", fiber.Map{
					"message": "httpx execution failed: " + err.Error(),
				})
				return nil
			}
		case res, ok := <-results:
			if !ok {
				// 所有结果已接收
				log.Printf("[ScanHandler] Results channel closed. Total received: %d/%d", count, total)
				avgResponse := 0
				if count > 0 {
					avgResponse = totalResponseTime / count
				}
				log.Printf("[ScanHandler] Final stats: Total=%d, Alive=%d, Dead=%d, AvgResponse=%dms",
					total, alive, count-alive, avgResponse)

				// 如果启用了 AI 分析，则在发送 done 事件之前先生成 AI 分析结果
				if hasAIAnalysis {
					log.Printf("[ScanHandler] Generating AI analysis...")
					summary := models.ScanSummary{
						Total:       total,
						Alive:       alive,
						Dead:        count - alive,
						AvgResponse: avgResponse,
						Timeout:     false,
					}

					input := &models.AIAnalysisInput{
						Target:        target,
						Summary:       summary,
						Results:       allResults,
						WebsiteInfo:   websiteInfo,
						DomainInfo:    domainInfo,
						SSLInfo:       sslInfo,
						TechStack:     techStack,
						Performance:   performance,
						SEO:           seoCompliance,
						Security:      securityRisk,
						Accessibility: accessibility,
						Mode:          aiMode,
						Language:      lang,
					}

					analysis, err := services.GenerateAIAnalysis(ctx, input)
					if err != nil {
						log.Printf("[ScanHandler] Error generating AI analysis: %v", err)
						services.SendSSE(c, "error", fiber.Map{
							"message": "Failed to generate AI analysis: " + err.Error(),
						})
					} else {
						if err := services.SendSSE(c, "ai-analysis", analysis); err != nil {
							log.Printf("[ScanHandler] Error sending AI analysis SSE: %v", err)
						}
					}
				}

				services.SendSSE(c, "done", fiber.Map{
					"total":        total,
					"alive":        alive,
					"dead":         count - alive,
					"avg_response": avgResponse,
				})
				return nil
			}

			count++
			// log.Printf("[ScanHandler] Received result %d/%d: URL=%s, Status=%d", count, total, res.URL, res.StatusCode)

			if res.StatusCode > 0 {
				alive++
			}
			if res.ResponseTime > 0 {
				totalResponseTime += res.ResponseTime
			}

			// 发送结果
			if err := services.SendSSE(c, "result", res); err != nil {
				log.Printf("[ScanHandler] Error sending SSE result: %v", err)
			}

			// 为 AI 分析保留一份结果副本
			if hasAIAnalysis {
				allResults = append(allResults, res)
			}

			// 发送进度
			if err := services.SendSSE(c, "progress", fiber.Map{
				"current": count,
				"total":   total,
			}); err != nil {
				log.Printf("[ScanHandler] Error sending SSE progress: %v", err)
			}
		}
	}
}
