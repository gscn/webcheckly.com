package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// TechStackPlugin 技术栈信息插件
type TechStackPlugin struct {
	*plugin.BasePlugin
}

// NewTechStackPlugin 创建技术栈信息插件
func NewTechStackPlugin() *TechStackPlugin {
	return &TechStackPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"tech-stack",
			15*time.Second, // 15秒超时
			false,          // 同步执行
			nil,            // 无依赖
		),
	}
}

// Execute 执行技术栈信息收集
func (p *TechStackPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		info, err := services.CollectTechStack(input.TargetURL)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(info, nil), nil
	})
}
