package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"web-checkly/models"
)

// deepSeekMessage 表示 DeepSeek Chat 接口的消息结构
type deepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// deepSeekRequest Chat Completions 请求体
type deepSeekRequest struct {
	Model       string            `json:"model"`
	Messages    []deepSeekMessage `json:"messages"`
	Temperature float32           `json:"temperature"`
}

// deepSeekChoice 部分响应结构
type deepSeekChoice struct {
	Message deepSeekMessage `json:"message"`
}

// deepSeekResponse Chat Completions 响应体简化
type deepSeekResponse struct {
	Choices []deepSeekChoice `json:"choices"`
}

// aiAnalysisPayload 用于从 DeepSeek 返回的 JSON 中解析结构化内容
type aiAnalysisPayload struct {
	Summary string `json:"summary"`

	RiskLevel            string   `json:"risk_level"`
	AvailabilityScore    int      `json:"availability_score"`
	PerformanceScore     int      `json:"performance_score"`
	SecurityScore        int      `json:"security_score"`
	SEOScore             int      `json:"seo_score"`
	Highlights           []string `json:"highlights"`
	AvailabilityFindings []string `json:"availability_findings"`
	PerformanceFindings  []string `json:"performance_findings"`
	SecurityFindings     []string `json:"security_findings"`
	SEOFindings          []string `json:"seo_findings"`
	Recommendations      []string `json:"recommendations"`
}

var deepSeekHTTPClient = &http.Client{
	Timeout: 120 * time.Second, // 增加到 120 秒，因为 AI 分析可能需要较长时间
}

