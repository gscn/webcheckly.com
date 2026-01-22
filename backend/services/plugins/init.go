package plugins

import (
	"log"
	"web-checkly/services/plugin"
)

// 导出 InitPlugins 供外部调用
// InitPlugins 初始化并注册所有插件
func InitPlugins() {
	plugins := []plugin.Plugin{
		NewWebsitePlugin(),
		NewDomainPlugin(),
		NewSSLPlugin(),
		NewTechStackPlugin(),
		NewLighthousePlugin(),
		NewHttpxPlugin(),
		NewAIPlugin(),
		NewKatanaPlugin(),
		NewTestSSLPlugin(),
		NewWhatWebPlugin(),
	}

	for _, p := range plugins {
		if err := plugin.RegisterPlugin(p); err != nil {
			log.Printf("[Plugins] Failed to register plugin %s: %v", p.Name(), err)
		} else {
			log.Printf("[Plugins] Registered plugin: %s", p.Name())
		}
	}

	log.Printf("[Plugins] Total plugins registered: %d", len(plugin.ListPlugins()))
}
