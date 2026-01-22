package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// WhatWebPlugin 技术栈检测插件
type WhatWebPlugin struct {
	*plugin.BasePlugin
}

// NewWhatWebPlugin 创建whatweb插件
func NewWhatWebPlugin() *WhatWebPlugin {
	return &WhatWebPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"whatweb",
			30*time.Second, // 30秒超时
			false,          // 同步执行
			nil,            // 无依赖
		),
	}
}

// Execute 执行whatweb技术栈检测
func (p *WhatWebPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		result, err := services.CollectWhatWebInfo(input.TargetURL)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(result, nil), nil
	})
}
