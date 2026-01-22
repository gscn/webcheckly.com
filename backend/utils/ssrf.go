package utils

import (
	"net"
	"strings"
)

// 禁止的域名模式（扩展列表）
var blockedDomains = []string{
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"::1",
	"metadata.google.internal",
	"169.254.169.254",
	"metadata.azure.com",
	"metadata.aws.amazon.com",
	"metadata.cloud.google.com",
	"169.254.169.254", // AWS、Azure、GCP元数据服务
	"fd00::",          // IPv6私有地址前缀
	"fe80::",          // IPv6链路本地地址前缀
}

// 禁止的域名后缀（用于匹配子域名）
var blockedDomainSuffixes = []string{
	".local",
	".localhost",
	".internal",
	".corp",
	".home",
	".lan",
}

// IsPrivateIP 检查主机名或IP是否为私有地址或禁止访问的地址
func IsPrivateIP(host string) bool {
	// 移除端口号
	host = strings.Split(host, ":")[0]
	host = strings.TrimSpace(host)

	if host == "" {
		return true // 空主机名视为不安全
	}

	hostLower := strings.ToLower(host)

	// 检查是否为禁止的域名（精确匹配或包含）
	for _, blocked := range blockedDomains {
		if hostLower == blocked || strings.Contains(hostLower, blocked) {
			return true
		}
	}

	// 检查是否为禁止的域名后缀
	for _, suffix := range blockedDomainSuffixes {
		if strings.HasSuffix(hostLower, suffix) {
			return true
		}
	}

	// 检查是否为本地主机名变体
	if isLocalhostVariant(hostLower) {
		return true
	}

	// 尝试解析为IP地址
	ip := net.ParseIP(host)
	if ip != nil {
		// 直接是IP地址
		return isPrivateIPAddress(ip)
	}

	// 解析域名（DNS查询）
	ips, err := net.LookupIP(host)
	if err != nil {
		// DNS解析失败：在生产环境中，这可能是临时问题
		// 但为了安全，如果无法解析，我们采用保守策略
		// 对于无法解析的域名，如果包含可疑模式，则拒绝
		if containsSuspiciousPattern(hostLower) {
			return true
		}
		// 否则允许通过（可能是临时DNS问题）
		return false
	}

	// 检查所有解析到的IP
	for _, ip := range ips {
		if isPrivateIPAddress(ip) {
			return true
		}
	}

	return false
}

// isLocalhostVariant 检查是否为localhost的变体
func isLocalhostVariant(host string) bool {
	variants := []string{
		"localhost",
		"127.",
		"0.0.0.0",
		"::1",
		"localhost.localdomain",
		"localhost.local",
	}

	for _, variant := range variants {
		if strings.Contains(host, variant) {
			return true
		}
	}

	return false
}

// containsSuspiciousPattern 检查是否包含可疑模式
func containsSuspiciousPattern(host string) bool {
	suspiciousPatterns := []string{
		"127.",
		"192.168.",
		"10.",
		"172.16.",
		"172.17.",
		"172.18.",
		"172.19.",
		"172.20.",
		"172.21.",
		"172.22.",
		"172.23.",
		"172.24.",
		"172.25.",
		"172.26.",
		"172.27.",
		"172.28.",
		"172.29.",
		"172.30.",
		"172.31.",
		"169.254.",
		"metadata",
		"internal",
		".local",
	}

	for _, pattern := range suspiciousPatterns {
		if strings.Contains(host, pattern) {
			return true
		}
	}

	return false
}

// isPrivateIPAddress 检查IP地址是否为私有地址
func isPrivateIPAddress(ip net.IP) bool {
	// 回环地址（127.0.0.0/8, ::1）
	if ip.IsLoopback() {
		return true
	}

	// 私有地址（RFC 1918）
	// 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
	if ip.IsPrivate() {
		return true
	}

	// 链路本地地址（169.254.0.0/16, fe80::/10）
	if ip.IsLinkLocalUnicast() {
		return true
	}

	// 云元数据服务地址
	if ip.String() == "169.254.169.254" {
		return true
	}

	// 多播地址
	if ip.IsMulticast() {
		return true
	}

	// 未指定地址（::）
	if ip.IsUnspecified() {
		return true
	}

	// 检查是否为文档化地址（RFC 5737）
	// 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
	if ip.To4() != nil {
		ipv4 := ip.To4()
		// 192.0.2.0/24
		if ipv4[0] == 192 && ipv4[1] == 0 && ipv4[2] == 2 {
			return true
		}
		// 198.51.100.0/24
		if ipv4[0] == 198 && ipv4[1] == 51 && ipv4[2] == 100 {
			return true
		}
		// 203.0.113.0/24
		if ipv4[0] == 203 && ipv4[1] == 0 && ipv4[2] == 113 {
			return true
		}
	}

	return false
}
