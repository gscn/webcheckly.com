package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"web-checkly/models"
)

// TestSSLResult testssl检测结果
type TestSSLResult struct {
	Host             string            `json:"host"`
	Port             int               `json:"port"`
	Protocols        []string          `json:"protocols"`         // 支持的协议（TLS 1.0, 1.1, 1.2, 1.3等）
	Ciphers          []string          `json:"ciphers"`           // 支持的加密套件
	Vulnerabilities  []string          `json:"vulnerabilities"`   // 发现的漏洞（如：Heartbleed, POODLE等）
	CertificateInfo  *models.SSLInfo   `json:"certificate_info"`  // 证书信息
	Grade            string            `json:"grade"`             // SSL评级（A+, A, B等）
	Recommendations  []string          `json:"recommendations"`   // 安全建议
	ProtocolDetails  map[string]string `json:"protocol_details"`  // 协议详细信息
	CipherDetails    map[string]string `json:"cipher_details"`    // 加密套件详细信息
	HSTS             bool              `json:"hsts"`              // 是否启用HSTS
	HPKP             bool              `json:"hpkp"`              // 是否启用HPKP
	OCSP             bool              `json:"ocsp"`              // 是否启用OCSP Stapling
	CertificateChain []string          `json:"certificate_chain"` // 证书链
}

// RunTestSSL 使用testssl进行HTTPS检测
func RunTestSSL(ctx context.Context, targetURL string) (*TestSSLResult, error) {
	// 解析URL获取主机和端口
	host, port, err := parseHostAndPort(targetURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	// testssl命令参数
	// --json: JSON输出格式
	// --quiet: 安静模式
	// --fast: 快速模式（跳过一些耗时检测）
	cmd := exec.CommandContext(
		ctx,
		"testssl",
		"--json",
		"--quiet",
		"--fast",
		fmt.Sprintf("%s:%d", host, port),
	)

	stdout, err := cmd.StderrPipe() // testssl输出到stderr
	if err != nil {
		log.Printf("[TestSSL] Error creating stderr pipe: %v", err)
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		log.Printf("[TestSSL] Error starting testssl command: %v", err)
		return nil, err
	}

	result := &TestSSLResult{
		Host:             host,
		Port:             port,
		Protocols:        []string{},
		Ciphers:          []string{},
		Vulnerabilities:  []string{},
		Recommendations:  []string{},
		ProtocolDetails:  make(map[string]string),
		CipherDetails:    make(map[string]string),
		CertificateChain: []string{},
	}

	scanner := bufio.NewScanner(stdout)
	lineCount := 0
	var jsonBuffer strings.Builder

	// testssl可能输出多行JSON，需要合并
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			log.Printf("[TestSSL] Context cancelled while reading output. Lines read: %d", lineCount)
			cmd.Process.Kill()
			return nil, ctx.Err()
		default:
			line := scanner.Text()
			lineCount++
			jsonBuffer.WriteString(line)
			jsonBuffer.WriteString("\n")
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[TestSSL] Scanner error: %v", err)
	}

	// 等待命令完成
	if err := cmd.Wait(); err != nil {
		log.Printf("[TestSSL] TestSSL process exited with error: %v", err)
		// testssl即使成功也可能返回非零退出码，所以继续解析输出
	}

	// 解析JSON输出
	jsonOutput := jsonBuffer.String()
	if jsonOutput != "" {
		if err := parseTestSSLJSON(jsonOutput, result); err != nil {
			log.Printf("[TestSSL] Error parsing JSON output: %v", err)
			// 如果JSON解析失败，尝试文本解析
			parseTestSSLText(jsonOutput, result)
		}
	}

	log.Printf("[TestSSL] Scan completed. Protocols: %v, Vulnerabilities: %d", result.Protocols, len(result.Vulnerabilities))
	return result, nil
}

