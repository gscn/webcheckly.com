package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// TestSSLPlugin HTTPS检测插件
type TestSSLPlugin struct {
	*plugin.BasePlugin
}

// NewTestSSLPlugin 创建testssl插件
func NewTestSSLPlugin() *TestSSLPlugin {
	return &TestSSLPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"testssl",
			120*time.Second, // 120秒超时（testssl可能需要更长时间）
			false,           // 同步执行
			nil,             // 无依赖
		),
	}
}

// Execute 执行testssl HTTPS检测
func (p *TestSSLPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		result, err := services.CollectTestSSLInfo(input.TargetURL)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(result, nil), nil
	})
}
