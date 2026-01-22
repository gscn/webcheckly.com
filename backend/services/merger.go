package services

import (
	"log"
	"web-checkly/models"
)

// ResultMerger 结果合并器，提供统一的结果合并接口
type ResultMerger struct{}

// NewResultMerger 创建结果合并器
func NewResultMerger() *ResultMerger {
	return &ResultMerger{}
}

// MergeDeepCheckResults 合并网站链接深度检查结果（仅 katana → link-health）
func (rm *ResultMerger) MergeDeepCheckResults(results *models.TaskResults, pluginResults map[string]interface{}) {
	log.Printf("[ResultMerger] Merging website link deep check results...")

	// katana → link-health
	if katanaData, ok := pluginResults["katana"]; ok {
		if katanaResults, ok := katanaData.([]KatanaResult); ok {
			log.Printf("[ResultMerger] Converting katana to link-health")
			results.KatanaResults = katanaResults
			// 自动转换为link-health格式
			results.LinkHealth = ConvertKatanaToHttpxResults(katanaResults)
		}
	}

	log.Printf("[ResultMerger] Website link deep check results merged successfully")
}

// IsDeepCheckMode 检测是否为网站链接深度检查模式
// 网站链接深度检查模式：只有 katana，没有其他深度检查工具
func IsDeepCheckMode(pluginNames []string) bool {
	hasKatana := false
	hasOtherDeepTools := false

	// 检查是否有 katana
	for _, name := range pluginNames {
		if name == "katana" {
			hasKatana = true
		}
		// 检查是否有其他网站链接深度检查工具（排除基础工具）
		if name != "katana" && name != "website-info" && name != "domain-info" && name != "ssl-info" && name != "tech-stack" && name != "link-health" {
			hasOtherDeepTools = true
		}
	}

	// 网站链接深度检查模式：有 katana 且没有其他深度检查工具
	return hasKatana && !hasOtherDeepTools
}

// MergeResults 通用结果合并函数（支持混合模式）
func (rm *ResultMerger) MergeResults(results *models.TaskResults, pluginResults map[string]interface{}) {
	log.Printf("[ResultMerger] Merging results...")

	// 检测是否为深度检查模式
	pluginNames := make([]string, 0, len(pluginResults))
	for name := range pluginResults {
		pluginNames = append(pluginNames, name)
	}

	if IsDeepCheckMode(pluginNames) {
		// 网站链接深度检查模式：自动转换
		rm.MergeDeepCheckResults(results, pluginResults)
		return
	}

	// 混合模式：katana + link-health
	if katanaData, ok := pluginResults["katana"]; ok {
		if katanaResults, ok := katanaData.([]KatanaResult); ok {
			results.KatanaResults = katanaResults
			// 如果同时有link-health，合并结果（去重）
			if results.LinkHealth != nil {
				results.LinkHealth = mergeHttpxResults(results.LinkHealth, ConvertKatanaToHttpxResults(katanaResults))
			} else {
				results.LinkHealth = ConvertKatanaToHttpxResults(katanaResults)
			}
		}
	}

	log.Printf("[ResultMerger] Results merged successfully")
}

// mergeHttpxResults 合并两个HttpxResult列表（去重）
func mergeHttpxResults(existing []models.HttpxResult, new []models.HttpxResult) []models.HttpxResult {
	urlMap := make(map[string]models.HttpxResult)

	// 先添加现有的结果
	for _, result := range existing {
		urlMap[result.URL] = result
	}

	// 添加新结果（如果URL不存在或新结果更详细）
	for _, result := range new {
		if existingResult, exists := urlMap[result.URL]; exists {
			// 如果新结果有更多信息，使用新结果
			if result.Title != "" && existingResult.Title == "" {
				urlMap[result.URL] = result
			} else if result.StatusCode > 0 && existingResult.StatusCode == 0 {
				urlMap[result.URL] = result
			}
		} else {
			urlMap[result.URL] = result
		}
	}

	// 转换回切片
	merged := make([]models.HttpxResult, 0, len(urlMap))
	for _, result := range urlMap {
		merged = append(merged, result)
	}

	return merged
}
