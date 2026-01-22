package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"web-checkly/models"

	"github.com/PuerkitoBio/goquery"
)

// CollectTechStack 收集网站技术栈信息（整合服务器信息）
func CollectTechStack(targetURL string) (*models.TechStack, error) {
	log.Printf("[TechStack] Collecting tech stack info from: %s", targetURL)

	// 使用共享的HTTP客户端
	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	stack := &models.TechStack{
		Technologies:    []string{},
		Framework:       []string{},
		CMS:             []string{},
		Language:        []string{},
		JavaScriptLib:   []string{},
		Analytics:       []string{},
		CDN:             []string{},
		Cache:           []string{},
		Database:        []string{},
		SecurityHeaders: make(map[string]string),
		MetaTags:        make(map[string]string),
	}

	// 从HTTP响应头检测服务器信息和技术栈
	detectFromHeaders(resp, stack)

	// 从HTML内容检测
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err == nil {
		detectFromHTML(doc, stack)
	}

	// 使用httpx检测技术栈
	httpxTechs, err := detectTechFromHttpx(targetURL)
	if err == nil && len(httpxTechs) > 0 {
		stack.Technologies = httpxTechs
		log.Printf("[TechStack] Detected technologies from httpx: %v", httpxTechs)
	}

	log.Printf("[TechStack] Detected: Server=%s, Technologies=%v, Framework=%v, CMS=%v",
		stack.Server, stack.Technologies, stack.Framework, stack.CMS)

	return stack, nil
}

// detectTechFromHttpx 使用httpx检测技术栈
func detectTechFromHttpx(targetURL string) ([]string, error) {
	log.Printf("[TechStack] Running httpx tech detection for: %s", targetURL)

	cmd := exec.Command(
		"httpx",
		"-json",
		"-tech-detect",
		"-u", targetURL,
	)

	output, err := cmd.Output()
	if err != nil {
		log.Printf("[TechStack] Httpx tech detection error: %v", err)
		return nil, err
	}

	var httpxResp map[string]interface{}
	if err := json.Unmarshal(output, &httpxResp); err != nil {
		log.Printf("[TechStack] Error parsing httpx output: %v", err)
		return nil, err
	}

	var techs []string
	if techArray, ok := httpxResp["tech"].([]interface{}); ok {
		for _, tech := range techArray {
			if techStr, ok := tech.(string); ok {
				techs = append(techs, techStr)
			}
		}
	}

	return techs, nil
}

func detectFromHeaders(resp *http.Response, stack *models.TechStack) {
	// Web服务器 - 不再在这里收集，因为服务器信息已经收集了
	// server := resp.Header.Get("Server")
	// if server != "" {
	// 	stack.Server = server
	// }

	// X-Powered-By
	stack.PoweredBy = resp.Header.Get("X-Powered-By")
	if stack.PoweredBy != "" {
		if strings.Contains(strings.ToLower(stack.PoweredBy), "php") {
			stack.Language = append(stack.Language, "PHP")
		}
		if strings.Contains(strings.ToLower(stack.PoweredBy), "asp.net") {
			stack.Framework = append(stack.Framework, "ASP.NET")
			stack.Language = append(stack.Language, "C#")
		}
	}

	// Content-Type
	stack.ContentType = resp.Header.Get("Content-Type")

	// Content-Length
	contentLength := resp.Header.Get("Content-Length")
	if contentLength != "" {
		if length, err := strconv.ParseInt(contentLength, 10, 64); err == nil {
			stack.ContentLength = length
		}
	}

	// Last-Modified
	stack.LastModified = resp.Header.Get("Last-Modified")

	// ETag
	stack.ETag = resp.Header.Get("ETag")

	// 安全响应头
	securityHeaders := []string{
		"X-Frame-Options",
		"X-Content-Type-Options",
		"X-XSS-Protection",
		"Strict-Transport-Security",
		"Content-Security-Policy",
		"Referrer-Policy",
		"Permissions-Policy",
		"X-Permitted-Cross-Domain-Policies",
	}

	for _, header := range securityHeaders {
		value := resp.Header.Get(header)
		if value != "" {
			stack.SecurityHeaders[strings.ToLower(header)] = value
		}
	}

	// CDN检测
	cdnHeaders := []string{"CF-Ray", "X-Served-By", "X-Cache", "Server"}
	for _, header := range cdnHeaders {
		value := resp.Header.Get(header)
		if value != "" {
			if strings.Contains(strings.ToLower(value), "cloudflare") {
				if !contains(stack.CDN, "Cloudflare") {
					stack.CDN = append(stack.CDN, "Cloudflare")
				}
			} else if strings.Contains(strings.ToLower(value), "cloudfront") {
				if !contains(stack.CDN, "CloudFront") {
					stack.CDN = append(stack.CDN, "CloudFront")
				}
			} else if strings.Contains(strings.ToLower(value), "fastly") {
				if !contains(stack.CDN, "Fastly") {
					stack.CDN = append(stack.CDN, "Fastly")
				}
			}
		}
	}

	// 缓存技术
	cacheControl := resp.Header.Get("Cache-Control")
	if cacheControl != "" {
		stack.Cache = append(stack.Cache, "Cache-Control")
	}
	if resp.Header.Get("X-Cache") != "" {
		if !contains(stack.Cache, "X-Cache") {
			stack.Cache = append(stack.Cache, "X-Cache")
		}
	}
}

