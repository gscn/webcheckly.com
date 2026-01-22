package plugins

import (
	"context"
	"log"
	"time"
	"web-checkly/models"
	"web-checkly/services"
	"web-checkly/services/plugin"
)

// HttpxPlugin Httpx 链接健康检查插件
type HttpxPlugin struct {
	*plugin.BasePlugin
}

// NewHttpxPlugin 创建 Httpx 插件
func NewHttpxPlugin() *HttpxPlugin {
	return &HttpxPlugin{
		BasePlugin: plugin.NewBasePlugin(
			"link-health",
			60*time.Second, // 60秒超时
			false,          // 同步执行（但内部使用 channel）
			nil,            // 无依赖
		),
	}
}

// Execute 执行链接健康检查
func (p *HttpxPlugin) Execute(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
	if err := plugin.ValidateInput(input); err != nil {
		return plugin.HandleError(p.Name(), err), err
	}

	return plugin.ExecuteWithTimeout(ctx, p, input, func(ctx context.Context, input *plugin.PluginInput) (*plugin.PluginOutput, error) {
		// 从选项中获取 URL 列表
		options := input.Options
		if options == nil {
			return plugin.HandleError(p.Name(), plugin.ErrInvalidInput), plugin.ErrInvalidInput
		}

		urlsInterface, ok := options["urls"]
		if !ok {
			return plugin.HandleError(p.Name(), plugin.ErrInvalidInput), plugin.ErrInvalidInput
		}

		// 转换 URL 列表
		urls := []string{}
		if urlList, ok := urlsInterface.([]string); ok {
			urls = urlList
		} else if urlList, ok := urlsInterface.([]interface{}); ok {
			for _, u := range urlList {
				if urlStr, ok := u.(string); ok {
					urls = append(urls, urlStr)
				}
			}
		}

		if len(urls) == 0 {
			return plugin.HandleError(p.Name(), plugin.ErrInvalidInput), plugin.ErrInvalidInput
		}

		// 创建结果 channel
		resultsChan := make(chan models.HttpxResult, 100)
		results := []models.HttpxResult{}

		// 启动 goroutine 收集结果
		done := make(chan error, 1)
		go func() {
			for result := range resultsChan {
				results = append(results, result)
			}
			done <- nil
		}()

		// 运行 Httpx（RunHttpx 内部会负责关闭 channel）
		err := services.RunHttpx(ctx, urls, resultsChan)

		// 等待结果收集完成（等待 channel 被关闭）
		<-done

		if err != nil {
			log.Printf("[Plugin:link-health] RunHttpx returned error: %v", err)
			return plugin.HandleError(p.Name(), err), err
		}

		// 记录收集到的结果数量
		log.Printf("[Plugin:link-health] Collected %d results from httpx scan", len(results))

		// 创建进度信息
		progress := &models.TaskProgress{
			Current: len(results),
			Total:   len(urls),
		}

		log.Printf("[Plugin:link-health] Returning success output with %d results", len(results))
		return plugin.CreateSuccessOutput(results, progress), nil
	})
}
