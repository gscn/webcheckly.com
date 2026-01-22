package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// LighthousePlugin Lighthouse 插件
// 支持 performance/seo/security/accessibility 子任务
type LighthousePlugin struct {
	*plugin.BasePlugin
}

// NewLighthousePlugin 创建 Lighthouse 插件
func NewLighthousePlugin() *LighthousePlugin {
	return &LighthousePlugin{
		BasePlugin: plugin.NewBasePlugin(
			"lighthouse",
			120*time.Second, // 120秒超时（Lighthouse 执行较慢）
			false,           // 同步执行
			nil,             // 无依赖
		),
	}
}

// Execute 执行 Lighthouse 扫描
func (p *LighthousePlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		// 获取语言参数
		lang := input.Language
		if lang == "" {
			lang = "zh" // 默认中文
		}

		// 运行 Lighthouse
		report, err := services.RunLighthouse(input.TargetURL, lang)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		// 根据选项解析结果
		result := make(map[string]interface{})

		// 检查需要哪些子任务
		options := input.Options
		if options == nil {
			options = make(map[string]interface{})
		}

		// Performance
		if needsPerformance, ok := options["performance"].(bool); ok && needsPerformance {
			performance := services.ParsePerformanceMetrics(report)
			result["performance"] = performance
		}

		// SEO
		if needsSEO, ok := options["seo"].(bool); ok && needsSEO {
			seo := services.ParseSEOCompliance(report, "")
			result["seo"] = seo
		}

		// Security
		if needsSecurity, ok := options["security"].(bool); ok && needsSecurity {
			security := services.ParseSecurityRisk(report, lang)
			result["security"] = security
		}

		// Accessibility
		if needsAccessibility, ok := options["accessibility"].(bool); ok && needsAccessibility {
			accessibility := services.ParseAccessibilityInfo(report, lang)
			result["accessibility"] = accessibility
		}

		// 如果没有指定子任务，返回完整报告
		if len(result) == 0 {
			result["report"] = report
		}

		return plugin.CreateSuccessOutput(result, nil), nil
	})
}
