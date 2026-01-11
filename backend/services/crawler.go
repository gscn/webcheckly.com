package services

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// 常见的链接跟踪参数
var trackingParams = []string{
	"ct_outlink_displace",
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"ref",
	"source",
	"tracking",
}

// cleanURL 清理和规范化URL，移除跟踪参数并尝试还原真实URL
func cleanURL(rawURL string, baseURL *url.URL) string {
	originalURL := rawURL

	// 处理协议相对URL（以 // 开头）
	if strings.HasPrefix(rawURL, "//") {
		// 使用base URL的协议来补全
		scheme := baseURL.Scheme
		if scheme == "" {
			scheme = "https"
		}
		rawURL = scheme + ":" + rawURL
		log.Printf("[Crawler] Fixed protocol-relative URL: %s -> %s", originalURL, rawURL)
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		log.Printf("[Crawler] Error parsing URL '%s': %v", rawURL, err)
		return rawURL
	}

	// 检查是否是跟踪重定向URL（路径中包含 = 但没有 ?）
	// 例如: /ct_outlink_displace=xxx
	// 注意：这个检查应该在绝对/相对URL判断之前
	if u.Path != "" && strings.Contains(u.Path, "=") && u.RawQuery == "" {
		log.Printf("[Crawler] Detected tracking URL format: %s", rawURL)

		// 尝试从路径中提取Base64参数并解码
		parts := strings.SplitN(u.Path, "=", 2)
		if len(parts) == 2 {
			paramName := parts[0]
			paramValue := parts[1]

			// 检查是否是已知的跟踪参数
			for _, trackingParam := range trackingParams {
				if strings.Contains(paramName, trackingParam) || strings.Contains(u.Path, trackingParam) {
					// 尝试Base64解码
					if decoded, err := base64.URLEncoding.DecodeString(paramValue); err == nil {
						decodedStr := string(decoded)
						log.Printf("[Crawler] Decoded tracking parameter: %s", decodedStr)

						// 尝试从解码后的字符串中提取URL
						// 格式可能是: host=xxx&scheme=xxx&href=xxx
						if strings.Contains(decodedStr, "host=") {
							// 尝试解析URL参数
							if parsedParams, err := url.ParseQuery(decodedStr); err == nil {
								if host := parsedParams.Get("host"); host != "" {
									scheme := parsedParams.Get("scheme")
									if scheme == "" {
										scheme = "https"
									}
									cleanURL := scheme + "://" + host
									log.Printf("[Crawler] Extracted clean URL from tracking: %s", cleanURL)
									return cleanURL
								}
							}
						}
					}

					// 如果是跟踪URL但没有成功解码，跳过
					return ""
				}
			}
		}
	}

	// 确定最终要处理的URL对象
	var abs *url.URL

	// 如果URL已经是绝对URL（有scheme和host），直接使用
	if u.Scheme != "" && u.Host != "" {
		abs = u
		// log.Printf("[Crawler] Using absolute URL: %s", abs.String())
	} else {
		// 解析为绝对URL（相对URL的情况）
		abs = baseURL.ResolveReference(u)
		// log.Printf("[Crawler] Resolved relative URL: %s -> %s", originalURL, abs.String())
	}

	// 移除跟踪参数
	query := abs.Query()
	hasTrackingParams := false
	for _, param := range trackingParams {
		if query.Has(param) {
			query.Del(param)
			hasTrackingParams = true
		}
	}
	if hasTrackingParams {
		abs.RawQuery = query.Encode()
	}

	// 规范化URL（移除fragment和尾部斜杠）
	abs.Fragment = ""
	urlStr := abs.String()
	urlStr = strings.TrimRight(urlStr, "/")

	// 移除空的查询字符串
	if strings.HasSuffix(urlStr, "?") {
		urlStr = strings.TrimSuffix(urlStr, "?")
	}

	return urlStr
}