// buildAIAnalysisPrompt 构造发给 DeepSeek 的提示词
func buildAIAnalysisPrompt(input *models.AIAnalysisInput) string {
	builder := &bytes.Buffer{}

	mode := input.Mode
	if mode == "" {
		mode = "balanced"
	}

	// 确定输出语言
	lang := input.Language
	if lang != "en" && lang != "zh" {
		lang = "zh" // 默认中文
	}

	// 根据语言和模式生成角色描述
	if lang == "en" {
		// 英文提示词
		switch mode {
		case "performance":
			fmt.Fprintf(builder, "You are a senior website performance optimization expert. Please focus on analyzing the website from perspectives such as \"response time, resource loading, frontend and backend performance bottlenecks\" and provide actionable performance optimization recommendations.\n")
		case "security":
			fmt.Fprintf(builder, "You are a senior web security and operations expert. Please focus on analyzing the website's security status from perspectives such as \"availability risks, SSL/TLS, security response headers, potential attack surfaces\" and provide security hardening recommendations.\n")
		case "seo":
			fmt.Fprintf(builder, "You are a senior SEO and website operations expert. Please focus on analyzing the website's SEO status from perspectives such as \"page metadata, structured information, accessibility, internationalization, multi-device adaptation\" and provide optimization recommendations.\n")
		default: // balanced
			fmt.Fprintf(builder, "You are a senior website operations and performance optimization expert. Please provide a balanced health report for the website from four dimensions: \"availability, performance, security, SEO\".\n")
		}
		fmt.Fprintf(builder, "Current analysis mode: %s\n", mode)
		fmt.Fprintf(builder, "Target website: %s\n", input.Target)
		fmt.Fprintf(builder, "\n[Basic Statistics]\n")
		fmt.Fprintf(builder, "- Total URLs: %d\n", input.Summary.Total)
		fmt.Fprintf(builder, "- Available URLs: %d\n", input.Summary.Alive)
		fmt.Fprintf(builder, "- Unavailable URLs: %d\n", input.Summary.Dead)
		fmt.Fprintf(builder, "- Average response time (ms): %d\n", input.Summary.AvgResponse)
		if input.Summary.Timeout {
			fmt.Fprintf(builder, "- Timeout occurred: Yes\n")
		} else {
			fmt.Fprintf(builder, "- Timeout occurred: No\n")
		}
	} else {
		// 中文提示词
		switch mode {
		case "performance":
			fmt.Fprintf(builder, "你是一名资深网站性能优化专家，请重点从\"响应时间、资源加载、前后端性能瓶颈\"等角度分析网站状况，并给出可执行的性能优化建议。\n")
		case "security":
			fmt.Fprintf(builder, "你是一名资深Web安全与运维专家，请重点从\"可用性风险、SSL/TLS、安全响应头、潜在攻击面\"等角度分析网站安全状况，并给出安全加固建议。\n")
		case "seo":
			fmt.Fprintf(builder, "你是一名资深SEO与网站运营专家，请重点从\"页面元信息、结构化信息、可访问性、国际化、多端适配\"等角度分析网站的SEO状况，并给出优化建议。\n")
		default: // balanced
			fmt.Fprintf(builder, "你是一名资深网站运维与性能优化专家，请综合从\"可用性、性能、安全、SEO\"四个维度，对网站给出平衡的体检报告。\n")
		}
		fmt.Fprintf(builder, "当前分析模式: %s\n", mode)
		fmt.Fprintf(builder, "目标网站: %s\n", input.Target)
		fmt.Fprintf(builder, "\n[基础统计]\n")
		fmt.Fprintf(builder, "- 总 URL 数: %d\n", input.Summary.Total)
		fmt.Fprintf(builder, "- 可用 URL 数: %d\n", input.Summary.Alive)
		fmt.Fprintf(builder, "- 不可用 URL 数: %d\n", input.Summary.Dead)
		fmt.Fprintf(builder, "- 平均响应时间(ms): %d\n", input.Summary.AvgResponse)
		if input.Summary.Timeout {
			fmt.Fprintf(builder, "- 是否发生超时: 是\n")
		} else {
			fmt.Fprintf(builder, "- 是否发生超时: 否\n")
		}
	}

	if lang == "en" {
		// 英文数据展示
		if input.WebsiteInfo != nil {
			fmt.Fprintf(builder, "\n[Website Information]\n")
			fmt.Fprintf(builder, "Title: %s\n", input.WebsiteInfo.Title)
			fmt.Fprintf(builder, "Description: %s\n", input.WebsiteInfo.Description)
			fmt.Fprintf(builder, "Language: %s\n", input.WebsiteInfo.Language)
			fmt.Fprintf(builder, "Charset: %s\n", input.WebsiteInfo.Charset)
			fmt.Fprintf(builder, "Author: %s\n", input.WebsiteInfo.Author)
			fmt.Fprintf(builder, "Generator: %s\n", input.WebsiteInfo.Generator)
			fmt.Fprintf(builder, "Robots: %s\n", input.WebsiteInfo.Robots)
		}

		if input.DomainInfo != nil {
			fmt.Fprintf(builder, "\n[Domain Information]\n")
			fmt.Fprintf(builder, "Domain: %s, IP: %s, Country: %s, City: %s, ISP: %s, Organization: %s\n",
				input.DomainInfo.Domain,
				input.DomainInfo.IP,
				input.DomainInfo.Country,
				input.DomainInfo.City,
				input.DomainInfo.ISP,
				input.DomainInfo.Organization,
			)
		}

		if input.SSLInfo != nil {
			fmt.Fprintf(builder, "\n[SSL Certificate]\n")
			fmt.Fprintf(builder, "Issuer: %s, Subject: %s, Valid Period: %s ~ %s, Is Valid: %v, Days Remaining: %d\n",
				input.SSLInfo.Issuer,
				input.SSLInfo.Subject,
				input.SSLInfo.ValidFrom,
				input.SSLInfo.ValidTo,
				input.SSLInfo.IsValid,
				input.SSLInfo.DaysRemaining,
			)
			fmt.Fprintf(builder, "Signature Algorithm: %s, Public Key Algorithm: %s, Key Size: %d\n",
				input.SSLInfo.SignatureAlg,
				input.SSLInfo.PublicKeyAlg,
				input.SSLInfo.KeySize,
			)
		}

		if input.TechStack != nil {
			fmt.Fprintf(builder, "\n[Technology Stack]\n")
			fmt.Fprintf(builder, "Web Server: %s, Powered-By: %s, Content Type: %s\n",
				input.TechStack.Server,
				input.TechStack.PoweredBy,
				input.TechStack.ContentType,
			)
			if len(input.TechStack.Technologies) > 0 {
				fmt.Fprintf(builder, "Technologies: %v\n", input.TechStack.Technologies)
			}
			if len(input.TechStack.Framework) > 0 {
				fmt.Fprintf(builder, "Frameworks: %v\n", input.TechStack.Framework)
			}
			if len(input.TechStack.CMS) > 0 {
				fmt.Fprintf(builder, "CMS: %v\n", input.TechStack.CMS)
			}
			if len(input.TechStack.JavaScriptLib) > 0 {
				fmt.Fprintf(builder, "JavaScript Libraries: %v\n", input.TechStack.JavaScriptLib)
			}
			if len(input.TechStack.Analytics) > 0 {
				fmt.Fprintf(builder, "Analytics Tools: %v\n", input.TechStack.Analytics)
			}
			if len(input.TechStack.CDN) > 0 {
				fmt.Fprintf(builder, "CDN: %v\n", input.TechStack.CDN)
			}
			if len(input.TechStack.Cache) > 0 {
				fmt.Fprintf(builder, "Cache: %v\n", input.TechStack.Cache)
			}
			if len(input.TechStack.Database) > 0 {
				fmt.Fprintf(builder, "Database: %v\n", input.TechStack.Database)
			}
		}

		if input.Performance != nil {
			fmt.Fprintf(builder, "\n[Performance Insights]\n")
			fmt.Fprintf(builder, "Score: %d, FCP: %.2fms, LCP: %.2fms, CLS: %.4f, TBT: %.2fms, Speed Index: %.2fms\n",
				input.Performance.Score, input.Performance.FCP, input.Performance.LCP, input.Performance.CLS, input.Performance.TBT, input.Performance.SpeedIndex)
			if input.Performance.LCPElement != "" {
				fmt.Fprintf(builder, "LCP Element: %s\n", input.Performance.LCPElement)
			}
		}

		if input.SEO != nil {
			fmt.Fprintf(builder, "\n[SEO Compliance]\n")
			fmt.Fprintf(builder, "Score: %d, Title: %v, Description: %v, Viewport: %v, Robots.txt: %v, Canonical: %v, Indexable: %v, SPA Visibility: %.2f\n",
				input.SEO.Score, input.SEO.HasTitle, input.SEO.HasDescription, input.SEO.HasViewport, input.SEO.HasRobotsTxt, input.SEO.HasCanonical, input.SEO.Indexable, input.SEO.SPAVisibility)
		}

		if input.Security != nil {
			fmt.Fprintf(builder, "\n[Frontend Security]\n")
			fmt.Fprintf(builder, "Score: %d, Script Count: %d, Third-party Origins: %v\n",
				input.Security.Score, input.Security.ScriptCount, input.Security.ThirdPartyScripts)
			if len(input.Security.Vulnerabilities) > 0 {
				fmt.Fprintf(builder, "Vulnerabilities: %v\n", input.Security.Vulnerabilities)
			}
		}

		if input.Accessibility != nil {
			fmt.Fprintf(builder, "\n[Accessibility]\n")
			fmt.Fprintf(builder, "Score: %d, Key Findings: %v\n", input.Accessibility.Score, input.Accessibility.Findings)
		}

		fmt.Fprintf(builder, "\n[Link Health Check Results Overview]\n")
		maxResults := len(input.Results)
		if maxResults > 20 {
			maxResults = 20
		}
		for i := 0; i < maxResults; i++ {
			r := input.Results[i]
			fmt.Fprintf(builder, "- URL: %s, Status Code: %d, Response Time: %dms, IP: %s, TLS: %v, CDN: %v\n",
				r.URL, r.StatusCode, r.ResponseTime, r.IP, r.TLS, r.CDN)
		}
		if len(input.Results) > maxResults {
			fmt.Fprintf(builder, "... %d more results omitted\n", len(input.Results)-maxResults)
		}

		fmt.Fprintf(builder, "\nPlease analyze the above data professionally from four dimensions: \"availability, performance, security, SEO\". ")
		fmt.Fprintf(builder, "You need to provide scores from 0-100 (higher is better) and list key issues and recommendations in bullet points. ")
		fmt.Fprintf(builder, "The output must be a valid JSON object without any explanations or extra text. Field definitions are as follows:\n")
		fmt.Fprintf(builder, `{
  "summary": "Provide an overall summary in 2-4 sentences (in English)",
  "risk_level": "High | Medium | Low",
  "availability_score": 0,
  "performance_score": 0,
  "security_score": 0,
  "seo_score": 0,
  "highlights": ["Key cross-dimensional finding 1", "Key cross-dimensional finding 2"],
  "availability_findings": ["Availability finding 1", "Availability finding 2"],
  "performance_findings": ["Performance finding 1", "Performance finding 2"],
  "security_findings": ["Security finding 1", "Security finding 2"],
  "seo_findings": ["SEO finding 1", "SEO finding 2"],
  "recommendations": ["Comprehensive optimization recommendation 1", "Comprehensive optimization recommendation 2"]
}`)
	} else {
		// 中文数据展示
		if input.WebsiteInfo != nil {
			fmt.Fprintf(builder, "\n[网站信息]\n")
			fmt.Fprintf(builder, "标题: %s\n", input.WebsiteInfo.Title)
			fmt.Fprintf(builder, "描述: %s\n", input.WebsiteInfo.Description)
			fmt.Fprintf(builder, "语言: %s\n", input.WebsiteInfo.Language)
			fmt.Fprintf(builder, "字符集: %s\n", input.WebsiteInfo.Charset)
			fmt.Fprintf(builder, "作者: %s\n", input.WebsiteInfo.Author)
			fmt.Fprintf(builder, "生成器: %s\n", input.WebsiteInfo.Generator)
			fmt.Fprintf(builder, "robots: %s\n", input.WebsiteInfo.Robots)
		}

		if input.DomainInfo != nil {
			fmt.Fprintf(builder, "\n[域名信息]\n")
			fmt.Fprintf(builder, "域名: %s, IP: %s, 国家: %s, 城市: %s, ISP: %s, 组织: %s\n",
				input.DomainInfo.Domain,
				input.DomainInfo.IP,
				input.DomainInfo.Country,
				input.DomainInfo.City,
				input.DomainInfo.ISP,
				input.DomainInfo.Organization,
			)
		}

		if input.SSLInfo != nil {
			fmt.Fprintf(builder, "\n[SSL 证书]\n")
			fmt.Fprintf(builder, "颁发者: %s, 主题: %s, 有效期: %s ~ %s, 是否有效: %v, 剩余天数: %d\n",
				input.SSLInfo.Issuer,
				input.SSLInfo.Subject,
				input.SSLInfo.ValidFrom,
				input.SSLInfo.ValidTo,
				input.SSLInfo.IsValid,
				input.SSLInfo.DaysRemaining,
			)
			fmt.Fprintf(builder, "签名算法: %s, 公钥算法: %s, 密钥长度: %d\n",
				input.SSLInfo.SignatureAlg,
				input.SSLInfo.PublicKeyAlg,
				input.SSLInfo.KeySize,
			)
		}

		if input.TechStack != nil {
			fmt.Fprintf(builder, "\n[技术栈]\n")
			fmt.Fprintf(builder, "Web 服务器: %s, Powered-By: %s, 内容类型: %s\n",
				input.TechStack.Server,
				input.TechStack.PoweredBy,
				input.TechStack.ContentType,
			)
			if len(input.TechStack.Technologies) > 0 {
				fmt.Fprintf(builder, "技术: %v\n", input.TechStack.Technologies)
			}
			if len(input.TechStack.Framework) > 0 {
				fmt.Fprintf(builder, "框架: %v\n", input.TechStack.Framework)
			}
			if len(input.TechStack.CMS) > 0 {
				fmt.Fprintf(builder, "CMS: %v\n", input.TechStack.CMS)
			}
			if len(input.TechStack.JavaScriptLib) > 0 {
				fmt.Fprintf(builder, "前端库: %v\n", input.TechStack.JavaScriptLib)
			}
			if len(input.TechStack.Analytics) > 0 {
				fmt.Fprintf(builder, "分析工具: %v\n", input.TechStack.Analytics)
			}
			if len(input.TechStack.CDN) > 0 {
				fmt.Fprintf(builder, "CDN: %v\n", input.TechStack.CDN)
			}
			if len(input.TechStack.Cache) > 0 {
				fmt.Fprintf(builder, "缓存: %v\n", input.TechStack.Cache)
			}
			if len(input.TechStack.Database) > 0 {
				fmt.Fprintf(builder, "数据库: %v\n", input.TechStack.Database)
			}
		}

		if input.Performance != nil {
			fmt.Fprintf(builder, "\n[性能分析]\n")
			fmt.Fprintf(builder, "评分: %d, FCP: %.2fms, LCP: %.2fms, CLS: %.4f, TBT: %.2fms, Speed Index: %.2fms\n",
				input.Performance.Score, input.Performance.FCP, input.Performance.LCP, input.Performance.CLS, input.Performance.TBT, input.Performance.SpeedIndex)
			if input.Performance.LCPElement != "" {
				fmt.Fprintf(builder, "LCP 元素: %s\n", input.Performance.LCPElement)
			}
		}

		if input.SEO != nil {
			fmt.Fprintf(builder, "\n[SEO 合规性]\n")
			fmt.Fprintf(builder, "评分: %d, 标题: %v, 描述: %v, Viewport: %v, Robots.txt: %v, Canonical: %v, 可索引: %v, SPA 可见性: %.2f\n",
				input.SEO.Score, input.SEO.HasTitle, input.SEO.HasDescription, input.SEO.HasViewport, input.SEO.HasRobotsTxt, input.SEO.HasCanonical, input.SEO.Indexable, input.SEO.SPAVisibility)
		}

		if input.Security != nil {
			fmt.Fprintf(builder, "\n[前端安全]\n")
			fmt.Fprintf(builder, "评分: %d, 脚本数量: %d, 第三方来源: %v\n",
				input.Security.Score, input.Security.ScriptCount, input.Security.ThirdPartyScripts)
			if len(input.Security.Vulnerabilities) > 0 {
				fmt.Fprintf(builder, "安全漏洞: %v\n", input.Security.Vulnerabilities)
			}
		}

		if input.Accessibility != nil {
			fmt.Fprintf(builder, "\n[可访问性]\n")
			fmt.Fprintf(builder, "评分: %d, 关键发现: %v\n", input.Accessibility.Score, input.Accessibility.Findings)
		}

		fmt.Fprintf(builder, "\n[链接健康检查结果概览]\n")
		maxResults := len(input.Results)
		if maxResults > 20 {
			maxResults = 20
		}
		for i := 0; i < maxResults; i++ {
			r := input.Results[i]
			fmt.Fprintf(builder, "- URL: %s, 状态码: %d, 响应时间: %dms, IP: %s, TLS: %v, CDN: %v\n",
				r.URL, r.StatusCode, r.ResponseTime, r.IP, r.TLS, r.CDN)
		}
		if len(input.Results) > maxResults {
			fmt.Fprintf(builder, "... 其余 %d 条结果已省略\n", len(input.Results)-maxResults)
		}

		fmt.Fprintf(builder, "\n请根据以上数据，从\"可用性、性能、安全、SEO\"四个维度进行专业分析。")
		fmt.Fprintf(builder, "你需要给出 0-100 的评分（越高越好），并用要点列出主要问题和建议。")
		fmt.Fprintf(builder, "输出必须是一个合法的 JSON 对象，不要添加任何解释或多余文字。字段定义如下：\n")
		fmt.Fprintf(builder, `{
  "summary": "用 2-4 句话给出整体情况总结（中文）",
  "risk_level": "高 | 中 | 低",
  "availability_score": 0,
  "performance_score": 0,
  "security_score": 0,
  "seo_score": 0,
  "highlights": ["跨维度的关键发现1", "跨维度的关键发现2"],
  "availability_findings": ["可用性方面的发现1", "可用性方面的发现2"],
  "performance_findings": ["性能方面的发现1", "性能方面的发现2"],
  "security_findings": ["安全方面的发现1", "安全方面的发现2"],
  "seo_findings": ["SEO方面的发现1", "SEO方面的发现2"],
  "recommendations": ["综合优化建议1", "综合优化建议2"]
}`)
	}

	return builder.String()
}

