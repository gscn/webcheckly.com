package models

// HttpxResult 链接健康检查结果
// @Description httpx检测的单个URL结果
type HttpxResult struct {
	URL          string `json:"url" example:"https://example.com"`
	StatusCode   int    `json:"status" example:"200"`
	Title        string `json:"title" example:"Example Domain"`
	ResponseTime int    `json:"response_time" example:"150"`
	IP           string `json:"ip" example:"93.184.216.34"`
	TLS          bool   `json:"tls" example:"true"`
	CDN          bool   `json:"cdn" example:"false"`
}

// WebsiteInfo 网站信息
// @Description 网站基础元信息
type WebsiteInfo struct {
	Title       string   `json:"title" example:"Example Domain"`
	Description string   `json:"description" example:"This is an example domain"`
	Keywords    []string `json:"keywords" example:"example,domain"`
	Language    string   `json:"language" example:"en"`
	Charset     string   `json:"charset" example:"UTF-8"`
	Author      string   `json:"author" example:"Example Author"`
	Generator   string   `json:"generator" example:"WordPress"`
	Viewport    string   `json:"viewport" example:"width=device-width, initial-scale=1"`
	Robots      string   `json:"robots" example:"index, follow"`
}

// DomainInfo 域名信息
// @Description 域名DNS和地理位置信息
type DomainInfo struct {
	Domain       string   `json:"domain" example:"example.com"`
	IP           string   `json:"ip" example:"93.184.216.34"`
	IPv4         []string `json:"ipv4" example:"93.184.216.34"`
	IPv6         []string `json:"ipv6" example:"2606:2800:220:1:248:1893:25c8:1946"`
	MX           []string `json:"mx" example:"mail.example.com"`                      // MX记录
	NS           []string `json:"ns" example:"ns1.example.com"`                       // NS记录
	TXT          []string `json:"txt" example:"v=spf1 include:_spf.example.com ~all"` // TXT记录
	ASN          string   `json:"asn" example:"AS15133"`                              // ASN信息
	ASNName      string   `json:"asn_name" example:"Edgecast Inc."`                   // ASN名称
	Country      string   `json:"country" example:"US"`                               // 国家
	City         string   `json:"city" example:"New York"`                            // 城市
	ISP          string   `json:"isp" example:"Edgecast Inc."`                        // ISP
	Organization string   `json:"organization" example:"Example Inc."`                // 组织
}

// SSLInfo SSL证书信息
// @Description SSL/TLS证书详细信息
type SSLInfo struct {
	Issuer           string   `json:"issuer" example:"CN=Let's Encrypt Authority X3"`  // 颁发者
	Subject          string   `json:"subject" example:"CN=example.com"`                // 主题
	ValidFrom        string   `json:"valid_from" example:"2024-01-01T00:00:00Z"`       // 有效期开始
	ValidTo          string   `json:"valid_to" example:"2024-04-01T00:00:00Z"`         // 有效期结束
	IsValid          bool     `json:"is_valid" example:"true"`                         // 是否有效
	DaysRemaining    int      `json:"days_remaining" example:"90"`                     // 剩余天数
	SignatureAlg     string   `json:"signature_alg" example:"SHA256-RSA"`              // 签名算法
	PublicKeyAlg     string   `json:"public_key_alg" example:"RSA"`                    // 公钥算法
	KeySize          int      `json:"key_size" example:"2048"`                         // 密钥长度
	SerialNumber     string   `json:"serial_number" example:"1234567890ABCDEF"`        // 序列号
	DNSNames         []string `json:"dns_names" example:"example.com,www.example.com"` // SAN域名列表
	CommonName       string   `json:"common_name" example:"example.com"`               // 通用名称
	Organization     string   `json:"organization" example:"Example Inc."`             // 组织
	OrganizationUnit string   `json:"organization_unit" example:"IT Department"`       // 组织单位
	Country          string   `json:"country" example:"US"`                            // 国家
	Locality         string   `json:"locality" example:"San Francisco"`                // 地区
	Province         string   `json:"province" example:"CA"`                           // 省份
}