// isValidURL 检查URL是否有效且不应该被过滤，返回是否有效和跳过原因
func isValidURL(urlStr string) (bool, string) {
	if urlStr == "" {
		return false, "empty URL"
	}

	u, err := url.Parse(urlStr)
	if err != nil {
		return false, "parse error: " + err.Error()
	}

	// 必须是HTTP(S)协议
	if u.Scheme != "http" && u.Scheme != "https" {
		return false, "invalid scheme: " + u.Scheme
	}

	// 必须有主机名
	if u.Hostname() == "" {
		return false, "missing hostname"
	}

	// 过滤掉mailto、tel等协议
	if u.Scheme == "mailto" || u.Scheme == "tel" || u.Scheme == "javascript" {
		return false, "non-HTTP scheme: " + u.Scheme
	}

	// 过滤掉明显的跟踪URL格式（路径包含 = 但没有查询参数）
	if u.Path != "" && strings.Contains(u.Path, "=") && !strings.Contains(u.Path, "?") {
		// 检查是否是跟踪参数
		for _, trackingParam := range trackingParams {
			if strings.Contains(u.Path, trackingParam) {
				return false, "tracking URL pattern: " + trackingParam
			}
		}
	}

	return true, ""
}

// extractURLsFromCSS 从CSS内容中提取 url() 函数中的URL
func extractURLsFromCSS(cssContent string, baseURL *url.URL, addURL func(string, string), source string) {
	// 匹配 url() 函数中的URL
	// 支持: url("http://example.com"), url('http://example.com'), url(http://example.com)
	urlPattern := regexp.MustCompile(`url\s*\(\s*["']?([^"')]+)["']?\s*\)`)
	matches := urlPattern.FindAllStringSubmatch(cssContent, -1)

	for _, match := range matches {
		if len(match) > 1 {
			urlStr := strings.TrimSpace(match[1])
			// 跳过 data: 和 data-uri
			if strings.HasPrefix(urlStr, "data:") {
				continue
			}
			addURL(urlStr, source)
		}
	}

	// 匹配 @import 规则
	importPattern := regexp.MustCompile(`@import\s+["']([^"']+)["']`)
	importMatches := importPattern.FindAllStringSubmatch(cssContent, -1)
	for _, match := range importMatches {
		if len(match) > 1 {
			urlStr := strings.TrimSpace(match[1])
			addURL(urlStr, source+"-import")
		}
	}
}

// extractURLsFromJS 从JavaScript内容中提取URL字符串
func extractURLsFromJS(jsContent string, baseURL *url.URL, addURL func(string, string), source string) {
	// 匹配字符串中的 http:// 或 https:// URL
	// 这个正则表达式匹配引号中的URL
	urlPattern := regexp.MustCompile(`["'](https?://[^\s"']+)["']`)
	matches := urlPattern.FindAllStringSubmatch(jsContent, -1)

	for _, match := range matches {
		if len(match) > 1 {
			urlStr := strings.TrimSpace(match[1])
			// 移除可能的转义字符
			urlStr = strings.Trim(urlStr, `"'`)
			// 跳过 data: URL
			if strings.HasPrefix(urlStr, "data:") {
				continue
			}
			addURL(urlStr, source)
		}
	}

	// 也匹配没有引号的URL（如变量赋值）
	urlPattern2 := regexp.MustCompile(`(https?://[^\s"'\)]+)`)
	matches2 := urlPattern2.FindAllStringSubmatch(jsContent, -1)
	for _, match := range matches2 {
		if len(match) > 1 {
			urlStr := strings.TrimSpace(match[1])
			// 移除可能的标点符号
			urlStr = strings.TrimRight(urlStr, `.,;:)!}`)
			if strings.HasPrefix(urlStr, "http://") || strings.HasPrefix(urlStr, "https://") {
				if !strings.Contains(urlStr, "data:") {
					addURL(urlStr, source)
				}
			}
		}
	}
}

// 创建复用的HTTP客户端
var httpClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	},
}

