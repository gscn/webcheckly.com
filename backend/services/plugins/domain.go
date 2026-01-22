package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// DomainPlugin 域名信息插件
type DomainPlugin struct {
	*plugin.BasePlugin
}

// NewDomainPlugin 创建域名信息插件
func NewDomainPlugin() *DomainPlugin {
	return &DomainPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"domain-info",
			10*time.Second, // 10秒超时
			false,          // 同步执行
			nil,            // 无依赖
		),
	}
}

// Execute 执行域名信息收集
func (p *DomainPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		info, err := services.CollectDomainInfo(input.TargetURL)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(info, nil), nil
	})
}
