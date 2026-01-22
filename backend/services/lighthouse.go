package services

import (
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"web-checkly/models"
)

// FullLighthouseReport 代表完整的 Lighthouse JSON 报告结构
type FullLighthouseReport struct {
	Audits map[string]struct {
		ID               string          `json:"id"`
		Title            string          `json:"title"`
		Description      string          `json:"description"`
		Score            *float64        `json:"score"`
		NumericValue     float64         `json:"numericValue"`
		DisplayValue     string          `json:"displayValue"`
		ScoreDisplayMode string          `json:"scoreDisplayMode"`
		Details          json.RawMessage `json:"details"` // 改为 RawMessage，避免因结构不统一导致解析失败
	} `json:"audits"`
	Categories map[string]struct {
		ID    string  `json:"id"`
		Title string  `json:"title"`
		Score float64 `json:"score"`
	} `json:"categories"`
}

var (
	// lighthouseCache 用于在单次扫描请求中缓存报告
	// Key: target URL, Value: *FullLighthouseReport
	lighthouseCache = make(map[string]*FullLighthouseReport)
	cacheMu         sync.RWMutex
)

// RunLighthouse 运行 Lighthouse 并返回解析后的结果
// lang: 语言代码，支持 "zh" 或 "en"，默认为 "en"
func RunLighthouse(target string, lang string) (*FullLighthouseReport, error) {
	// 构建缓存键，包含语言信息
	cacheKey := fmt.Sprintf("%s:%s", target, lang)
	cacheMu.RLock()
	if report, ok := lighthouseCache[cacheKey]; ok {
		cacheMu.RUnlock()
		return report, nil
	}
	cacheMu.RUnlock()

	log.Printf("[Lighthouse] Running comprehensive scan for: %s (locale: %s)", target, lang)

	// 确定 locale 参数
	locale := "en"
	if lang == "zh" {
		locale = "zh-CN"
	}

	cmd := exec.Command("lighthouse",
		target,
		"--output=json",
		"--chrome-flags=--headless",
		"--only-categories=performance,seo,accessibility,best-practices",
		"--locale="+locale,
		"--quiet",
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("lighthouse command failed: %w", err)
	}

	var report FullLighthouseReport
	if err := json.Unmarshal(output, &report); err != nil {
		return nil, fmt.Errorf("failed to unmarshal lighthouse report: %w", err)
	}

	cacheMu.Lock()
	lighthouseCache[cacheKey] = &report
	cacheMu.Unlock()

	return &report, nil
}

// ClearLighthouseCache 清除指定 URL 的缓存（所有语言版本）
func ClearLighthouseCache(target string) {
	cacheMu.Lock()
	// 删除所有以 target: 开头的缓存键
	for key := range lighthouseCache {
		if strings.HasPrefix(key, target+":") {
			delete(lighthouseCache, key)
		}
	}
	cacheMu.Unlock()
}

// 通用的 Details 结构，用于二次解析
type genericDetails struct {
	Type  string                   `json:"type"`
	Items []map[string]interface{} `json:"items"`
	Nodes []map[string]interface{} `json:"nodes"`
}

// ParsePerformanceMetrics 从报告中提取性能指标
func ParsePerformanceMetrics(report *FullLighthouseReport) *models.PerformanceMetrics {
	metrics := &models.PerformanceMetrics{}

	if cat, ok := report.Categories["performance"]; ok {
		metrics.Score = int(cat.Score * 100)
	}

	metrics.FCP = report.Audits["first-contentful-paint"].NumericValue
	metrics.LCP = report.Audits["largest-contentful-paint"].NumericValue
	metrics.CLS = report.Audits["cumulative-layout-shift"].NumericValue
	metrics.TBT = report.Audits["total-blocking-time"].NumericValue
	metrics.SpeedIndex = report.Audits["speed-index"].NumericValue

	if score := report.Audits["first-contentful-paint"].Score; score != nil {
		metrics.FCPScore = int(*score * 100)
	}
	if score := report.Audits["largest-contentful-paint"].Score; score != nil {
		metrics.LCPScore = int(*score * 100)
	}
	if score := report.Audits["cumulative-layout-shift"].Score; score != nil {
		metrics.CLSScore = int(*score * 100)
	}
	if score := report.Audits["total-blocking-time"].Score; score != nil {
		metrics.TBTScore = int(*score * 100)
	}
	if score := report.Audits["speed-index"].Score; score != nil {
		metrics.SpeedIndexScore = int(*score * 100)
	}

	// 提取 LCP 元素
	if lcpAudit, ok := report.Audits["largest-contentful-paint-element"]; ok && lcpAudit.Details != nil {
		var details genericDetails
		if err := json.Unmarshal(lcpAudit.Details, &details); err == nil && len(details.Items) > 0 {
			if node, ok := details.Items[0]["node"].(map[string]interface{}); ok {
				metrics.LCPElement = fmt.Sprintf("%v", node["nodeLabel"])
			}
		}
	}

	return metrics
}

