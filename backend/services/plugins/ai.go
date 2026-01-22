package plugins

import (
	"context"
	"fmt"
	"time"
	"web-checkly/models"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// AIPlugin AI 分析插件
// 依赖其他模块的结果
type AIPlugin struct {
	*plugin.BasePlugin
}

// NewAIPlugin 创建 AI 分析插件
func NewAIPlugin() *AIPlugin {
	return &AIPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"ai-analysis",
			120*time.Second, // 120秒超时（AI 分析较慢）
			false,           // 同步执行
			[]string{ // 依赖其他模块（可选）
				"website-info",
				"domain-info",
				"ssl-info",
				"tech-stack",
				"link-health",
			},
		),
	}
}

// Execute 执行 AI 分析
func (p *AIPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		// 从选项中获取其他模块的结果
		options := input.Options
		if options == nil {
			return plugin.HandleError(p.Name(), plugin.ErrInvalidInput), plugin.ErrInvalidInput
		}

		// 构建 AI 分析输入
		aiInput := &models.AIAnalysisInput{
			Target:   input.TargetURL,
			Language: input.Language,
		}

		// 从选项中提取数据
		if mode, ok := options["ai_mode"].(string); ok {
			aiInput.Mode = mode
		} else {
			aiInput.Mode = "balanced"
		}

		// 提取各模块结果
		if websiteInfo, ok := options["website_info"].(*models.WebsiteInfo); ok {
			aiInput.WebsiteInfo = websiteInfo
		}
		if domainInfo, ok := options["domain_info"].(*models.DomainInfo); ok {
			aiInput.DomainInfo = domainInfo
		}
		if sslInfo, ok := options["ssl_info"].(*models.SSLInfo); ok {
			aiInput.SSLInfo = sslInfo
		}
		if techStack, ok := options["tech_stack"].(*models.TechStack); ok {
			aiInput.TechStack = techStack
		}
		if results, ok := options["link_health"].([]models.HttpxResult); ok {
			aiInput.Results = results
		}
		if performance, ok := options["performance"].(*models.PerformanceMetrics); ok {
			aiInput.Performance = performance
		}
		if seo, ok := options["seo"].(*models.SEOCompliance); ok {
			aiInput.SEO = seo
		}
		if security, ok := options["security"].(*models.SecurityRisk); ok {
			aiInput.Security = security
		}
		if accessibility, ok := options["accessibility"].(*models.AccessibilityInfo); ok {
			aiInput.Accessibility = accessibility
		}

		// 构建摘要
		if summary, ok := options["summary"].(models.ScanSummary); ok {
			aiInput.Summary = summary
		}

		// 过滤重要指标，减少传递给AI的数据量
		filteredInput := services.FilterImportantMetrics(aiInput)

		// 生成 AI 分析
		analysis, err := services.GenerateAIAnalysis(ctx, filteredInput)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		// 确保返回的结果不为空
		if analysis == nil {
			return plugin.HandleError(p.Name(), fmt.Errorf("AI analysis returned nil result")), fmt.Errorf("AI analysis returned nil result")
		}

		return plugin.CreateSuccessOutput(analysis, nil), nil
	})
}
