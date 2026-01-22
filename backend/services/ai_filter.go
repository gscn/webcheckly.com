package services

import (
	"web-checkly/models"
)

// FilterImportantMetrics 过滤出重要的指标，减少传递给AI的数据量
func FilterImportantMetrics(input *models.AIAnalysisInput) *models.AIAnalysisInput {
	filtered := &models.AIAnalysisInput{
		Target:   input.Target,
		Language: input.Language,
		Mode:     input.Mode,
		Summary:  input.Summary, // 摘要信息保留
	}

	// 网站信息：只保留关键字段
	if input.WebsiteInfo != nil {
		filtered.WebsiteInfo = &models.WebsiteInfo{
			Title:       input.WebsiteInfo.Title,
			Description: input.WebsiteInfo.Description,
			Language:    input.WebsiteInfo.Language,
			Robots:      input.WebsiteInfo.Robots,
		}
	}

	// 域名信息：只保留关键字段
	if input.DomainInfo != nil {
		filtered.DomainInfo = &models.DomainInfo{
			Domain:       input.DomainInfo.Domain,
			IP:           input.DomainInfo.IP,
			Country:      input.DomainInfo.Country,
			City:         input.DomainInfo.City,
			ISP:          input.DomainInfo.ISP,
			Organization: input.DomainInfo.Organization,
		}
	}

	// SSL信息：只保留关键字段
	if input.SSLInfo != nil {
		filtered.SSLInfo = &models.SSLInfo{
			Issuer:        input.SSLInfo.Issuer,
			Subject:       input.SSLInfo.Subject,
			ValidFrom:     input.SSLInfo.ValidFrom,
			ValidTo:       input.SSLInfo.ValidTo,
			IsValid:       input.SSLInfo.IsValid,
			DaysRemaining: input.SSLInfo.DaysRemaining,
			SignatureAlg:  input.SSLInfo.SignatureAlg,
			KeySize:       input.SSLInfo.KeySize,
		}
	}

	// 技术栈：只保留关键字段
	if input.TechStack != nil {
		filtered.TechStack = &models.TechStack{
			Server:       input.TechStack.Server,
			PoweredBy:    input.TechStack.PoweredBy,
			Technologies: input.TechStack.Technologies,
			Framework:    input.TechStack.Framework,
			CMS:          input.TechStack.CMS,
			CDN:          input.TechStack.CDN,
		}
		// 限制技术栈数组长度，避免数据过大
		if len(filtered.TechStack.Technologies) > 10 {
			filtered.TechStack.Technologies = filtered.TechStack.Technologies[:10]
		}
		if len(filtered.TechStack.Framework) > 5 {
			filtered.TechStack.Framework = filtered.TechStack.Framework[:5]
		}
		if len(filtered.TechStack.CMS) > 3 {
			filtered.TechStack.CMS = filtered.TechStack.CMS[:3]
		}
		if len(filtered.TechStack.CDN) > 3 {
			filtered.TechStack.CDN = filtered.TechStack.CDN[:3]
		}
	}

	// 性能指标：保留所有字段（数据量不大）
	if input.Performance != nil {
		filtered.Performance = input.Performance
	}

	// SEO合规性：保留所有字段（数据量不大）
	if input.SEO != nil {
		filtered.SEO = input.SEO
	}

	// 安全风险：只保留关键字段
	if input.Security != nil {
		filtered.Security = &models.SecurityRisk{
			Score:             input.Security.Score,
			ScriptCount:       input.Security.ScriptCount,
			ThirdPartyScripts: input.Security.ThirdPartyScripts,
			Vulnerabilities:   input.Security.Vulnerabilities,
		}
		// 限制第三方脚本数量
		if len(filtered.Security.ThirdPartyScripts) > 10 {
			filtered.Security.ThirdPartyScripts = filtered.Security.ThirdPartyScripts[:10]
		}
		if len(filtered.Security.Vulnerabilities) > 10 {
			filtered.Security.Vulnerabilities = filtered.Security.Vulnerabilities[:10]
		}
	}

	// 可访问性：保留所有字段（数据量不大）
	if input.Accessibility != nil {
		filtered.Accessibility = input.Accessibility
	}

	// 链接健康检查结果：只保留关键统计和少量样本
	// 限制为最多20条，优先选择错误和慢速链接
	if len(input.Results) > 0 {
		maxResults := 20
		if len(input.Results) < maxResults {
			maxResults = len(input.Results)
		}

		// 优先选择状态码错误（4xx, 5xx）和响应时间较慢的链接
		errorResults := []models.HttpxResult{}
		slowResults := []models.HttpxResult{}
		normalResults := []models.HttpxResult{}

		for _, r := range input.Results {
			if r.StatusCode >= 400 {
				errorResults = append(errorResults, r)
			} else if r.ResponseTime > 1000 {
				slowResults = append(slowResults, r)
			} else {
				normalResults = append(normalResults, r)
			}
		}

		// 组合：错误链接 + 慢速链接 + 正常链接（按优先级）
		filtered.Results = make([]models.HttpxResult, 0, maxResults)
		// 先添加错误链接（最多10条）
		for i := 0; i < len(errorResults) && len(filtered.Results) < maxResults && i < 10; i++ {
			filtered.Results = append(filtered.Results, errorResults[i])
		}
		// 再添加慢速链接（最多5条）
		for i := 0; i < len(slowResults) && len(filtered.Results) < maxResults && i < 5; i++ {
			filtered.Results = append(filtered.Results, slowResults[i])
		}
		// 最后添加正常链接（填充剩余空间）
		for i := 0; i < len(normalResults) && len(filtered.Results) < maxResults; i++ {
			filtered.Results = append(filtered.Results, normalResults[i])
		}
	}

	return filtered
}