// GenerateAIAnalysis 调用 DeepSeek 接口生成 AI 分析报告
func GenerateAIAnalysis(ctx context.Context, input *models.AIAnalysisInput) (*models.AIAnalysis, error) {
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("DEEPSEEK_API_KEY is not set")
	}

	baseURL := os.Getenv("DEEPSEEK_API_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.deepseek.com"
	}

	model := os.Getenv("DEEPSEEK_MODEL")
	if model == "" {
		model = "deepseek-chat"
	}

	// 分析模式：请求优先，其次环境变量，最后 balanced
	mode := input.Mode
	if mode == "" {
		envMode := os.Getenv("DEEPSEEK_ANALYSIS_MODE")
		if envMode != "" {
			mode = envMode
		} else {
			mode = "balanced"
		}
	}
	input.Mode = mode

	prompt := buildAIAnalysisPrompt(input)

	reqBody := deepSeekRequest{
		Model: model,
		Messages: []deepSeekMessage{
			{
				Role: "system",
				Content: fmt.Sprintf(
					"你是一个专业的网站分析 AI 助手，目前分析模式为 %s。你需要根据输入的数据生成结构化 JSON 分析结果，只能返回一个 JSON 对象，不能包含其他文本。",
					mode,
				),
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.2,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal DeepSeek request: %w", err)
	}

	// 创建一个新的上下文，确保有足够的超时时间（至少 120 秒）
	// 如果传入的 ctx 已经有超时，使用较大的那个
	apiCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	// 如果原上下文有更长的超时，使用原上下文
	if deadline, ok := ctx.Deadline(); ok {
		if time.Until(deadline) > 120*time.Second {
			cancel()     // 取消新创建的上下文
			apiCtx = ctx // 使用原上下文
		}
	}

	req, err := http.NewRequestWithContext(apiCtx, http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create DeepSeek request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	log.Printf("[AI] Calling DeepSeek model=%s for target=%s", model, input.Target)

	// 添加重试机制（最多重试 2 次）
	maxRetries := 2
	var resp *http.Response
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// 重试前等待一段时间（指数退避）
			waitTime := time.Duration(attempt) * 2 * time.Second
			log.Printf("[AI] Retrying DeepSeek request (attempt %d/%d) after %v...", attempt+1, maxRetries+1, waitTime)
			select {
			case <-apiCtx.Done():
				return nil, fmt.Errorf("context cancelled before retry: %w", apiCtx.Err())
			case <-time.After(waitTime):
			}
			// 重新创建请求（因为请求体只能读取一次）
			req, err = http.NewRequestWithContext(apiCtx, http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(bodyBytes))
			if err != nil {
				return nil, fmt.Errorf("failed to recreate DeepSeek request: %w", err)
			}
			req.Header.Set("Authorization", "Bearer "+apiKey)
			req.Header.Set("Content-Type", "application/json")
		}

		resp, lastErr = deepSeekHTTPClient.Do(req)
		if lastErr == nil {
			break // 成功，退出重试循环
		}

		// 检查是否是超时错误
		if ctxErr := apiCtx.Err(); ctxErr != nil {
			if ctxErr == context.DeadlineExceeded {
				log.Printf("[AI] DeepSeek request timeout (attempt %d/%d)", attempt+1, maxRetries+1)
				if attempt < maxRetries {
					continue // 重试
				}
				return nil, fmt.Errorf("DeepSeek request timeout after %d attempts: %w", maxRetries+1, ctxErr)
			}
		}

		// 检查是否是网络错误（可重试）
		if netErr, ok := lastErr.(interface{ Timeout() bool }); ok && netErr.Timeout() {
			log.Printf("[AI] DeepSeek request network timeout (attempt %d/%d)", attempt+1, maxRetries+1)
			if attempt < maxRetries {
				continue // 重试
			}
		}

		// 其他错误，如果是最后一次尝试，返回错误
		if attempt == maxRetries {
			return nil, fmt.Errorf("DeepSeek request failed after %d attempts: %w", maxRetries+1, lastErr)
		}
	}

	if resp == nil {
		return nil, fmt.Errorf("DeepSeek request failed: %w", lastErr)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// 读取响应体以获取错误详情
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[AI] DeepSeek API error response: status=%d, body=%s", resp.StatusCode, string(bodyBytes))
		return nil, fmt.Errorf("DeepSeek API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// 读取响应体时也使用上下文超时保护
	var dsResp deepSeekResponse
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&dsResp); err != nil {
		// 检查是否是超时错误
		if ctxErr := apiCtx.Err(); ctxErr != nil {
			if ctxErr == context.DeadlineExceeded {
				return nil, fmt.Errorf("timeout while reading DeepSeek response: %w", ctxErr)
			}
		}
		return nil, fmt.Errorf("failed to decode DeepSeek response: %w", err)
	}

	if len(dsResp.Choices) == 0 {
		return nil, fmt.Errorf("DeepSeek response has no choices")
	}

	content := dsResp.Choices[0].Message.Content
	if content == "" {
		return nil, fmt.Errorf("DeepSeek response content is empty")
	}

	// 清理内容：移除可能的代码块标记
	cleanedContent := content
	// 移除 ```json 或 ``` 代码块标记
	if strings.HasPrefix(strings.TrimSpace(cleanedContent), "```") {
		lines := strings.Split(cleanedContent, "\n")
		// 移除第一行（```json 或 ```）
		if len(lines) > 0 && strings.HasPrefix(strings.TrimSpace(lines[0]), "```") {
			lines = lines[1:]
		}
		// 移除最后一行（```）
		if len(lines) > 0 && strings.HasPrefix(strings.TrimSpace(lines[len(lines)-1]), "```") {
			lines = lines[:len(lines)-1]
		}
		cleanedContent = strings.Join(lines, "\n")
	}
	cleanedContent = strings.TrimSpace(cleanedContent)

	// 优先尝试将内容解析为 JSON
	var payload aiAnalysisPayload
	if err := json.Unmarshal([]byte(cleanedContent), &payload); err != nil {
		// 如果解析失败，尝试使用 map 进行灵活解析
		log.Printf("[AI] Failed to parse DeepSeek JSON with strict struct, trying flexible parsing: %v", err)

		var flexibleData map[string]interface{}
		if err2 := json.Unmarshal([]byte(cleanedContent), &flexibleData); err2 != nil {
			// 如果灵活解析也失败，退化为把整个内容作为 Summary
			contentPreview := cleanedContent
			if len(contentPreview) > 500 {
				contentPreview = contentPreview[:500]
			}
			log.Printf("[AI] Failed to parse DeepSeek JSON, fallback to raw text. Error: %v, Content preview: %s", err2, contentPreview)
			return &models.AIAnalysis{
				Summary:              content,
				RiskLevel:            "",
				AvailabilityScore:    0,
				PerformanceScore:     0,
				SecurityScore:        0,
				SEOScore:             0,
				Highlights:           nil,
				AvailabilityFindings: nil,
				PerformanceFindings:  nil,
				SecurityFindings:     nil,
				SEOFindings:          nil,
				Recommendations:      nil,
			}, nil
		}

		// 从灵活解析的 map 中提取字段
		payload = aiAnalysisPayload{}
		if s, ok := flexibleData["summary"].(string); ok {
			payload.Summary = s
		}
		if rl, ok := flexibleData["risk_level"].(string); ok {
			payload.RiskLevel = rl
		}
		// 处理评分字段（可能是 int 或 float64）
		if av, ok := flexibleData["availability_score"]; ok {
			if v, ok := av.(float64); ok {
				payload.AvailabilityScore = int(v)
			} else if v, ok := av.(int); ok {
				payload.AvailabilityScore = v
			}
		}
		if pf, ok := flexibleData["performance_score"]; ok {
			if v, ok := pf.(float64); ok {
				payload.PerformanceScore = int(v)
			} else if v, ok := pf.(int); ok {
				payload.PerformanceScore = v
			}
		}
		if sc, ok := flexibleData["security_score"]; ok {
			if v, ok := sc.(float64); ok {
				payload.SecurityScore = int(v)
			} else if v, ok := sc.(int); ok {
				payload.SecurityScore = v
			}
		}
		if seo, ok := flexibleData["seo_score"]; ok {
			if v, ok := seo.(float64); ok {
				payload.SEOScore = int(v)
			} else if v, ok := seo.(int); ok {
				payload.SEOScore = v
			}
		}
		// 处理数组字段
		if hl, ok := flexibleData["highlights"].([]interface{}); ok {
			payload.Highlights = make([]string, 0, len(hl))
			for _, v := range hl {
				if s, ok := v.(string); ok {
					payload.Highlights = append(payload.Highlights, s)
				}
			}
		}
		if af, ok := flexibleData["availability_findings"].([]interface{}); ok {
			payload.AvailabilityFindings = make([]string, 0, len(af))
			for _, v := range af {
				if s, ok := v.(string); ok {
					payload.AvailabilityFindings = append(payload.AvailabilityFindings, s)
				}
			}
		}
		if pf, ok := flexibleData["performance_findings"].([]interface{}); ok {
			payload.PerformanceFindings = make([]string, 0, len(pf))
			for _, v := range pf {
				if s, ok := v.(string); ok {
					payload.PerformanceFindings = append(payload.PerformanceFindings, s)
				}
			}
		}
		if sf, ok := flexibleData["security_findings"].([]interface{}); ok {
			payload.SecurityFindings = make([]string, 0, len(sf))
			for _, v := range sf {
				if s, ok := v.(string); ok {
					payload.SecurityFindings = append(payload.SecurityFindings, s)
				}
			}
		}
		if seof, ok := flexibleData["seo_findings"].([]interface{}); ok {
			payload.SEOFindings = make([]string, 0, len(seof))
			for _, v := range seof {
				if s, ok := v.(string); ok {
					payload.SEOFindings = append(payload.SEOFindings, s)
				}
			}
		}
		if rec, ok := flexibleData["recommendations"].([]interface{}); ok {
			payload.Recommendations = make([]string, 0, len(rec))
			for _, v := range rec {
				if s, ok := v.(string); ok {
					payload.Recommendations = append(payload.Recommendations, s)
				}
			}
		}

		log.Printf("[AI] Successfully parsed using flexible method. Scores: availability=%d, performance=%d, security=%d, seo=%d",
			payload.AvailabilityScore, payload.PerformanceScore, payload.SecurityScore, payload.SEOScore)
	}

	// 记录解析成功的信息
	log.Printf("[AI] Successfully parsed DeepSeek response. Scores: availability=%d, performance=%d, security=%d, seo=%d",
		payload.AvailabilityScore, payload.PerformanceScore, payload.SecurityScore, payload.SEOScore)

	analysis := &models.AIAnalysis{
		Summary:              payload.Summary,
		RiskLevel:            payload.RiskLevel,
		AvailabilityScore:    payload.AvailabilityScore,
		PerformanceScore:     payload.PerformanceScore,
		SecurityScore:        payload.SecurityScore,
		SEOScore:             payload.SEOScore,
		Highlights:           payload.Highlights,
		AvailabilityFindings: payload.AvailabilityFindings,
		PerformanceFindings:  payload.PerformanceFindings,
		SecurityFindings:     payload.SecurityFindings,
		SEOFindings:          payload.SEOFindings,
		Recommendations:      payload.Recommendations,
	}

	// 记录最终分析结果
	log.Printf("[AI] Final analysis: Summary length=%d, RiskLevel=%s, Scores: %+v",
		len(analysis.Summary), analysis.RiskLevel, map[string]int{
			"availability": analysis.AvailabilityScore,
			"performance":  analysis.PerformanceScore,
			"security":     analysis.SecurityScore,
			"seo":          analysis.SEOScore,
		})

	return analysis, nil
}
