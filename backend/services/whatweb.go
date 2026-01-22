package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"

	"web-checkly/models"
)

// WhatWebResult whatweb检测结果
type WhatWebResult struct {
	Target       string            `json:"target"`
	Status       int               `json:"status"`
	Title        string            `json:"title"`
	Technologies map[string]string `json:"technologies"` // 技术栈映射（名称 -> 版本）
	Plugins      []string          `json:"plugins"`      // 检测到的插件列表
	Server       string            `json:"server"`       // Web服务器
	PoweredBy    string            `json:"powered_by"`   // X-Powered-By
	Framework    []string          `json:"framework"`    // 框架
	CMS          []string          `json:"cms"`          // CMS系统
	Language     []string          `json:"language"`     // 编程语言
	JavaScript   []string          `json:"javascript"`   // JavaScript库
	Database     []string          `json:"database"`     // 数据库
	OS           string            `json:"os"`           // 操作系统
	CDN          []string          `json:"cdn"`          // CDN
	Analytics    []string          `json:"analytics"`    // 分析工具
}

// RunWhatWeb 使用whatweb进行技术栈检测
func RunWhatWeb(ctx context.Context, targetURL string) (*WhatWebResult, error) {
	// whatweb命令参数
	// --log-json: JSON输出格式
	// --quiet: 安静模式
	// --no-errors: 不显示错误
	cmd := exec.CommandContext(
		ctx,
		"whatweb",
		"--log-json",
		"--quiet",
		"--no-errors",
		targetURL,
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("[WhatWeb] Error creating stdout pipe: %v", err)
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		log.Printf("[WhatWeb] Error starting whatweb command: %v", err)
		return nil, err
	}

	result := &WhatWebResult{
		Target:       targetURL,
		Technologies: make(map[string]string),
		Plugins:      []string{},
		Framework:    []string{},
		CMS:          []string{},
		Language:     []string{},
		JavaScript:   []string{},
		Database:     []string{},
		CDN:          []string{},
		Analytics:    []string{},
	}

	scanner := bufio.NewScanner(stdout)
	lineCount := 0

	// 读取JSON输出
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			log.Printf("[WhatWeb] Context cancelled while reading output. Lines read: %d", lineCount)
			cmd.Process.Kill()
			return nil, ctx.Err()
		default:
			line := scanner.Text()
			lineCount++
			if line == "" {
				continue
			}

			var whatwebResp map[string]interface{}
			if err := json.Unmarshal([]byte(line), &whatwebResp); err != nil {
				log.Printf("[WhatWeb] Error parsing JSON (line %d): %v", lineCount, err)
				continue
			}

			// 解析目标URL
			if target, ok := whatwebResp["target"].(string); ok {
				result.Target = target
			}

			// 解析HTTP状态码
			if status, ok := whatwebResp["http_status"].(float64); ok {
				result.Status = int(status)
			} else if status, ok := whatwebResp["status"].(float64); ok {
				result.Status = int(status)
			}

			// 解析标题
			if title, ok := whatwebResp["title"].(string); ok {
				result.Title = title
			}

			// 解析插件信息（whatweb的核心输出）
			if plugins, ok := whatwebResp["plugins"].(map[string]interface{}); ok {
				for pluginName, pluginData := range plugins {
					version := ""

					// 如果有版本信息，添加到名称中
					if pluginMap, ok := pluginData.(map[string]interface{}); ok {
						if v, ok := pluginMap["version"].(string); ok && v != "" {
							version = v
						}
						result.Technologies[pluginName] = version
					} else if pluginStrValue, ok := pluginData.(string); ok {
						result.Technologies[pluginName] = pluginStrValue
					}

					// 分类技术栈
					categorizeTechnology(pluginName, result)
				}
			}

			// 解析服务器信息
			if server, ok := whatwebResp["server"].(string); ok {
				result.Server = server
			}

			// 解析X-Powered-By
			if poweredBy, ok := whatwebResp["powered_by"].(string); ok {
				result.PoweredBy = poweredBy
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[WhatWeb] Scanner error: %v", err)
	}

	// 等待命令完成
	if err := cmd.Wait(); err != nil {
		log.Printf("[WhatWeb] WhatWeb process exited with error: %v", err)
	}

	log.Printf("[WhatWeb] Scan completed. Technologies: %d, Plugins: %d", len(result.Technologies), len(result.Plugins))
	return result, nil
}