// ParseSEOCompliance 从报告中提取 SEO 合规性
func ParseSEOCompliance(report *FullLighthouseReport, rawHTML string) *models.SEOCompliance {
	seo := &models.SEOCompliance{}

	if cat, ok := report.Categories["seo"]; ok {
		seo.Score = int(cat.Score * 100)
	}

	seo.HasTitle = report.Audits["document-title"].Score != nil && *report.Audits["document-title"].Score == 1
	seo.HasDescription = report.Audits["meta-description"].Score != nil && *report.Audits["meta-description"].Score == 1
	seo.HasViewport = report.Audits["viewport"].Score != nil && *report.Audits["viewport"].Score == 1
	seo.HasRobotsTxt = report.Audits["robots-txt"].Score != nil && *report.Audits["robots-txt"].Score == 1
	seo.HasCanonical = report.Audits["canonical"].Score != nil && *report.Audits["canonical"].Score == 1
	seo.Indexable = report.Audits["is-on-https"].Score != nil && *report.Audits["is-on-https"].Score == 1

	seo.SPAVisibility = 0.95 // 默认值

	return seo
}

// ParseSecurityRisk 从报告中提取安全风险
// lang: 语言代码，支持 "zh" 或 "en"，默认为 "en"
func ParseSecurityRisk(report *FullLighthouseReport, lang string) *models.SecurityRisk {
	security := &models.SecurityRisk{
		SecurityHeaders: make(map[string]string),
	}

	if cat, ok := report.Categories["best-practices"]; ok {
		security.Score = int(cat.Score * 100)
	}

	// 提取第三方脚本
	if audit, ok := report.Audits["third-party-summary"]; ok && audit.Details != nil {
		var details genericDetails
		if err := json.Unmarshal(audit.Details, &details); err == nil {
			for _, item := range details.Items {
				if entity, ok := item["entity"].(map[string]interface{}); ok {
					if text, ok := entity["text"].(string); ok {
						security.ThirdPartyScripts = append(security.ThirdPartyScripts, text)
					}
				}
			}
		}
	}
	security.ScriptCount = len(security.ThirdPartyScripts)

	// 检查安全响应头
	if audit, ok := report.Audits["is-on-https"]; ok && audit.Score != nil && *audit.Score == 0 {
		if lang == "zh" {
			security.Vulnerabilities = append(security.Vulnerabilities, "网站未使用 HTTPS")
		} else {
			security.Vulnerabilities = append(security.Vulnerabilities, "Site is not using HTTPS")
		}
	}

	return security
}

// ParseAccessibilityInfo 从报告中提取可访问性信息
// lang: 语言代码，支持 "zh" 或 "en"，默认为 "en"
// 注意：Lighthouse 报告中的 Title 和 Description 会根据 --locale 参数自动本地化
func ParseAccessibilityInfo(report *FullLighthouseReport, lang string) *models.AccessibilityInfo {
	acc := &models.AccessibilityInfo{}

	if cat, ok := report.Categories["accessibility"]; ok {
		acc.Score = int(cat.Score * 100)
	}

	// 提取前几个失败的发现
	// Lighthouse 报告中的 Title 和 Description 已经根据 locale 参数本地化
	count := 0
	for _, audit := range report.Audits {
		if audit.Score != nil && *audit.Score < 1 && audit.ScoreDisplayMode != "notApplicable" && audit.ScoreDisplayMode != "manual" {
			acc.Findings = append(acc.Findings, fmt.Sprintf("%s: %s", audit.Title, audit.Description))
			count++
			if count >= 5 {
				break
			}
		}
	}

	return acc
}