func detectFromHTML(doc *goquery.Document, stack *models.TechStack) {
	html, _ := doc.Html()
	htmlLower := strings.ToLower(html)

	// Meta标签 - 只收集技术相关的标签，排除已在网站信息中显示的标签
	// 排除的标签：title, description, keywords, author, generator, viewport, robots, charset
	excludedMetaTags := map[string]bool{
		"title":       true,
		"description": true,
		"keywords":    true,
		"author":      true,
		"generator":   true,
		"viewport":    true,
		"robots":      true,
		"charset":     true,
	}

	doc.Find("meta").Each(func(i int, s *goquery.Selection) {
		name := s.AttrOr("name", "")
		property := s.AttrOr("property", "")
		content := s.AttrOr("content", "")

		// 只收集技术相关的标签
		if name != "" && !excludedMetaTags[strings.ToLower(name)] {
			stack.MetaTags[name] = content
		}
		// 收集所有property标签（通常是Open Graph或Twitter Card等）
		if property != "" {
			stack.MetaTags[property] = content
		}
	})

	// Generator检测（CMS/框架）
	doc.Find("meta[name='generator']").Each(func(i int, s *goquery.Selection) {
		content := strings.ToLower(s.AttrOr("content", ""))
		if strings.Contains(content, "wordpress") {
			if !contains(stack.CMS, "WordPress") {
				stack.CMS = append(stack.CMS, "WordPress")
			}
		} else if strings.Contains(content, "drupal") {
			if !contains(stack.CMS, "Drupal") {
				stack.CMS = append(stack.CMS, "Drupal")
			}
		} else if strings.Contains(content, "joomla") {
			if !contains(stack.CMS, "Joomla") {
				stack.CMS = append(stack.CMS, "Joomla")
			}
		}
	})

	// JavaScript库检测
	doc.Find("script").Each(func(i int, s *goquery.Selection) {
		src := s.AttrOr("src", "")
		content, _ := s.Html()

		// jQuery
		if strings.Contains(src, "jquery") || strings.Contains(content, "jQuery") {
			if !contains(stack.JavaScriptLib, "jQuery") {
				stack.JavaScriptLib = append(stack.JavaScriptLib, "jQuery")
			}
		}

		// React
		if strings.Contains(src, "react") || strings.Contains(content, "React") {
			if !contains(stack.JavaScriptLib, "React") {
				stack.JavaScriptLib = append(stack.JavaScriptLib, "React")
			}
		}

		// Vue
		if strings.Contains(src, "vue") || strings.Contains(content, "Vue") {
			if !contains(stack.JavaScriptLib, "Vue.js") {
				stack.JavaScriptLib = append(stack.JavaScriptLib, "Vue.js")
			}
		}

		// Angular
		if strings.Contains(src, "angular") || strings.Contains(content, "ng-") {
			if !contains(stack.JavaScriptLib, "Angular") {
				stack.JavaScriptLib = append(stack.JavaScriptLib, "Angular")
			}
		}
	})

	// 分析工具检测
	analyticsPatterns := map[string]string{
		"google-analytics": "Google Analytics",
		"gtag":             "Google Tag Manager",
		"ga(":              "Google Analytics",
		"analytics.js":     "Google Analytics",
		"baidu":            "Baidu Analytics",
		"cnzz":             "CNZZ",
	}

	for pattern, name := range analyticsPatterns {
		if strings.Contains(htmlLower, pattern) {
			if !contains(stack.Analytics, name) {
				stack.Analytics = append(stack.Analytics, name)
			}
		}
	}

	// 框架检测
	frameworkPatterns := map[*regexp.Regexp]string{
		regexp.MustCompile(`(?i)laravel`):  "Laravel",
		regexp.MustCompile(`(?i)rails`):    "Ruby on Rails",
		regexp.MustCompile(`(?i)django`):   "Django",
		regexp.MustCompile(`(?i)flask`):    "Flask",
		regexp.MustCompile(`(?i)express`):  "Express.js",
		regexp.MustCompile(`(?i)next\.js`): "Next.js",
		regexp.MustCompile(`(?i)nuxt`):     "Nuxt.js",
		regexp.MustCompile(`(?i)vue`):      "Vue.js",
		regexp.MustCompile(`(?i)react`):    "React",
		regexp.MustCompile(`(?i)angular`):  "Angular",
	}

	for pattern, name := range frameworkPatterns {
		if pattern.MatchString(htmlLower) {
			if !contains(stack.Framework, name) {
				stack.Framework = append(stack.Framework, name)
			}
		}
	}

	// 编程语言检测
	if strings.Contains(htmlLower, ".php") || strings.Contains(htmlLower, "php") {
		if !contains(stack.Language, "PHP") {
			stack.Language = append(stack.Language, "PHP")
		}
	}
	if strings.Contains(htmlLower, "asp.net") || strings.Contains(htmlLower, "aspx") {
		if !contains(stack.Language, "C#") {
			stack.Language = append(stack.Language, "C#")
		}
	}
	if strings.Contains(htmlLower, ".jsp") {
		if !contains(stack.Language, "Java") {
			stack.Language = append(stack.Language, "Java")
		}
	}
	if strings.Contains(htmlLower, ".py") || strings.Contains(htmlLower, "python") {
		if !contains(stack.Language, "Python") {
			stack.Language = append(stack.Language, "Python")
		}
	}
	if strings.Contains(htmlLower, "ruby") || strings.Contains(htmlLower, ".rb") {
		if !contains(stack.Language, "Ruby") {
			stack.Language = append(stack.Language, "Ruby")
		}
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}