// parseTestSSLJSON 解析testssl的JSON输出
func parseTestSSLJSON(jsonOutput string, result *TestSSLResult) error {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(jsonOutput), &data); err != nil {
		return err
	}

	// 解析协议支持
	if scan, ok := data["scanResult"].([]interface{}); ok {
		for _, item := range scan {
			if itemMap, ok := item.(map[string]interface{}); ok {
				id := itemMap["id"].(string)
				severity := itemMap["severity"].(string)

				// 检测协议支持
				if strings.Contains(id, "protocol") {
					if finding, ok := itemMap["finding"].(string); ok {
						if strings.Contains(finding, "supported") || strings.Contains(finding, "offered") {
							protocol := extractProtocol(id)
							if protocol != "" {
								result.Protocols = append(result.Protocols, protocol)
							}
						}
					}
				}

				// 检测漏洞
				if severity == "CRITICAL" || severity == "HIGH" || severity == "MEDIUM" {
					if finding, ok := itemMap["finding"].(string); ok {
						result.Vulnerabilities = append(result.Vulnerabilities, finding)
					}
				}

				// 检测加密套件
				if strings.Contains(id, "cipher") {
					if finding, ok := itemMap["finding"].(string); ok {
						result.Ciphers = append(result.Ciphers, finding)
					}
				}
			}
		}
	}

	return nil
}

// parseTestSSLText 解析testssl的文本输出（备用方案）
func parseTestSSLText(textOutput string, result *TestSSLResult) {
	lines := strings.Split(textOutput, "\n")

	protocolRegex := regexp.MustCompile(`(?i)(TLS\s+)?(\d+\.\d+)`)
	vulnerabilityKeywords := []string{"VULNERABLE", "NOT ok", "WARN", "CRITICAL"}
	cipherRegex := regexp.MustCompile(`(?i)(TLS|SSL)_[A-Z0-9_]+`)

	for _, line := range lines {
		lineLower := strings.ToLower(line)

		// 检测协议
		if matches := protocolRegex.FindStringSubmatch(line); len(matches) > 0 {
			protocol := "TLS " + matches[len(matches)-1]
			if !containsString(result.Protocols, protocol) {
				result.Protocols = append(result.Protocols, protocol)
			}
		}

		// 检测漏洞
		for _, keyword := range vulnerabilityKeywords {
			if strings.Contains(lineLower, keyword) {
				// 提取漏洞名称
				if strings.Contains(lineLower, "heartbleed") {
					result.Vulnerabilities = appendIfNotExists(result.Vulnerabilities, "Heartbleed")
				} else if strings.Contains(lineLower, "poodle") {
					result.Vulnerabilities = appendIfNotExists(result.Vulnerabilities, "POODLE")
				} else if strings.Contains(lineLower, "drown") {
					result.Vulnerabilities = appendIfNotExists(result.Vulnerabilities, "DROWN")
				} else if strings.Contains(lineLower, "freak") {
					result.Vulnerabilities = appendIfNotExists(result.Vulnerabilities, "FREAK")
				}
			}
		}

		// 检测加密套件
		if matches := cipherRegex.FindAllString(line, -1); len(matches) > 0 {
			for _, cipher := range matches {
				if !containsString(result.Ciphers, cipher) {
					result.Ciphers = append(result.Ciphers, cipher)
				}
			}
		}

		// 检测HSTS
		if strings.Contains(lineLower, "hsts") && (strings.Contains(lineLower, "yes") || strings.Contains(lineLower, "enabled")) {
			result.HSTS = true
		}

		// 检测OCSP
		if strings.Contains(lineLower, "ocsp") && (strings.Contains(lineLower, "yes") || strings.Contains(lineLower, "enabled")) {
			result.OCSP = true
		}
	}
}

// extractProtocol 从ID中提取协议名称
func extractProtocol(id string) string {
	if strings.Contains(id, "TLS1_3") {
		return "TLS 1.3"
	} else if strings.Contains(id, "TLS1_2") {
		return "TLS 1.2"
	} else if strings.Contains(id, "TLS1_1") {
		return "TLS 1.1"
	} else if strings.Contains(id, "TLS1_0") || strings.Contains(id, "TLS1") {
		return "TLS 1.0"
	} else if strings.Contains(id, "SSL3") {
		return "SSL 3.0"
	} else if strings.Contains(id, "SSL2") {
		return "SSL 2.0"
	}
	return ""
}

// parseHostAndPort 解析URL获取主机和端口
func parseHostAndPort(targetURL string) (string, int, error) {
	// 简单的URL解析
	if strings.HasPrefix(targetURL, "http://") {
		targetURL = strings.TrimPrefix(targetURL, "http://")
		return parseHostPort(targetURL, 80)
	} else if strings.HasPrefix(targetURL, "https://") {
		targetURL = strings.TrimPrefix(targetURL, "https://")
		return parseHostPort(targetURL, 443)
	}

	// 如果没有协议，默认HTTPS
	return parseHostPort(targetURL, 443)
}

