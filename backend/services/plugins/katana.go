package plugins

import (
	"context"
	"time"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// KatanaPlugin 页面和资源发现插件
type KatanaPlugin struct {
	*plugin.BasePlugin
}

// NewKatanaPlugin 创建katana插件
func NewKatanaPlugin() *KatanaPlugin {
	return &KatanaPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"katana",
			60*time.Second, // 60秒超时
			false,          // 同步执行
			nil,            // 无依赖
		),
	}
}

// Execute 执行katana页面和资源发现
func (p *KatanaPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		// 从options中获取taskManager（由executor传递）
		var taskManager interface{}
		if tm, ok := input.Options["taskManager"].(interface{}); ok {
			taskManager = tm
		}
		results, err := services.CollectKatanaResults(input.TargetURL, input.TaskID, taskManager)
		if err != nil {
			return plugin.HandleError(p.Name(), err), err
		}

		return plugin.CreateSuccessOutput(results, nil), nil
	})
}
