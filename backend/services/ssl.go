package services

import (
	"crypto/ecdsa"
	"crypto/rsa"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/url"
	"strings"
	"time"

	"web-checkly/models"
)

// CollectSSLInfo 收集SSL证书信息
func CollectSSLInfo(targetURL string) (*models.SSLInfo, error) {
	log.Printf("[SSLInfo] Collecting SSL certificate info from: %s", targetURL)

	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	hostname := parsedURL.Hostname()
	if hostname == "" {
		return nil, fmt.Errorf("empty hostname")
	}

	// 如果URL没有指定端口，HTTPS默认443
	host := hostname
	if parsedURL.Port() == "" {
		if parsedURL.Scheme == "https" {
			host = hostname + ":443"
		} else {
			// 尝试HTTPS连接
			host = hostname + ":443"
		}
	} else {
		host = hostname + ":" + parsedURL.Port()
	}

	// 连接到服务器获取证书（带超时）
	dialer := &net.Dialer{
		Timeout: 10 * time.Second,
	}
	conn, err := tls.DialWithDialer(dialer, "tcp", host, &tls.Config{
		InsecureSkipVerify: true, // 允许自签名证书
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close()

	state := conn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return nil, fmt.Errorf("no certificates found")
	}

	cert := state.PeerCertificates[0]
	info := &models.SSLInfo{}

	// 基本信息
	info.Issuer = cert.Issuer.String()
	info.Subject = cert.Subject.String()
	info.ValidFrom = cert.NotBefore.Format(time.RFC3339)
	info.ValidTo = cert.NotAfter.Format(time.RFC3339)
	info.SerialNumber = cert.SerialNumber.String()

	// 检查证书是否有效
	now := time.Now()
	info.IsValid = now.After(cert.NotBefore) && now.Before(cert.NotAfter)
	daysRemaining := int(cert.NotAfter.Sub(now).Hours() / 24)
	info.DaysRemaining = daysRemaining

	// 证书算法信息
	info.SignatureAlg = cert.SignatureAlgorithm.String()
	info.PublicKeyAlg = cert.PublicKeyAlgorithm.String()

	// 密钥长度
	switch pubKey := cert.PublicKey.(type) {
	case *rsa.PublicKey:
		info.KeySize = pubKey.N.BitLen()
	case *ecdsa.PublicKey:
		// ECDSA密钥长度基于曲线
		info.KeySize = pubKey.Curve.Params().BitSize
	}

	// 通用名称
	if len(cert.Subject.CommonName) > 0 {
		info.CommonName = cert.Subject.CommonName
	}

	// 组织信息
	if len(cert.Subject.Organization) > 0 {
		info.Organization = cert.Subject.Organization[0]
	}
	if len(cert.Subject.OrganizationalUnit) > 0 {
		info.OrganizationUnit = strings.Join(cert.Subject.OrganizationalUnit, ", ")
	}
	if len(cert.Subject.Country) > 0 {
		info.Country = cert.Subject.Country[0]
	}
	if len(cert.Subject.Locality) > 0 {
		info.Locality = cert.Subject.Locality[0]
	}
	if len(cert.Subject.Province) > 0 {
		info.Province = cert.Subject.Province[0]
	}

	// DNS名称（SAN扩展）
	info.DNSNames = cert.DNSNames

	// 如果CommonName不在DNSNames中，添加它
	if info.CommonName != "" {
		found := false
		for _, dns := range info.DNSNames {
			if dns == info.CommonName {
				found = true
				break
			}
		}
		if !found {
			info.DNSNames = append(info.DNSNames, info.CommonName)
		}
	}

	log.Printf("[SSLInfo] Collected info: Issuer=%s, ValidTo=%s, DaysRemaining=%d",
		info.Issuer, info.ValidTo, info.DaysRemaining)

	return info, nil
}