// parseHostPort 解析主机和端口
func parseHostPort(hostPort string, defaultPort int) (string, int, error) {
	parts := strings.Split(hostPort, ":")
	host := parts[0]
	port := defaultPort

	if len(parts) > 1 {
		p, err := strconv.Atoi(parts[1])
		if err == nil {
			port = p
		}
	}

	// 移除路径部分
	host = strings.Split(host, "/")[0]

	return host, port, nil
}

// appendIfNotExists 如果不存在则追加
func appendIfNotExists(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

// CollectTestSSLInfo 收集testssl检测结果（用于插件）
func CollectTestSSLInfo(targetURL string) (*TestSSLResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second) // testssl可能需要更长时间
	defer cancel()

	return RunTestSSL(ctx, targetURL)
}

// ConvertTestSSLToSSLInfo 将TestSSL结果转换为SSLInfo格式（用于兼容现有系统）
func ConvertTestSSLToSSLInfo(testSSLResult *TestSSLResult) *models.SSLInfo {
	if testSSLResult == nil {
		return nil
	}

	// 如果有证书信息，优先使用它
	if testSSLResult.CertificateInfo != nil {
		sslInfo := testSSLResult.CertificateInfo
		// 补充testssl特有的信息
		if len(testSSLResult.Vulnerabilities) > 0 {
			// 如果有漏洞，标记为无效（即使证书本身有效）
			sslInfo.IsValid = false
		}
		return sslInfo
	}

	// 否则，创建一个基本的SSLInfo
	sslInfo := &models.SSLInfo{
		IsValid:  len(testSSLResult.Vulnerabilities) == 0,
		DNSNames: []string{testSSLResult.Host},
	}

	// 从testssl结果中提取协议信息（如果有）
	if len(testSSLResult.Protocols) > 0 {
		// 检查是否支持TLS 1.3（最安全的协议）
		hasTLS13 := false
		for _, protocol := range testSSLResult.Protocols {
			if strings.Contains(protocol, "1.3") {
				hasTLS13 = true
				break
			}
		}
		// 如果不支持TLS 1.3，可能影响安全性评估
		if !hasTLS13 && len(testSSLResult.Protocols) > 0 {
			// 检查是否只支持旧协议（TLS 1.0, 1.1）
			hasOldProtocols := false
			for _, protocol := range testSSLResult.Protocols {
				if strings.Contains(protocol, "1.0") || strings.Contains(protocol, "1.1") {
					hasOldProtocols = true
					break
				}
			}
			if hasOldProtocols {
				sslInfo.IsValid = false // 旧协议不安全
			}
		}
	}

	return sslInfo
}

// MergeTestSSLToSSLInfo 将TestSSL结果合并到现有的SSLInfo中（保留现有数据）
func MergeTestSSLToSSLInfo(testssl *TestSSLResult, existing *models.SSLInfo) *models.SSLInfo {
	if testssl == nil {
		return existing
	}
	if existing == nil {
		return ConvertTestSSLToSSLInfo(testssl)
	}

	// 合并证书信息
	merged := *existing // 复制现有信息

	// 如果有testssl的证书信息，优先使用
	if testssl.CertificateInfo != nil {
		merged = *testssl.CertificateInfo
		// 保留现有的一些字段（如果testssl没有提供）
		if merged.DNSNames == nil || len(merged.DNSNames) == 0 {
			merged.DNSNames = existing.DNSNames
		}
	}

	// 根据testssl的漏洞信息更新有效性
	if len(testssl.Vulnerabilities) > 0 {
		merged.IsValid = false
	}

	// 根据协议支持情况更新有效性
	if len(testssl.Protocols) > 0 {
		hasTLS13 := false
		hasOldProtocols := false
		for _, protocol := range testssl.Protocols {
			if strings.Contains(protocol, "1.3") {
				hasTLS13 = true
			}
			if strings.Contains(protocol, "1.0") || strings.Contains(protocol, "1.1") {
				hasOldProtocols = true
			}
		}
		// 如果只支持旧协议，标记为不安全
		if hasOldProtocols && !hasTLS13 {
			merged.IsValid = false
		}
	}

	return &merged
}
