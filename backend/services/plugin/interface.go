package plugin

import (
	"context"
	"time"
	"web-checkly/models"
)

// PluginInput 插件输入参数
type PluginInput struct {
	TaskID    string                 // 任务ID
	TargetURL string                 // 目标URL
	Options   map[string]interface{} // 插件特定选项
	Language  string                 // 语言 (zh/en)
}

// PluginOutput 插件输出结果
type PluginOutput struct {
	Success  bool                 // 是否成功
	Data     interface{}          // 结果数据（类型由具体插件决定）
	Error    string               // 错误信息（如果有）
	Progress *models.TaskProgress // 进度信息（如果有）
}

// Plugin 插件接口
type Plugin interface {
	// Name 返回插件名称
	Name() string

	// Execute 执行插件逻辑
	// ctx: 上下文，用于取消和超时控制
	// input: 输入参数
	// 返回: 输出结果和错误
	Execute(ctx context.Context, input *PluginInput) (*PluginOutput, error)

	// IsAsync 是否异步执行
	// 返回 true 表示插件会异步执行，Execute 方法会立即返回
	// 返回 false 表示插件会同步执行，Execute 方法会阻塞直到完成
	IsAsync() bool

	// Timeout 返回插件执行超时时间
	// 如果返回 0，使用默认超时时间（60秒）
	Timeout() time.Duration

	// Dependencies 返回插件依赖的其他插件名称列表
	// 执行器会确保依赖的插件先执行
	Dependencies() []string
}