// TechStack 技术栈信息（整合了服务器信息和技术栈检测）
// @Description 网站使用的技术栈和服务器信息
type TechStack struct {
	// 服务器信息（从ServerInfo整合）
	Server          string            `json:"server" example:"nginx/1.20.1"`                                         // Web服务器
	PoweredBy       string            `json:"powered_by" example:"PHP/8.1.0"`                                        // X-Powered-By
	ContentType     string            `json:"content_type" example:"text/html; charset=UTF-8"`                       // Content-Type
	ContentLength   int64             `json:"content_length" example:"12345"`                                        // Content-Length
	LastModified    string            `json:"last_modified" example:"Mon, 01 Jan 2024 00:00:00 GMT"`                 // Last-Modified
	ETag            string            `json:"etag" example:"\"abc123\""`                                             // ETag
	SecurityHeaders map[string]string `json:"security_headers" example:"Strict-Transport-Security:max-age=31536000"` // 安全响应头

	// 技术栈检测（从httpx和HTML分析）
	Technologies  []string          `json:"technologies" example:"Nginx,PHP"`        // httpx检测到的技术栈
	Framework     []string          `json:"framework" example:"Laravel"`             // 框架
	CMS           []string          `json:"cms" example:"WordPress"`                 // CMS系统
	Language      []string          `json:"language" example:"PHP,JavaScript"`       // 编程语言
	JavaScriptLib []string          `json:"javascript_lib" example:"jQuery,React"`   // JavaScript库
	Analytics     []string          `json:"analytics" example:"Google Analytics"`    // 分析工具
	CDN           []string          `json:"cdn" example:"Cloudflare"`                // CDN服务
	Cache         []string          `json:"cache" example:"Redis"`                   // 缓存技术
	Database      []string          `json:"database" example:"MySQL"`                // 数据库
	OS            string            `json:"os" example:"Linux"`                      // 操作系统
	MetaTags      map[string]string `json:"meta_tags" example:"generator:WordPress"` // 技术相关元标签（已排除网站信息中的标准标签）
}

// ScanSummary 扫描统计概要，供 AI 分析使用
// @Description 扫描任务的统计摘要信息
type ScanSummary struct {
	Total       int  `json:"total" example:"100"`        // 总 URL 数
	Alive       int  `json:"alive" example:"95"`         // 可用 URL 数
	Dead        int  `json:"dead" example:"5"`           // 不可用 URL 数
	AvgResponse int  `json:"avg_response" example:"150"` // 平均响应时间（毫秒）
	Timeout     bool `json:"timeout" example:"false"`    // 是否发生超时
}

// PerformanceMetrics 性能指标
// @Description Lighthouse性能检测指标
type PerformanceMetrics struct {
	Score           int     `json:"score" example:"85"`                           // 整体性能评分 (0-100)
	FCP             float64 `json:"fcp" example:"1200.5"`                         // First Contentful Paint (ms)
	LCP             float64 `json:"lcp" example:"2500.0"`                         // Largest Contentful Paint (ms)
	CLS             float64 `json:"cls" example:"0.1"`                            // Cumulative Layout Shift
	TBT             float64 `json:"tbt" example:"200.0"`                          // Total Blocking Time (ms)
	SpeedIndex      float64 `json:"speed_index" example:"3000.0"`                 // Speed Index (ms)
	FCPScore        int     `json:"fcp_score" example:"90"`                       // FCP 评分
	LCPScore        int     `json:"lcp_score" example:"85"`                       // LCP 评分
	CLSScore        int     `json:"cls_score" example:"95"`                       // CLS 评分
	TBTScore        int     `json:"tbt_score" example:"80"`                       // TBT 评分
	SpeedIndexScore int     `json:"speed_index_score" example:"85"`               // Speed Index 评分
	LCPElement      string  `json:"lcp_element" example:"<img src=\"hero.jpg\">"` // LCP 元素定位
}

// SEOCompliance SEO 合规性
// @Description Lighthouse SEO检测结果
type SEOCompliance struct {
	Score          int     `json:"score" example:"90"`             // SEO 评分 (0-100)
	HasTitle       bool    `json:"has_title" example:"true"`       // 是否有 Title
	HasDescription bool    `json:"has_description" example:"true"` // 是否有 Description
	HasViewport    bool    `json:"has_viewport" example:"true"`    // 是否有 Viewport
	HasRobotsTxt   bool    `json:"has_robots_txt" example:"true"`  // 是否有 robots.txt
	HasCanonical   bool    `json:"has_canonical" example:"true"`   // 是否有 canonical 标签
	Indexable      bool    `json:"indexable" example:"true"`       // 是否可索引
	SPAVisibility  float64 `json:"spa_visibility" example:"0.85"`  // SPA 可见性 (Text Ratio: raw vs rendered)
}

