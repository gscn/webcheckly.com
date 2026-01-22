package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// SSLPlugin SSL证书信息插件
type SSLPlugin struct {
	*plugin.BasePlugin
}

// NewSSLPlugin 创建SSL证书信息插件
func NewSSLPlugin() *SSLPlugin {
	return &SSLPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"ssl-info",
			10*time.Second, // 10秒超时
			false,          // 同步执行
			nil,            // 无依赖
		),
	}
}

// Execute 执行SSL证书信息收集
func (p *SSLPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		info, err := services.CollectSSLInfo(input.TargetURL)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(info, nil), nil
	})
}
