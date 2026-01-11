package utils

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

const (
	// MaxURLLength 最大URL长度（RFC 7230建议）
	MaxURLLength = 2048
	// MinURLLength 最小URL长度（至少包含协议和主机名）
	MinURLLength = 8
)

var (
	// 禁止的协议模式
	forbiddenSchemes = []string{"file", "javascript", "data", "vbscript", "about", "chrome", "chrome-extension"}
	// 主机名验证正则（允许字母、数字、点、连字符、下划线）
	hostnameRegex = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-_]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-_]{0,61}[a-zA-Z0-9])?)*$`)
)

// ValidateURL 验证URL格式和安全性
func ValidateURL(raw string) error {
	// 移除前后空格
	raw = strings.TrimSpace(raw)

	// 检查空值
	if raw == "" {
		return fmt.Errorf("URL cannot be empty")
	}

	// 检查长度限制
	if len(raw) < MinURLLength {
		return fmt.Errorf("URL too short (minimum %d characters)", MinURLLength)
	}
	if len(raw) > MaxURLLength {
		return fmt.Errorf("URL too long (maximum %d characters)", MaxURLLength)
	}

	// 检查是否包含控制字符
	for _, char := range raw {
		if char < 32 && char != '\t' && char != '\n' && char != '\r' {
			return fmt.Errorf("URL contains invalid control characters")
		}
	}

	// 解析URL
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	// 验证协议
	if u.Scheme == "" {
		// 如果没有协议，检查是否以//开头（协议相对URL）
		if strings.HasPrefix(raw, "//") {
			return fmt.Errorf("protocol-relative URLs are not allowed")
		}
	} else {
		// 检查禁止的协议
		schemeLower := strings.ToLower(u.Scheme)
		for _, forbidden := range forbiddenSchemes {
			if schemeLower == forbidden {
				return fmt.Errorf("forbidden protocol: %s", u.Scheme)
			}
		}
	}

	// 验证主机名
	hostname := u.Hostname()
	if hostname == "" {
		return fmt.Errorf("missing hostname")
	}

	// 验证主机名格式（允许IP地址和域名）
	if !isValidHostname(hostname) && !isValidIP(hostname) {
		return fmt.Errorf("invalid hostname format: %s", hostname)
	}

	// 检查主机名长度（RFC 1035限制为253字符）
	if len(hostname) > 253 {
		return fmt.Errorf("hostname too long (maximum 253 characters)")
	}

	return nil
}

// NormalizeURL 规范化URL，添加必要的验证
func NormalizeURL(raw string) (string, error) {
	// 先验证URL
	if err := ValidateURL(raw); err != nil {
		return "", err
	}

	// 移除前后空格
	raw = strings.TrimSpace(raw)

	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid URL format: %w", err)
	}

	// 必须指定协议
	if u.Scheme == "" {
		u.Scheme = "https"
	}

	// 只允许HTTP和HTTPS协议
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", fmt.Errorf("only HTTP and HTTPS protocols are allowed")
	}

	// 规范化主机名（移除尾部点）
	u.Host = strings.TrimSuffix(u.Host, ".")

	// 规范化路径（移除多余的斜杠，但保留根路径）
	u.Path = strings.TrimSuffix(u.Path, "/")
	if u.Path == "" {
		u.Path = "/"
	}

	return u.String(), nil
}

// isValidHostname 验证主机名格式
func isValidHostname(hostname string) bool {
	// 空值检查
	if hostname == "" {
		return false
	}

	// 检查是否包含非法字符
	if strings.ContainsAny(hostname, " \t\n\r") {
		return false
	}

	// 使用正则表达式验证
	return hostnameRegex.MatchString(hostname)
}

// isValidIP 验证是否为有效的IP地址格式（不验证是否为私有IP）
func isValidIP(ip string) bool {
	// 简单的IP格式检查（IPv4和IPv6）
	parts := strings.Split(ip, ".")
	if len(parts) == 4 {
		// 可能是IPv4
		for _, part := range parts {
			if len(part) == 0 || len(part) > 3 {
				return false
			}
			for _, char := range part {
				if char < '0' || char > '9' {
					return false
				}
			}
		}
		return true
	}

	// 可能是IPv6（简化检查）
	if strings.Contains(ip, ":") {
		return true
	}

	return false
}
