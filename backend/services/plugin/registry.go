package plugin

import (
	"fmt"
	"sync"
)

var (
	// pluginRegistry 插件注册表
	pluginRegistry = make(map[string]Plugin)
	registryMu     sync.RWMutex
)

// RegisterPlugin 注册插件
func RegisterPlugin(plugin Plugin) error {
	if plugin == nil {
		return fmt.Errorf("plugin cannot be nil")
	}

	name := plugin.Name()
	if name == "" {
		return fmt.Errorf("plugin name cannot be empty")
	}

	registryMu.Lock()
	defer registryMu.Unlock()

	if _, exists := pluginRegistry[name]; exists {
		return fmt.Errorf("plugin %s already registered", name)
	}

	pluginRegistry[name] = plugin
	return nil
}

// GetPlugin 获取插件
func GetPlugin(name string) (Plugin, error) {
	registryMu.RLock()
	defer registryMu.RUnlock()

	plugin, ok := pluginRegistry[name]
	if !ok {
		return nil, fmt.Errorf("plugin %s not found", name)
	}

	return plugin, nil
}

// ListPlugins 列出所有已注册的插件
func ListPlugins() []string {
	registryMu.RLock()
	defer registryMu.RUnlock()

	names := make([]string, 0, len(pluginRegistry))
	for name := range pluginRegistry {
		names = append(names, name)
	}

	return names
}

// UnregisterPlugin 取消注册插件（主要用于测试）
func UnregisterPlugin(name string) {
	registryMu.Lock()
	defer registryMu.Unlock()

	delete(pluginRegistry, name)
}

// ClearRegistry 清空注册表（主要用于测试）
func ClearRegistry() {
	registryMu.Lock()
	defer registryMu.Unlock()

	pluginRegistry = make(map[string]Plugin)
}