func ExtractPageUrls(target string, report *FullLighthouseReport) ([]string, error) {
	urls := make(map[string]bool)
	base, _ := url.Parse(target)

	// 辅助函数：提取并添加URL
	addURL := func(rawURL string, source string) {
		if rawURL == "" || strings.HasPrefix(rawURL, "data:") {
			return
		}

		cleanedURL := cleanURL(rawURL, base)
		if cleanedURL == "" {
			return
		}

		isValid, _ := isValidURL(cleanedURL)
		if !isValid {
			return
		}

		if !urls[cleanedURL] {
			urls[cleanedURL] = true
			log.Printf("[Crawler] ✓ Added URL from %s: %s", source, cleanedURL)
		}
	}

	// 1. 如果有 Lighthouse 报告，从网络请求中提取资源 URL
	if report != nil {
		log.Printf("[Crawler] Extracting URLs from Lighthouse network requests")
		if audit, ok := report.Audits["network-requests"]; ok && audit.Details != nil {
			var details struct {
				Items []map[string]interface{} `json:"items"`
			}
			if err := json.Unmarshal(audit.Details, &details); err == nil {
				for _, item := range details.Items {
					if u, ok := item["url"].(string); ok {
						addURL(u, "lighthouse-network")
					}
				}
			} else {
				log.Printf("[Crawler] Warning: Failed to parse Lighthouse network requests: %v", err)
			}
		}
	}

	// 2. 同时使用 goquery 提取 DOM 中的链接（确保不遗漏未加载的 <a> 标签）
	domUrls, err := ExtractPageUrlsGoQuery(target)
	if err == nil {
		for _, u := range domUrls {
			addURL(u, "goquery-dom")
		}
	} else {
		log.Printf("[Crawler] Standard extraction failed: %v", err)
		if report == nil {
			return nil, err
		}
	}

	result := []string{}
	for u := range urls {
		result = append(result, u)
	}

	log.Printf("[Crawler] Total unique URLs extracted: %d", len(result))
	return result, nil
}

