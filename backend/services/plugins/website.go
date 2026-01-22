package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// WebsitePlugin 网站信息插件
type WebsitePlugin struct {
	*plugin.BasePlugin
}

// NewWebsitePlugin 创建网站信息插件
func NewWebsitePlugin() *WebsitePlugin {
	return &WebsitePlugin{
		BasePlugin: plugin.NewBasePlugin(
			"website-info",
			15*time.Second, // 15秒超时
			false,          // 同步执行
			nil,            // 无依赖
		),
	}
}

// Execute 执行网站信息收集
func (p *WebsitePlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	// 验证输入
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	// 使用带超时的执行包装
	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		// 调用现有服务
		info, err := services.CollectWebsiteInfo(input.TargetURL)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(info, nil), nil
	})
}
