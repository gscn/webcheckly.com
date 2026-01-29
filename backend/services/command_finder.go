package services

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var (
	// 缓存已找到的命令路径，避免重复查找
	commandCache = make(map[string]string)
)

// findCommand 查找命令的完整路径
// 首先尝试使用 exec.LookPath，如果失败则尝试常见路径
func findCommand(cmdName string) (string, error) {
	// 检查缓存
	if cachedPath, ok := commandCache[cmdName]; ok {
		if _, err := os.Stat(cachedPath); err == nil {
			return cachedPath, nil
		}
		// 缓存中的路径不存在，清除缓存
		delete(commandCache, cmdName)
	}

	// 方法1: 使用 exec.LookPath（会检查 PATH 环境变量）
	if path, err := exec.LookPath(cmdName); err == nil {
		commandCache[cmdName] = path
		return path, nil
	}

	// 方法2: 尝试常见路径
	commonPaths := []string{
		"/usr/local/bin",
		"/usr/bin",
		"/bin",
		"/opt/homebrew/bin", // macOS
	}

	// 方法3: 检查 $HOME/go/bin（Go 安装的工具通常在这里）
	if homeDir := os.Getenv("HOME"); homeDir != "" {
		commonPaths = append(commonPaths, filepath.Join(homeDir, "go", "bin"))
	}

	// 方法4: 检查 $GOPATH/bin
	if goPath := os.Getenv("GOPATH"); goPath != "" {
		commonPaths = append(commonPaths, filepath.Join(goPath, "bin"))
	}

	// 方法5: 检查 npm 全局安装路径（用于 lighthouse）
	if npmPrefix := os.Getenv("NPM_CONFIG_PREFIX"); npmPrefix != "" {
		commonPaths = append(commonPaths, filepath.Join(npmPrefix, "bin"))
	}

	// 方法6: 检查常见的 npm 全局安装路径
	if homeDir := os.Getenv("HOME"); homeDir != "" {
		// npm 默认全局安装路径
		commonPaths = append(commonPaths,
			filepath.Join(homeDir, ".npm-global", "bin"),
			filepath.Join(homeDir, ".local", "share", "npm", "bin"),
		)
		// Node.js 版本管理器路径
		commonPaths = append(commonPaths,
			filepath.Join(homeDir, ".nvm", "versions", "node", "v18.0.0", "bin"), // 示例版本
			filepath.Join(homeDir, ".nvm", "versions", "node", "v20.0.0", "bin"), // 示例版本
		)
	}

	// 方法7: 检查系统级 npm 路径
	commonPaths = append(commonPaths,
		"/usr/lib/node_modules/.bin",
		"/opt/nodejs/bin",
	)

	// 方法8: 尝试从 $PATH 环境变量中解析
	if pathEnv := os.Getenv("PATH"); pathEnv != "" {
		paths := strings.Split(pathEnv, ":")
		commonPaths = append(commonPaths, paths...)
	}

	// 遍历所有路径查找命令
	for _, basePath := range commonPaths {
		if basePath == "" {
			continue
		}
		fullPath := filepath.Join(basePath, cmdName)
		if info, err := os.Stat(fullPath); err == nil {
			// 检查文件是否可执行
			if info.Mode().Perm()&0111 != 0 { // 检查执行权限
				commandCache[cmdName] = fullPath
				log.Printf("[CommandFinder] Found %s at: %s", cmdName, fullPath)
				return fullPath, nil
			}
		}
	}

	// 方法9: 尝试使用 which 命令（如果可用）
	if whichPath, err := exec.LookPath("which"); err == nil {
		cmd := exec.Command(whichPath, cmdName)
		if output, err := cmd.Output(); err == nil {
			path := strings.TrimSpace(string(output))
			if path != "" && path != cmdName {
				if _, err := os.Stat(path); err == nil {
					commandCache[cmdName] = path
					log.Printf("[CommandFinder] Found %s via 'which' at: %s", cmdName, path)
					return path, nil
				}
			}
		}
	}

	// 如果都找不到，返回错误并提供有用的提示
	return "", fmt.Errorf("command '%s' not found in PATH. Please ensure it is installed and accessible. Common locations: /usr/local/bin, /usr/bin, $HOME/go/bin. Current PATH: %s", cmdName, os.Getenv("PATH"))
}

// VerifyCommands 在启动时验证必需的命令是否可用
func VerifyCommands() error {
	requiredCommands := []string{"katana", "lighthouse"}
	var missingCommands []string

	for _, cmd := range requiredCommands {
		if _, err := findCommand(cmd); err != nil {
			missingCommands = append(missingCommands, cmd)
			log.Printf("[CommandFinder] Warning: %s not found: %v", cmd, err)
		}
	}

	if len(missingCommands) > 0 {
		return fmt.Errorf("required commands not found: %v. Please install them or ensure they are in PATH", missingCommands)
	}

	return nil
}

// findCommandWithFallback 查找命令，如果找不到则返回命令名（用于向后兼容）
func findCommandWithFallback(cmdName string) string {
	if path, err := findCommand(cmdName); err == nil {
		return path
	}
	// 如果找不到，返回原始命令名（让系统尝试）
	return cmdName
}