// ExtractPageUrlsGoQuery 是原有的基于 goquery 的提取逻辑
func ExtractPageUrlsGoQuery(target string) ([]string, error) {
	req, err := http.NewRequest("GET", target, nil)
	if err != nil {
		log.Printf("[Crawler] Error creating request: %v", err)
		return nil, err
	}

	// 设置User-Agent
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("[Crawler] Error fetching page: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	// 检查状态码
	if resp.StatusCode != http.StatusOK {
		log.Printf("[Crawler] HTTP status %d for %s", resp.StatusCode, target)
		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
		}
	}

	log.Printf("[Crawler] HTTP Status: %d, Content-Type: %s", resp.StatusCode, resp.Header.Get("Content-Type"))

	base, err := url.Parse(target)
	if err != nil {
		log.Printf("[Crawler] Error parsing base URL: %v", err)
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Printf("[Crawler] Error parsing HTML: %v", err)
		return nil, err
	}

	urls := make(map[string]bool)
	linkCount := 0
	skippedURLs := make(map[string]string) // 记录跳过的URL及原因

	// 获取base域名的hostname，用于日志对比
	baseHostname := base.Hostname()
	log.Printf("[Crawler] Base hostname: %s", baseHostname)

	// 辅助函数：提取并添加URL
	addURL := func(rawURL string, source string) {
		if rawURL == "" {
			skippedURLs[rawURL] = "empty raw URL from " + source
			return
		}

		// 清理和规范化URL
		cleanedURL := cleanURL(rawURL, base)
		if cleanedURL == "" {
			reason := "cleanURL returned empty"
			skippedURLs[rawURL] = reason + " (from " + source + ")"
			return
		}

		// 验证URL是否有效
		isValid, reason := isValidURL(cleanedURL)
		if !isValid {
			skippedURLs[cleanedURL] = reason + " (from " + source + ", original: " + rawURL + ")"
			return
		}

		if !urls[cleanedURL] {
			urls[cleanedURL] = true
		}
	}

	// 1. 提取 <a href=""> 链接
	doc.Find("a[href]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		href, exists := s.Attr("href")
		if exists {
			addURL(href, "link")
		}
	})

	// 2. 提取 <link rel="stylesheet" href=""> CSS 文件
	doc.Find("link[rel='stylesheet'], link[rel='alternate stylesheet']").Each(func(i int, s *goquery.Selection) {
		linkCount++
		href, exists := s.Attr("href")
		if exists {
			addURL(href, "css")
		}
	})

	// 3. 提取 <script src=""> JS 文件
	doc.Find("script[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "js")
		}
	})

	// 4. 提取 <img src=""> 图片文件
	doc.Find("img[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "img")
		}
	})

	// 5. 提取 <source src=""> 媒体文件（video, audio等）
	doc.Find("source[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "source")
		}
	})

	// 6. 提取 <iframe src=""> 嵌入内容
	doc.Find("iframe[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "iframe")
		}
	})

	// 7. 提取 <object data=""> 对象
	doc.Find("object[data]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		data, exists := s.Attr("data")
		if exists {
			addURL(data, "object")
		}
	})

	// 8. 提取 <embed src=""> 嵌入内容
	doc.Find("embed[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "embed")
		}
	})

	// 9. 提取 <video poster=""> 和 <video src=""> 视频文件
	doc.Find("video[poster]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		poster, exists := s.Attr("poster")
		if exists {
			addURL(poster, "video-poster")
		}
	})
	doc.Find("video[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "video")
		}
	})

	// 10. 提取 <audio src=""> 音频文件
	doc.Find("audio[src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		src, exists := s.Attr("src")
		if exists {
			addURL(src, "audio")
		}
	})

	// 11. 提取 <form action=""> 表单提交地址
	doc.Find("form[action]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		action, exists := s.Attr("action")
		if exists && action != "" {
			addURL(action, "form-action")
		}
	})

	// 12. 提取 <img data-src=""> 懒加载图片
	doc.Find("img[data-src]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		dataSrc, exists := s.Attr("data-src")
		if exists {
			addURL(dataSrc, "img-lazy")
		}
	})

	// 13. 提取 <link rel="icon">, <link rel="shortcut icon"> 等图标文件
	doc.Find("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel='manifest']").Each(func(i int, s *goquery.Selection) {
		linkCount++
		href, exists := s.Attr("href")
		if exists {
			addURL(href, "favicon")
		}
	})

	// 14. 提取 <meta property="og:image"> 等 Open Graph 图片
	doc.Find("meta[property='og:image'], meta[property='og:url'], meta[name='twitter:image']").Each(func(i int, s *goquery.Selection) {
		linkCount++
		content, exists := s.Attr("content")
		if exists {
			addURL(content, "meta-og")
		}
	})

	// 15. 提取内联样式中的 URL（style 属性）
	doc.Find("[style]").Each(func(i int, s *goquery.Selection) {
		linkCount++
		style, exists := s.Attr("style")
		if exists {
			extractURLsFromCSS(style, base, addURL, "inline-style")
		}
	})

	// 16. 提取 <style> 标签中的 URL
	doc.Find("style").Each(func(i int, s *goquery.Selection) {
		linkCount++
		styleContent := s.Text()
		if styleContent != "" {
			extractURLsFromCSS(styleContent, base, addURL, "style-tag")
		}
	})

	// 17. 提取外部 CSS 文件中的 URL
	// 注意：这需要下载并解析 CSS 文件，可能会很慢
	// 暂时跳过，或者可以异步处理

	// 18. 提取 JavaScript 中的 URL（简单模式，匹配字符串中的 http/https）
	doc.Find("script:not([src])").Each(func(i int, s *goquery.Selection) {
		linkCount++
		scriptContent := s.Text()
		if scriptContent != "" {
			extractURLsFromJS(scriptContent, base, addURL, "inline-js")
		}
	})

	log.Printf("[Crawler] Total links found: %d, Valid HTTP(S) URLs: %d", linkCount, len(urls))

	// 输出所有跳过的URL统计
	log.Printf("[Crawler] ========== SKIPPED URLs SUMMARY ==========")
	log.Printf("[Crawler] Total skipped URLs: %d", len(skippedURLs))
	if len(skippedURLs) > 0 {
		skipReasons := make(map[string]int)
		for urlStr, reason := range skippedURLs {
			log.Printf("[Crawler] SKIPPED: %s", urlStr)
			log.Printf("[Crawler]   Reason: %s", reason)
			// 提取原因类型（简化）
			reasonType := reason
			if idx := strings.Index(reason, " ("); idx > 0 {
				reasonType = reason[:idx]
			}
			skipReasons[reasonType]++
		}
		log.Printf("[Crawler] Skip reasons breakdown:")
		for reason, count := range skipReasons {
			log.Printf("[Crawler]   %s: %d", reason, count)
		}
	}
	log.Printf("[Crawler] ==========================================")

	result := []string{}
	sameDomainCount := 0
	crossDomainCount := 0

	for u := range urls {
		result = append(result, u)
		// 统计同域和跨域URL数量
		parsedURL, err := url.Parse(u)
		if err == nil {
			urlHostname := parsedURL.Hostname()
			if urlHostname == baseHostname {
				sameDomainCount++
			} else {
				crossDomainCount++
			}
		}
	}

	log.Printf("[Crawler] Extracted %d unique URLs (Same-domain: %d, Cross-domain: %d)",
		len(result), sameDomainCount, crossDomainCount)

	// 详细列出所有提取的URL
	log.Printf("[Crawler] ========== EXTRACTED URLs LIST ==========")
	for i, u := range result {
		log.Printf("[Crawler] URL %d/%d: %s", i+1, len(result), u)
	}
	log.Printf("[Crawler] =========================================")

	return result, nil
}