// categorizeTechnology 分类技术栈
func categorizeTechnology(techName string, result *WhatWebResult) {
	techLower := strings.ToLower(techName)

	// 框架检测
	frameworkKeywords := []string{"laravel", "rails", "django", "flask", "express", "next", "nuxt", "vue", "react", "angular", "spring"}
	for _, keyword := range frameworkKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.Framework, techName) {
				result.Framework = append(result.Framework, techName)
			}
			return
		}
	}

	// CMS检测
	cmsKeywords := []string{"wordpress", "drupal", "joomla", "magento", "shopify", "prestashop", "typo3", "concrete5"}
	for _, keyword := range cmsKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.CMS, techName) {
				result.CMS = append(result.CMS, techName)
			}
			return
		}
	}

	// 编程语言检测
	languageKeywords := []string{"php", "python", "ruby", "java", "asp", "node", "perl"}
	for _, keyword := range languageKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.Language, techName) {
				result.Language = append(result.Language, techName)
			}
			return
		}
	}

	// JavaScript库检测
	jsKeywords := []string{"jquery", "react", "vue", "angular", "backbone", "ember", "knockout"}
	for _, keyword := range jsKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.JavaScript, techName) {
				result.JavaScript = append(result.JavaScript, techName)
			}
			return
		}
	}

	// 数据库检测
	databaseKeywords := []string{"mysql", "postgresql", "mongodb", "redis", "sqlite", "mariadb"}
	for _, keyword := range databaseKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.Database, techName) {
				result.Database = append(result.Database, techName)
			}
			return
		}
	}

	// CDN检测
	cdnKeywords := []string{"cloudflare", "cloudfront", "fastly", "akamai", "maxcdn", "keycdn"}
	for _, keyword := range cdnKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.CDN, techName) {
				result.CDN = append(result.CDN, techName)
			}
			return
		}
	}

	// 分析工具检测
	analyticsKeywords := []string{"google-analytics", "gtag", "analytics", "baidu", "cnzz", "matomo", "piwik"}
	for _, keyword := range analyticsKeywords {
		if strings.Contains(techLower, keyword) {
			if !containsString(result.Analytics, techName) {
				result.Analytics = append(result.Analytics, techName)
			}
			return
		}
	}

	// Web服务器检测
	if strings.Contains(techLower, "nginx") || strings.Contains(techLower, "apache") ||
		strings.Contains(techLower, "iis") || strings.Contains(techLower, "lighttpd") {
		if result.Server == "" {
			result.Server = techName
		}
		return
	}

	// 操作系统检测
	if strings.Contains(techLower, "linux") || strings.Contains(techLower, "windows") ||
		strings.Contains(techLower, "unix") || strings.Contains(techLower, "centos") ||
		strings.Contains(techLower, "ubuntu") || strings.Contains(techLower, "debian") {
		if result.OS == "" {
			result.OS = techName
		}
		return
	}

	// 其他技术栈添加到Plugins列表
	if !containsString(result.Plugins, techName) {
		result.Plugins = append(result.Plugins, techName)
	}
}

// CollectWhatWebInfo 收集whatweb检测结果（用于插件）
func CollectWhatWebInfo(targetURL string) (*WhatWebResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return RunWhatWeb(ctx, targetURL)
}

// ConvertWhatWebToTechStack 将WhatWeb结果转换为TechStack格式（用于兼容现有系统）
func ConvertWhatWebToTechStack(whatwebResult *WhatWebResult) *models.TechStack {
	if whatwebResult == nil {
		return nil
	}

	techStack := &models.TechStack{
		Server:          whatwebResult.Server,
		PoweredBy:       whatwebResult.PoweredBy,
		Framework:       whatwebResult.Framework,
		CMS:             whatwebResult.CMS,
		Language:        whatwebResult.Language,
		JavaScriptLib:   whatwebResult.JavaScript,
		Database:        whatwebResult.Database,
		CDN:             whatwebResult.CDN,
		Analytics:       whatwebResult.Analytics,
		OS:              whatwebResult.OS,
		SecurityHeaders: make(map[string]string),
		MetaTags:        make(map[string]string),
	}

	// 转换技术栈映射为字符串列表
	var technologies []string
	for tech, version := range whatwebResult.Technologies {
		if version != "" {
			technologies = append(technologies, fmt.Sprintf("%s %s", tech, version))
		} else {
			technologies = append(technologies, tech)
		}
	}
	techStack.Technologies = technologies

	return techStack
}

// MergeWhatWebToTechStack 将WhatWeb结果合并到现有的TechStack中（保留现有数据）
func MergeWhatWebToTechStack(whatweb *WhatWebResult, existing *models.TechStack) *models.TechStack {
	if whatweb == nil {
		return existing
	}
	if existing == nil {
		return ConvertWhatWebToTechStack(whatweb)
	}

	// 合并技术栈信息
	merged := &models.TechStack{
		Server:          whatweb.Server,
		PoweredBy:       whatweb.PoweredBy,
		Framework:       whatweb.Framework,
		CMS:             whatweb.CMS,
		Language:        whatweb.Language,
		JavaScriptLib:   whatweb.JavaScript,
		Database:        whatweb.Database,
		CDN:             whatweb.CDN,
		Analytics:       whatweb.Analytics,
		OS:              whatweb.OS,
		SecurityHeaders: existing.SecurityHeaders, // 保留现有的安全头
		MetaTags:        existing.MetaTags,        // 保留现有的元标签
		ContentType:     existing.ContentType,
		ContentLength:   existing.ContentLength,
		LastModified:    existing.LastModified,
		ETag:            existing.ETag,
		Cache:           existing.Cache,
	}

	// 如果whatweb没有提供某些信息，使用现有的
	if merged.Server == "" {
		merged.Server = existing.Server
	}
	if merged.PoweredBy == "" {
		merged.PoweredBy = existing.PoweredBy
	}

	// 合并技术栈列表（去重）
	techMap := make(map[string]bool)
	for _, tech := range existing.Technologies {
		techMap[tech] = true
	}
	for tech, version := range whatweb.Technologies {
		techStr := tech
		if version != "" {
			techStr = fmt.Sprintf("%s %s", tech, version)
		}
		techMap[techStr] = true
	}
	var technologies []string
	for tech := range techMap {
		technologies = append(technologies, tech)
	}
	merged.Technologies = technologies

	return merged
}
