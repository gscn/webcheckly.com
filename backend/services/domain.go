package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"web-checkly/models"
)

// CollectDomainInfo 收集域名信息
func CollectDomainInfo(targetURL string) (*models.DomainInfo, error) {
	log.Printf("[DomainInfo] Collecting domain info for: %s", targetURL)

	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	domain := parsedURL.Hostname()
	if domain == "" {
		return nil, fmt.Errorf("empty hostname")
	}

	info := &models.DomainInfo{
		Domain: domain,
	}

	// 解析IP地址
	ips, err := net.LookupIP(domain)
	if err != nil {
		log.Printf("[DomainInfo] Warning: Failed to lookup IPs: %v", err)
	} else {
		for _, ip := range ips {
			ipStr := ip.String()
			if ip.To4() != nil {
				info.IPv4 = append(info.IPv4, ipStr)
				if info.IP == "" {
					info.IP = ipStr
				}
			} else {
				info.IPv6 = append(info.IPv6, ipStr)
			}
		}
	}

	// MX记录
	mxRecords, err := net.LookupMX(domain)
	if err != nil {
		log.Printf("[DomainInfo] Warning: Failed to lookup MX records: %v", err)
	} else {
		for _, mx := range mxRecords {
			info.MX = append(info.MX, strings.TrimSuffix(mx.Host, "."))
		}
	}

	// NS记录
	nsRecords, err := net.LookupNS(domain)
	if err != nil {
		log.Printf("[DomainInfo] Warning: Failed to lookup NS records: %v", err)
	} else {
		for _, ns := range nsRecords {
			info.NS = append(info.NS, strings.TrimSuffix(ns.Host, "."))
		}
	}

	// TXT记录
	txtRecords, err := net.LookupTXT(domain)
	if err != nil {
		log.Printf("[DomainInfo] Warning: Failed to lookup TXT records: %v", err)
	} else {
		info.TXT = txtRecords
	}

	// 获取ASN和地理位置信息（可选，通过第三方API）
	// 如果主IP存在，尝试获取ASN和地理位置
	// 注意：此功能使用免费API，有速率限制，失败时不影响主要功能
	if info.IP != "" {
		// 使用带超时的HTTP客户端
		client := &http.Client{
			Timeout: 5 * time.Second,
		}

		asnInfo, err := getASNInfo(client, info.IP)
		if err == nil && asnInfo != nil {
			info.ASN = asnInfo.ASN
			info.ASNName = asnInfo.ASNName
			info.City = asnInfo.City
			info.Country = asnInfo.Country
			info.ISP = asnInfo.ISP
		} else {
			// 静默失败，不影响主要功能
			log.Printf("[DomainInfo] Info: ASN lookup skipped (optional feature): %v", err)
		}
	}

	log.Printf("[DomainInfo] Collected info: Domain=%s, IP=%s, IPv4=%d, IPv6=%d, ASN=%s",
		info.Domain, info.IP, len(info.IPv4), len(info.IPv6), info.ASN)

	return info, nil
}

// ASNInfo ASN和地理位置信息
type ASNInfo struct {
	ASN     string
	ASNName string
	City    string
	Country string
	ISP     string
}

// getASNInfo 通过IP地址获取ASN和地理位置信息
// 使用免费的ip-api.com服务（限制：每分钟45次请求）
func getASNInfo(client *http.Client, ip string) (*ASNInfo, error) {
	// 检查是否为私有IP，如果是则不查询
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil || parsedIP.IsPrivate() || parsedIP.IsLoopback() {
		return nil, fmt.Errorf("private or invalid IP")
	}

	// 使用ip-api.com的免费API（无需API密钥）
	// 注意：有速率限制（每分钟45次请求）
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,message,country,city,isp,as,asname", ip)

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to query ASN info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ASN API returned status %d", resp.StatusCode)
	}

	var result struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Country string `json:"country"`
		City    string `json:"city"`
		ISP     string `json:"isp"`
		AS      string `json:"as"`
		ASName  string `json:"asname"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode ASN response: %w", err)
	}

	if result.Status != "success" {
		return nil, fmt.Errorf("ASN API error: %s", result.Message)
	}

	return &ASNInfo{
		ASN:     result.AS,
		ASNName: result.ASName,
		City:    result.City,
		Country: result.Country,
		ISP:     result.ISP,
	}, nil
}
