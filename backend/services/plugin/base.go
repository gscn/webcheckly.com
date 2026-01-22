package plugin

import (
	"context"
	"fmt"
	"log"
	"time"
	"web-checkly/models"
)

// BasePlugin 插件基类，提供通用功能
type BasePlugin struct {
	name         string
	timeout      time.Duration
	isAsync      bool
	dependencies []string
}

// NewBasePlugin 创建基础插件
func NewBasePlugin(name string, timeout time.Duration, isAsync bool, dependencies []string) *BasePlugin {
	if timeout <= 0 {
		timeout = 60 * time.Second // 默认超时60秒
	}
	return &BasePlugin{
		name:         name,
		timeout:      timeout,
		isAsync:      isAsync,
		dependencies: dependencies,
	}
}

// Name 返回插件名称
func (p *BasePlugin) Name() string {
	return p.name
}

// IsAsync 是否异步执行
func (p *BasePlugin) IsAsync() bool {
	return p.isAsync
}

// Timeout 返回超时时间
func (p *BasePlugin) Timeout() time.Duration {
	return p.timeout
}

// Dependencies 返回依赖列表
func (p *BasePlugin) Dependencies() []string {
	return p.dependencies
}

// ExecuteWithTimeout 带超时控制的执行包装
func ExecuteWithTimeout(ctx context.Context, plugin Plugin, input *PluginInput, executeFunc func(context.Context, *PluginInput) (*PluginOutput, error)) (*PluginOutput, error) {
	// 创建带超时的上下文
	timeout := plugin.Timeout()
	if timeout <= 0 {
		timeout = 60 * time.Second
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// 记录开始时间
	startTime := time.Now()

	// 执行插件逻辑
	output, err := executeFunc(ctxWithTimeout, input)

	// 记录执行时间
	duration := time.Since(startTime)
	if err != nil {
		log.Printf("[Plugin:%s] Execution failed after %v: %v", plugin.Name(), duration, err)
		return &PluginOutput{
			Success: false,
			Error:   err.Error(),
		}, err
	}

	log.Printf("[Plugin:%s] Execution completed in %v", plugin.Name(), duration)
	return output, nil
}

// HandleError 统一错误处理
func HandleError(pluginName string, err error) *PluginOutput {
	errorMsg := "Unknown error"
	if err != nil {
		errorMsg = err.Error()
	}

	log.Printf("[Plugin:%s] Error: %v", pluginName, err)

	return &PluginOutput{
		Success: false,
		Error:   errorMsg,
	}
}

// CreateSuccessOutput 创建成功输出
func CreateSuccessOutput(data interface{}, progress *models.TaskProgress) *PluginOutput {
	return &PluginOutput{
		Success:  true,
		Data:     data,
		Progress: progress,
	}
}

// ValidateInput 验证输入参数
func ValidateInput(input *PluginInput) error {
	if input == nil {
		return fmt.Errorf("input cannot be nil")
	}
	if input.TaskID == "" {
		return fmt.Errorf("task ID cannot be empty")
	}
	if input.TargetURL == "" {
		return fmt.Errorf("target URL cannot be empty")
	}
	return nil
}

// 预定义错误
var (
	ErrInvalidInput = fmt.Errorf("invalid input")
)
