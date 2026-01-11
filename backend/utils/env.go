package utils

import (
	"bufio"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// LoadEnvFromFile 优先从本地环境变量文件加载配置
// 加载顺序：
// 1. .env.local
// 2. .env
// 后加载的文件可以覆盖前面的同名变量
func LoadEnvFromFile() {
	loadSingleEnvFile(".env.local")
	loadSingleEnvFile(".env")
}

// loadSingleEnvFile 从指定文件加载环境变量
func loadSingleEnvFile(fileName string) {
	// 以当前工作目录为基准（通常是 backend/）
	absPath, err := filepath.Abs(fileName)
	if err != nil {
		log.Printf("[Env] Failed to resolve env file path %s: %v", fileName, err)
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		// 文件不存在时静默返回，不视为错误
		if !os.IsNotExist(err) {
			log.Printf("[Env] Failed to open env file %s: %v", absPath, err)
		}
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineNumber := 0

	for scanner.Scan() {
		lineNumber++
		line := strings.TrimSpace(scanner.Text())

		// 跳过空行和注释
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "//") {
			continue
		}

		// 只处理包含 '=' 的行
		index := strings.Index(line, "=")
		if index <= 0 {
			log.Printf("[Env] Invalid line in %s at %d: %s", absPath, lineNumber, line)
			continue
		}

		key := strings.TrimSpace(line[:index])
		value := strings.TrimSpace(line[index+1:])

		// 去掉可能的引号包裹
		value = strings.Trim(value, `"'`)

		if key == "" {
			continue
		}

		// 使用文件中的值覆盖已有环境变量，确保“优先从文件读取”
		if err := os.Setenv(key, value); err != nil {
			log.Printf("[Env] Failed to set env %s from file %s: %v", key, absPath, err)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[Env] Error reading env file %s: %v", absPath, err)
	}

	log.Printf("[Env] Loaded env file: %s", absPath)
}