// SecurityRisk 前端安全风险
// @Description Lighthouse安全检测结果
type SecurityRisk struct {
	Score             int               `json:"score" example:"75"`                                                    // 安全评分 (0-100)
	ThirdPartyScripts []string          `json:"third_party_scripts" example:"https://cdn.example.com"`                 // 第三方脚本来源
	ScriptCount       int               `json:"script_count" example:"10"`                                             // 脚本总数
	SecurityHeaders   map[string]string `json:"security_headers" example:"Strict-Transport-Security:max-age=31536000"` // 安全响应头 (CSP, HSTS等)
	Vulnerabilities   []string          `json:"vulnerabilities" example:"Missing CSP header"`                          // 发现的潜在漏洞
}

// AccessibilityInfo 可访问性信息
// @Description Lighthouse可访问性检测结果
type AccessibilityInfo struct {
	Score    int      `json:"score" example:"88"`                         // 可访问性评分 (0-100)
	Findings []string `json:"findings" example:"Images missing alt text"` // 主要发现项
}

// AIAnalysisInput 提供给 AI 的分析输入数据
type AIAnalysisInput struct {
	Target        string              `json:"target"`        // 目标网站
	Summary       ScanSummary         `json:"summary"`       // 扫描概要
	Results       []HttpxResult       `json:"results"`       // 链接健康检查结果（最多 200 条）
	WebsiteInfo   *WebsiteInfo        `json:"website_info"`  // 网站基础信息
	DomainInfo    *DomainInfo         `json:"domain_info"`   // 域名信息
	SSLInfo       *SSLInfo            `json:"ssl_info"`      // SSL 证书信息
	TechStack     *TechStack          `json:"tech_stack"`    // 技术栈信息
	Performance   *PerformanceMetrics `json:"performance"`   // 性能指标
	SEO           *SEOCompliance      `json:"seo"`           // SEO 合规性
	Security      *SecurityRisk       `json:"security"`      // 安全风险
	Accessibility *AccessibilityInfo  `json:"accessibility"` // 可访问性信息
	Mode          string              `json:"mode"`          // 分析模式：balanced / performance / security / seo
	Language      string              `json:"language"`      // 输出语言：zh / en
}

// AIAnalysis AI 分析报告结果
// @Description AI生成的综合分析报告
type AIAnalysis struct {
	// 总结性描述（自然语言）
	Summary string `json:"summary" example:"网站整体表现良好，但存在一些性能和安全优化空间"`
	// 整体风险等级：高 / 中 / 低
	RiskLevel string `json:"risk_level" example:"中" enums:"高,中,低"`

	// 各维度评分（0-100），越高代表越好
	AvailabilityScore int `json:"availability_score" example:"95"` // 可用性评分（链接存活率）
	PerformanceScore  int `json:"performance_score" example:"80"`  // 性能评分（响应时间等）
	SecurityScore     int `json:"security_score" example:"75"`     // 安全评分（证书、安全头等）
	SEOScore          int `json:"seo_score" example:"90"`          // SEO 评分（元信息、robots 等）

	// 关键发现列表（跨维度）
	Highlights []string `json:"highlights" example:"网站加载速度较快,SSL证书配置正确"`

	// 分维度发现
	AvailabilityFindings []string `json:"availability_findings" example:"所有链接均可正常访问"`      // 可用性方面的发现
	PerformanceFindings  []string `json:"performance_findings" example:"LCP时间略高,建议优化图片加载"` // 性能方面的发现
	SecurityFindings     []string `json:"security_findings" example:"缺少CSP安全头"`            // 安全方面的发现
	SEOFindings          []string `json:"seo_findings" example:"元信息完整,robots.txt配置正确"`     // SEO 方面的发现

	// 综合建议与优化措施
	Recommendations []string `json:"recommendations" example:"建议添加CSP安全头,优化图片加载速度"`
}
