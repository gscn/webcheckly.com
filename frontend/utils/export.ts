import { ScanReport } from "./report"
import * as XLSX from "xlsx"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getTranslation, type Locale } from "./i18n"

// 生成文件名（包含时间戳和域名）
function generateFilename(baseName: string, extension: string, target?: string): string {
  const now = new Date()
  const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_")
  let domain = ""
  
  if (target) {
    try {
      const url = new URL(target)
      domain = url.hostname.replace(/[^a-zA-Z0-9]/g, "_")
      if (domain.length > 30) domain = domain.substring(0, 30)
    } catch {
      // 如果URL解析失败，使用原始target的一部分
      domain = target.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)
    }
  }
  
  const domainPart = domain ? `_${domain}` : ""
  return `${baseName}${domainPart}_${timestamp}.${extension}`
}

function download(blob: Blob, filename: string) {
  try {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
    // 延迟释放URL，确保下载完成
    setTimeout(() => URL.revokeObjectURL(url), 100)
  } catch (error) {
    // 下载失败是严重错误，始终记录
    console.error("[Export] Download failed:", error)
    throw new Error("文件下载失败，请检查浏览器设置")
  }
}

export function exportJSON(report: ScanReport) {
  try {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  })
    download(blob, generateFilename("scan-report", "json", report.target))
  } catch (error) {
    console.error("[Export] JSON export failed:", error)
    throw new Error("JSON导出失败")
  }
}

export function exportMarkdown(report: ScanReport, locale: Locale = "zh") {
  const lines: string[] = []

  lines.push(`# Website Scan Report`)
  lines.push(``)
  lines.push(`**Target:** ${report.target}`)
  lines.push(`**Scanned At:** ${report.scannedAt}`)
  lines.push(``)
  lines.push(`## Summary`)
  lines.push(`- Total URLs: ${report.summary.total}`)
  lines.push(`- Alive: ${report.summary.alive}`)
  lines.push(`- Dead: ${report.summary.dead}`)
  lines.push(`- Avg Response: ${report.summary.avgResponse} ms`)
  lines.push(``)

  // AI Analysis
  if (report.aiAnalysis) {
    lines.push(`## AI Analysis`)
    const ai = report.aiAnalysis
    const summary = cleanSummary(ai.summary)
    if (summary) lines.push(`- **Summary:** ${summary}`)
    if (ai.risk_level) lines.push(`- **Risk Level:** ${ai.risk_level}`)
    if (
      ai.availability_score !== undefined ||
      ai.performance_score !== undefined ||
      ai.security_score !== undefined ||
      ai.seo_score !== undefined
    ) {
      lines.push(`- **Scores:**`)
      if (ai.availability_score !== undefined) lines.push(`  - Availability: ${ai.availability_score}`)
      if (ai.performance_score !== undefined) lines.push(`  - Performance: ${ai.performance_score}`)
      if (ai.security_score !== undefined) lines.push(`  - Security: ${ai.security_score}`)
      if (ai.seo_score !== undefined) lines.push(`  - SEO: ${ai.seo_score}`)
    }
    if (ai.highlights && ai.highlights.length > 0) {
      lines.push(`- **Highlights:**`)
      ai.highlights.forEach((h) => lines.push(`  - ${h}`))
    }
    if (ai.availability_findings && ai.availability_findings.length > 0) {
      lines.push(`- **Availability Findings:**`)
      ai.availability_findings.forEach((h) => lines.push(`  - ${h}`))
    }
    if (ai.performance_findings && ai.performance_findings.length > 0) {
      lines.push(`- **Performance Findings:**`)
      ai.performance_findings.forEach((h) => lines.push(`  - ${h}`))
    }
    if (ai.security_findings && ai.security_findings.length > 0) {
      lines.push(`- **Security Findings:**`)
      ai.security_findings.forEach((h) => lines.push(`  - ${h}`))
    }
    if (ai.seo_findings && ai.seo_findings.length > 0) {
      lines.push(`- **SEO Findings:**`)
      ai.seo_findings.forEach((h) => lines.push(`  - ${h}`))
    }
    if (ai.recommendations && ai.recommendations.length > 0) {
      lines.push(`- **Recommendations:**`)
      ai.recommendations.forEach((r) => lines.push(`  - ${r}`))
    }
    lines.push(``)
  }

  // Performance Metrics
  if (report.performance) {
    lines.push(`## ${getTranslation(locale, "scan.performanceTitle")}`)
    const perf = report.performance
    if (perf.score !== undefined) lines.push(`- **Overall Score:** ${perf.score}`)
    if (perf.fcp !== undefined) lines.push(`- **First Contentful Paint (FCP):** ${perf.fcp.toFixed(2)} ms`)
    if (perf.lcp !== undefined) lines.push(`- **Largest Contentful Paint (LCP):** ${perf.lcp.toFixed(2)} ms`)
    if (perf.cls !== undefined) lines.push(`- **Cumulative Layout Shift (CLS):** ${perf.cls.toFixed(4)}`)
    if (perf.tbt !== undefined) lines.push(`- **Total Blocking Time (TBT):** ${perf.tbt.toFixed(2)} ms`)
    if (perf.speed_index !== undefined) lines.push(`- **Speed Index:** ${perf.speed_index.toFixed(2)} ms`)
    if (perf.lcp_element) lines.push(`- **LCP Element:** ${perf.lcp_element}`)
    lines.push(``)
  }

  // SEO Compliance
  if (report.seo) {
    lines.push(`## SEO Compliance`)
    const seo = report.seo
    if (seo.score !== undefined) lines.push(`- **Overall Score:** ${seo.score}`)
    lines.push(`- **Title Present:** ${seo.has_title ? "✅" : "❌"}`)
    lines.push(`- **Description Present:** ${seo.has_description ? "✅" : "❌"}`)
    lines.push(`- **Viewport Present:** ${seo.has_viewport ? "✅" : "❌"}`)
    lines.push(`- **Robots.txt Present:** ${seo.has_robots_txt ? "✅" : "❌"}`)
    lines.push(`- **Canonical Valid:** ${seo.has_canonical ? "✅" : "❌"}`)
    lines.push(`- **Indexable:** ${seo.indexable ? "✅" : "❌"}`)
    if (seo.spa_visibility !== undefined) lines.push(`- **SPA/JS Visibility:** ${(seo.spa_visibility * 100).toFixed(0)}%`)
    lines.push(``)
  }

  // Security Risk
  if (report.security) {
    lines.push(`## Security Risk`)
    const sec = report.security
    lines.push(`- **Overall Score:** ${sec.score}`)
    lines.push(`- **Third-Party Scripts:** ${sec.script_count}`)
    if (sec.third_party_scripts && sec.third_party_scripts.length > 0) {
      lines.push(`  - ${sec.third_party_scripts.join(", ")}`)
    }
    if (sec.vulnerabilities && sec.vulnerabilities.length > 0) {
      lines.push(`- **Findings:**`)
      sec.vulnerabilities.forEach((v) => lines.push(`  - ${v}`))
    }
    lines.push(``)
  }

  // Accessibility
  if (report.accessibility) {
    lines.push(`## Accessibility`)
    const acc = report.accessibility
    if (acc.score !== undefined) lines.push(`- **Overall Score:** ${acc.score}`)
    if (acc.findings && acc.findings.length > 0) {
      lines.push(`- **Findings:**`)
      acc.findings.forEach((f) => lines.push(`  - ${f}`))
    }
    lines.push(``)
  }

  // Website Info
  if (report.websiteInfo) {
    lines.push(`## Website Information`)
    const info = report.websiteInfo
    if (info.title) lines.push(`- **Title:** ${info.title}`)
    if (info.description) lines.push(`- **Description:** ${info.description}`)
    if (info.keywords && info.keywords.length > 0) lines.push(`- **Keywords:** ${info.keywords.join(", ")}`)
    if (info.language) lines.push(`- **Language:** ${info.language}`)
    if (info.charset) lines.push(`- **Charset:** ${info.charset}`)
    if (info.author) lines.push(`- **Author:** ${info.author}`)
    if (info.generator) lines.push(`- **Generator:** ${info.generator}`)
    if (info.viewport) lines.push(`- **Viewport:** ${info.viewport}`)
    if (info.robots) lines.push(`- **Robots:** ${info.robots}`)
    lines.push(``)
  }

  // Domain Info
  if (report.domainInfo) {
    lines.push(`## Domain Information`)
    const info = report.domainInfo
    if (info.domain) lines.push(`- **Domain:** ${info.domain}`)
    if (info.ip) lines.push(`- **IP Address:** ${info.ip}`)
    if (info.ipv4 && info.ipv4.length > 0) lines.push(`- **IPv4:** ${info.ipv4.join(", ")}`)
    if (info.ipv6 && info.ipv6.length > 0) lines.push(`- **IPv6:** ${info.ipv6.join(", ")}`)
    if (info.mx && info.mx.length > 0) lines.push(`- **MX Records:** ${info.mx.join(", ")}`)
    if (info.ns && info.ns.length > 0) lines.push(`- **NS Records:** ${info.ns.join(", ")}`)
    if (info.txt && info.txt.length > 0) lines.push(`- **TXT Records:** ${info.txt.join(", ")}`)
    if (info.asn) lines.push(`- **ASN:** ${info.asn}`)
    if (info.asn_name) lines.push(`- **ASN Name:** ${info.asn_name}`)
    if (info.country) lines.push(`- **Country:** ${info.country}`)
    if (info.city) lines.push(`- **City:** ${info.city}`)
    if (info.isp) lines.push(`- **ISP:** ${info.isp}`)
    if (info.organization) lines.push(`- **Organization:** ${info.organization}`)
    lines.push(``)
  }

  // SSL Info
  if (report.sslInfo) {
    lines.push(`## SSL Certificate Information`)
    const info = report.sslInfo
    if (info.issuer) lines.push(`- **Issuer:** ${info.issuer}`)
    if (info.subject) lines.push(`- **Subject:** ${info.subject}`)
    if (info.common_name) lines.push(`- **Common Name:** ${info.common_name}`)
    if (info.valid_from) lines.push(`- **Valid From:** ${info.valid_from}`)
    if (info.valid_to) lines.push(`- **Valid To:** ${info.valid_to}`)
    if (info.is_valid !== undefined) lines.push(`- **Status:** ${info.is_valid ? "✅ Valid" : "❌ Invalid"}`)
    if (info.days_remaining !== undefined) lines.push(`- **Days Remaining:** ${info.days_remaining}`)
    if (info.signature_alg) lines.push(`- **Signature Algorithm:** ${info.signature_alg}`)
    if (info.public_key_alg) lines.push(`- **Public Key Algorithm:** ${info.public_key_alg}`)
    if (info.key_size) lines.push(`- **Key Size:** ${info.key_size} bits`)
    if (info.serial_number) lines.push(`- **Serial Number:** ${info.serial_number}`)
    if (info.organization) lines.push(`- **Organization:** ${info.organization}`)
    if (info.organization_unit) lines.push(`- **Organization Unit:** ${info.organization_unit}`)
    if (info.country) lines.push(`- **Country:** ${info.country}`)
    if (info.locality) lines.push(`- **Locality:** ${info.locality}`)
    if (info.province) lines.push(`- **Province:** ${info.province}`)
    if (info.dns_names && info.dns_names.length > 0) lines.push(`- **DNS Names (SAN):** ${info.dns_names.join(", ")}`)
    lines.push(``)
  }

  // Tech Stack Info
  if (report.techStack) {
    lines.push(`## ${getTranslation(locale, "scan.cardTechStack")}`)
    const stack = report.techStack
    if (stack.server) lines.push(`- **Web Server:** ${stack.server}`)
    if (stack.powered_by) lines.push(`- **Powered By:** ${stack.powered_by}`)
    if (stack.content_type) lines.push(`- **Content Type:** ${stack.content_type}`)
    if (stack.content_length) lines.push(`- **Content Length:** ${(stack.content_length / 1024).toFixed(2)} KB`)
    if (stack.last_modified) lines.push(`- **Last Modified:** ${stack.last_modified}`)
    if (stack.etag) lines.push(`- **ETag:** ${stack.etag}`)
    if (stack.technologies && stack.technologies.length > 0) lines.push(`- **Technologies:** ${stack.technologies.join(", ")}`)
    if (stack.framework && stack.framework.length > 0) lines.push(`- **Frameworks:** ${stack.framework.join(", ")}`)
    if (stack.cms && stack.cms.length > 0) lines.push(`- **CMS:** ${stack.cms.join(", ")}`)
    if (stack.language && stack.language.length > 0) lines.push(`- **Languages:** ${stack.language.join(", ")}`)
    if (stack.javascript_lib && stack.javascript_lib.length > 0) lines.push(`- **JavaScript Libraries:** ${stack.javascript_lib.join(", ")}`)
    if (stack.analytics && stack.analytics.length > 0) lines.push(`- **Analytics:** ${stack.analytics.join(", ")}`)
    if (stack.cdn && stack.cdn.length > 0) lines.push(`- **CDN:** ${stack.cdn.join(", ")}`)
    if (stack.cache && stack.cache.length > 0) lines.push(`- **Cache:** ${stack.cache.join(", ")}`)
    if (stack.database && stack.database.length > 0) lines.push(`- **Database:** ${stack.database.join(", ")}`)
    if (stack.os) lines.push(`- **Operating System:** ${stack.os}`)
    if (stack.security_headers && Object.keys(stack.security_headers).length > 0) {
      lines.push(`- **Security Headers:**`)
      Object.entries(stack.security_headers).forEach(([key, value]) => {
        lines.push(`  - ${key}: ${value}`)
      })
    }
    lines.push(``)
  }

  lines.push(`## Scan Results`)
  lines.push(`| URL | Status | Title | RT(ms) | IP | TLS | CDN |`)
  lines.push(`|---|---|---|---|---|---|---|`)

  report.results.forEach((r) => {
    lines.push(
      `| ${r.url} | ${r.status} | ${r.title || ""} | ${r.response_time || "-"} | ${r.ip || "-"} | ${r.tls ? "✔" : "✖"} | ${r.cdn ? "✔" : "✖"} |`
    )
  })

  const blob = new Blob([lines.join("\n")], {
    type: "text/markdown",
  })

  download(blob, generateFilename("scan-report", "md", report.target))
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  return `"${str.replace(/"/g, '""')}"`
}

export function exportCSV(report: ScanReport, locale: Locale = "zh") {
  const lines: string[] = []
  
  // Summary Section
  lines.push("## Summary")
  lines.push("Field,Value")
  lines.push(`Target,${escapeCSV(report.target)}`)
  lines.push(`Scanned At,${escapeCSV(report.scannedAt)}`)
  lines.push(`Total URLs,${report.summary.total}`)
  lines.push(`Alive,${report.summary.alive}`)
  lines.push(`Dead,${report.summary.dead}`)
  lines.push(`Avg Response (ms),${report.summary.avgResponse}`)
  lines.push("")

  // AI Analysis
  if (report.aiAnalysis) {
    const ai = report.aiAnalysis
    lines.push("## AI Analysis")
    lines.push("Field,Value")
    const summary = cleanSummary(ai.summary)
    if (summary) lines.push(`Summary,${escapeCSV(summary)}`)
    if (ai.risk_level) lines.push(`Risk Level,${escapeCSV(ai.risk_level)}`)
    if (ai.availability_score !== undefined) lines.push(`Availability Score,${ai.availability_score}`)
    if (ai.performance_score !== undefined) lines.push(`Performance Score,${ai.performance_score}`)
    if (ai.security_score !== undefined) lines.push(`Security Score,${ai.security_score}`)
    if (ai.seo_score !== undefined) lines.push(`SEO Score,${ai.seo_score}`)
    if (ai.highlights && ai.highlights.length > 0) {
      lines.push(`Highlights,${escapeCSV(ai.highlights.join("; "))}`)
    }
    if (ai.availability_findings && ai.availability_findings.length > 0) {
      lines.push(`Availability Findings,${escapeCSV(ai.availability_findings.join("; "))}`)
    }
    if (ai.performance_findings && ai.performance_findings.length > 0) {
      lines.push(`Performance Findings,${escapeCSV(ai.performance_findings.join("; "))}`)
    }
    if (ai.security_findings && ai.security_findings.length > 0) {
      lines.push(`Security Findings,${escapeCSV(ai.security_findings.join("; "))}`)
    }
    if (ai.seo_findings && ai.seo_findings.length > 0) {
      lines.push(`SEO Findings,${escapeCSV(ai.seo_findings.join("; "))}`)
    }
    if (ai.recommendations && ai.recommendations.length > 0) {
      lines.push(`Recommendations,${escapeCSV(ai.recommendations.join("; "))}`)
    }
    lines.push("")
  }

  // Website Information
  if (report.websiteInfo) {
    lines.push("## Website Information")
    lines.push("Field,Value")
    const info = report.websiteInfo
    if (info.title) lines.push(`Title,${escapeCSV(info.title)}`)
    if (info.description) lines.push(`Description,${escapeCSV(info.description)}`)
    if (info.keywords && info.keywords.length > 0) lines.push(`Keywords,${escapeCSV(info.keywords.join("; "))}`)
    if (info.language) lines.push(`Language,${escapeCSV(info.language)}`)
    if (info.charset) lines.push(`Charset,${escapeCSV(info.charset)}`)
    if (info.author) lines.push(`Author,${escapeCSV(info.author)}`)
    if (info.generator) lines.push(`Generator,${escapeCSV(info.generator)}`)
    if (info.viewport) lines.push(`Viewport,${escapeCSV(info.viewport)}`)
    if (info.robots) lines.push(`Robots,${escapeCSV(info.robots)}`)
    lines.push("")
  }

  // Domain Information
  if (report.domainInfo) {
    lines.push("## Domain Information")
    lines.push("Field,Value")
    const info = report.domainInfo
    if (info.domain) lines.push(`Domain,${escapeCSV(info.domain)}`)
    if (info.ip) lines.push(`IP Address,${escapeCSV(info.ip)}`)
    if (info.ipv4 && info.ipv4.length > 0) lines.push(`IPv4,${escapeCSV(info.ipv4.join("; "))}`)
    if (info.ipv6 && info.ipv6.length > 0) lines.push(`IPv6,${escapeCSV(info.ipv6.join("; "))}`)
    if (info.mx && info.mx.length > 0) lines.push(`MX Records,${escapeCSV(info.mx.join("; "))}`)
    if (info.ns && info.ns.length > 0) lines.push(`NS Records,${escapeCSV(info.ns.join("; "))}`)
    if (info.txt && info.txt.length > 0) lines.push(`TXT Records,${escapeCSV(info.txt.join("; "))}`)
    if (info.asn) lines.push(`ASN,${escapeCSV(info.asn)}`)
    if (info.asn_name) lines.push(`ASN Name,${escapeCSV(info.asn_name)}`)
    if (info.country) lines.push(`Country,${escapeCSV(info.country)}`)
    if (info.city) lines.push(`City,${escapeCSV(info.city)}`)
    if (info.isp) lines.push(`ISP,${escapeCSV(info.isp)}`)
    if (info.organization) lines.push(`Organization,${escapeCSV(info.organization)}`)
    lines.push("")
  }

  // SSL Certificate Information
  if (report.sslInfo) {
    lines.push("## SSL Certificate Information")
    lines.push("Field,Value")
    const info = report.sslInfo
    if (info.issuer) lines.push(`Issuer,${escapeCSV(info.issuer)}`)
    if (info.subject) lines.push(`Subject,${escapeCSV(info.subject)}`)
    if (info.common_name) lines.push(`Common Name,${escapeCSV(info.common_name)}`)
    if (info.valid_from) lines.push(`Valid From,${escapeCSV(info.valid_from)}`)
    if (info.valid_to) lines.push(`Valid To,${escapeCSV(info.valid_to)}`)
    if (info.is_valid !== undefined) lines.push(`Status,${info.is_valid ? "Valid" : "Invalid"}`)
    if (info.days_remaining !== undefined) lines.push(`Days Remaining,${info.days_remaining}`)
    if (info.signature_alg) lines.push(`Signature Algorithm,${escapeCSV(info.signature_alg)}`)
    if (info.public_key_alg) lines.push(`Public Key Algorithm,${escapeCSV(info.public_key_alg)}`)
    if (info.key_size) lines.push(`Key Size (bits),${info.key_size}`)
    if (info.serial_number) lines.push(`Serial Number,${escapeCSV(info.serial_number)}`)
    if (info.organization) lines.push(`Organization,${escapeCSV(info.organization)}`)
    if (info.organization_unit) lines.push(`Organization Unit,${escapeCSV(info.organization_unit)}`)
    if (info.country) lines.push(`Country,${escapeCSV(info.country)}`)
    if (info.locality) lines.push(`Locality,${escapeCSV(info.locality)}`)
    if (info.province) lines.push(`Province,${escapeCSV(info.province)}`)
    if (info.dns_names && info.dns_names.length > 0) lines.push(`DNS Names (SAN),${escapeCSV(info.dns_names.join("; "))}`)
    lines.push("")
  }

  // Technology Stack
  if (report.techStack) {
    lines.push(`## ${getTranslation(locale, "scan.cardTechStack")}`)
    lines.push("Field,Value")
    const stack = report.techStack
    if (stack.server) lines.push(`Web Server,${escapeCSV(stack.server)}`)
    if (stack.powered_by) lines.push(`Powered By,${escapeCSV(stack.powered_by)}`)
    if (stack.content_type) lines.push(`Content Type,${escapeCSV(stack.content_type)}`)
    if (stack.content_length) lines.push(`Content Length (KB),${(stack.content_length / 1024).toFixed(2)}`)
    if (stack.last_modified) lines.push(`Last Modified,${escapeCSV(stack.last_modified)}`)
    if (stack.etag) lines.push(`ETag,${escapeCSV(stack.etag)}`)
    if (stack.technologies && stack.technologies.length > 0) lines.push(`Technologies,${escapeCSV(stack.technologies.join("; "))}`)
    if (stack.framework && stack.framework.length > 0) lines.push(`Frameworks,${escapeCSV(stack.framework.join("; "))}`)
    if (stack.cms && stack.cms.length > 0) lines.push(`CMS,${escapeCSV(stack.cms.join("; "))}`)
    if (stack.language && stack.language.length > 0) lines.push(`Languages,${escapeCSV(stack.language.join("; "))}`)
    if (stack.javascript_lib && stack.javascript_lib.length > 0) lines.push(`JavaScript Libraries,${escapeCSV(stack.javascript_lib.join("; "))}`)
    if (stack.analytics && stack.analytics.length > 0) lines.push(`Analytics,${escapeCSV(stack.analytics.join("; "))}`)
    if (stack.cdn && stack.cdn.length > 0) lines.push(`CDN,${escapeCSV(stack.cdn.join("; "))}`)
    if (stack.cache && stack.cache.length > 0) lines.push(`Cache,${escapeCSV(stack.cache.join("; "))}`)
    if (stack.database && stack.database.length > 0) lines.push(`Database,${escapeCSV(stack.database.join("; "))}`)
    if (stack.os) lines.push(`Operating System,${escapeCSV(stack.os)}`)
    if (stack.security_headers && Object.keys(stack.security_headers).length > 0) {
      Object.entries(stack.security_headers).forEach(([key, value]) => {
        lines.push(`Security Header: ${key},${escapeCSV(value)}`)
      })
    }
    lines.push("")
  }

  // Scan Results
  lines.push("## Scan Results")
  const header = ["URL", "Status", "Title", "ResponseTime", "IP", "TLS", "CDN"]
  lines.push(header.join(","))

  report.results.forEach((r) => {
    const row = [
      escapeCSV(r.url),
      r.status.toString(),
      escapeCSV(r.title || ""),
      (r.response_time || 0).toString(),
      escapeCSV(r.ip || ""),
      r.tls ? "true" : "false",
      r.cdn ? "true" : "false",
    ]
    lines.push(row.join(","))
  })

  const csv = lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  download(blob, generateFilename("scan-report", "csv", report.target))
}

export function exportExcel(report: ScanReport, locale: Locale = "zh") {
  const workbook = XLSX.utils.book_new()

  // Helper function to create a sheet with key-value pairs and styling
  function createInfoSheet(name: string, data: Array<[string, string]>) {
    const wsData: any[][] = []
    
    // Header row with title
    wsData.push([name])
    wsData.push([]) // Empty row
    
    // Column headers
    wsData.push(["项目", "内容"])
    
    // Data rows
    data.forEach(([key, value]) => {
      wsData.push([key, value])
    })
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Key column
      { wch: 60 }  // Value column (increased for better display)
    ]
    
    return ws
  }

  // Summary Sheet (放在最前面)
  const summaryData: Array<[string, string]> = [
    ["目标URL", report.target],
    ["扫描时间", report.scannedAt],
    ["总URL数", report.summary.total.toString()],
    ["可用数量", report.summary.alive.toString()],
    ["不可用数量", report.summary.dead.toString()],
    ["平均响应时间 (ms)", report.summary.avgResponse.toString()],
  ]

  if (report.aiAnalysis) {
    const ai = report.aiAnalysis
    const summary = cleanSummary(ai.summary)
    summaryData.push(["AI分析 - 总体结论", summary || ""])
    summaryData.push(["AI分析 - 风险等级", ai.risk_level || ""])
    if (ai.availability_score !== undefined) {
      summaryData.push(["AI分析 - 可用性评分", ai.availability_score.toString()])
    }
    if (ai.performance_score !== undefined) {
      summaryData.push(["AI分析 - 性能评分", ai.performance_score.toString()])
    }
    if (ai.security_score !== undefined) {
      summaryData.push(["AI分析 - 安全评分", ai.security_score.toString()])
    }
    if (ai.seo_score !== undefined) {
      summaryData.push(["AI分析 - SEO评分", ai.seo_score.toString()])
    }
    if (ai.highlights && ai.highlights.length > 0) {
      summaryData.push(["AI分析 - 关键发现", ai.highlights.join("; ")])
    }
    if (ai.recommendations && ai.recommendations.length > 0) {
      summaryData.push(["AI分析 - 优化建议", ai.recommendations.join("; ")])
    }
  }
  const summarySheet = createInfoSheet("扫描摘要", summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "摘要")

  // Website Information Sheet (信息卡片数据)
  if (report.websiteInfo) {
    const info = report.websiteInfo
    const websiteData: Array<[string, string]> = []
    if (info.title) websiteData.push(["标题", info.title])
    if (info.description) websiteData.push(["描述", info.description])
    if (info.keywords && info.keywords.length > 0) websiteData.push(["关键词", info.keywords.join("; ")])
    if (info.language) websiteData.push(["语言", info.language])
    if (info.charset) websiteData.push(["字符集", info.charset])
    if (info.author) websiteData.push(["作者", info.author])
    if (info.generator) websiteData.push(["生成器", info.generator])
    if (info.viewport) websiteData.push(["视口", info.viewport])
    if (info.robots) websiteData.push(["机器人", info.robots])
    
    if (websiteData.length > 0) {
      const websiteSheet = createInfoSheet("网站信息", websiteData)
      XLSX.utils.book_append_sheet(workbook, websiteSheet, "网站信息")
    }
  }

  // Domain Information Sheet (信息卡片数据)
  if (report.domainInfo) {
    const info = report.domainInfo
    const domainData: Array<[string, string]> = []
    if (info.domain) domainData.push(["域名", info.domain])
    if (info.ip) domainData.push(["IP地址", info.ip])
    if (info.ipv4 && info.ipv4.length > 0) domainData.push(["IPv4", info.ipv4.join("; ")])
    if (info.ipv6 && info.ipv6.length > 0) domainData.push(["IPv6", info.ipv6.join("; ")])
    if (info.mx && info.mx.length > 0) domainData.push(["MX记录", info.mx.join("; ")])
    if (info.ns && info.ns.length > 0) domainData.push(["NS记录", info.ns.join("; ")])
    if (info.txt && info.txt.length > 0) domainData.push(["TXT记录", info.txt.join("; ")])
    if (info.asn) domainData.push(["ASN", info.asn])
    if (info.asn_name) domainData.push(["ASN名称", info.asn_name])
    if (info.country) domainData.push(["国家", info.country])
    if (info.city) domainData.push(["城市", info.city])
    if (info.isp) domainData.push(["ISP", info.isp])
    if (info.organization) domainData.push(["组织", info.organization])
    
    if (domainData.length > 0) {
      const domainSheet = createInfoSheet("域名信息", domainData)
      XLSX.utils.book_append_sheet(workbook, domainSheet, "域名信息")
    }
  }

  // SSL Certificate Information Sheet (信息卡片数据)
  if (report.sslInfo) {
    const info = report.sslInfo
    const sslData: Array<[string, string]> = []
    if (info.issuer) sslData.push(["颁发者", info.issuer])
    if (info.subject) sslData.push(["主题", info.subject])
    if (info.common_name) sslData.push(["通用名称", info.common_name])
    if (info.valid_from) sslData.push(["有效期开始", info.valid_from])
    if (info.valid_to) sslData.push(["有效期结束", info.valid_to])
    if (info.is_valid !== undefined) sslData.push(["证书状态", info.is_valid ? "有效" : "无效"])
    if (info.days_remaining !== undefined) sslData.push(["剩余天数", info.days_remaining.toString()])
    if (info.signature_alg) sslData.push(["签名算法", info.signature_alg])
    if (info.public_key_alg) sslData.push(["公钥算法", info.public_key_alg])
    if (info.key_size) sslData.push(["密钥长度 (bits)", info.key_size.toString()])
    if (info.serial_number) sslData.push(["序列号", info.serial_number])
    if (info.organization) sslData.push(["组织", info.organization])
    if (info.organization_unit) sslData.push(["组织单位", info.organization_unit])
    if (info.country) sslData.push(["国家", info.country])
    if (info.locality) sslData.push(["地区", info.locality])
    if (info.province) sslData.push(["省份", info.province])
    if (info.dns_names && info.dns_names.length > 0) sslData.push(["DNS名称 (SAN)", info.dns_names.join("; ")])
    
    if (sslData.length > 0) {
      const sslSheet = createInfoSheet("SSL证书信息", sslData)
      XLSX.utils.book_append_sheet(workbook, sslSheet, "SSL证书")
    }
  }

  // Technology Stack Sheet (信息卡片数据)
  if (report.techStack) {
    const stack = report.techStack
    const techData: Array<[string, string]> = []
    if (stack.server) techData.push(["Web服务器", stack.server])
    if (stack.powered_by) techData.push(["Powered By", stack.powered_by])
    if (stack.content_type) techData.push(["内容类型", stack.content_type])
    if (stack.content_length) techData.push(["内容长度 (KB)", (stack.content_length / 1024).toFixed(2)])
    if (stack.last_modified) techData.push(["最后修改", stack.last_modified])
    if (stack.etag) techData.push(["ETag", stack.etag])
    if (stack.technologies && stack.technologies.length > 0) techData.push(["检测到的技术", stack.technologies.join("; ")])
    if (stack.framework && stack.framework.length > 0) techData.push(["框架", stack.framework.join("; ")])
    if (stack.cms && stack.cms.length > 0) techData.push(["CMS系统", stack.cms.join("; ")])
    if (stack.language && stack.language.length > 0) techData.push(["编程语言", stack.language.join("; ")])
    if (stack.javascript_lib && stack.javascript_lib.length > 0) techData.push(["JavaScript库", stack.javascript_lib.join("; ")])
    if (stack.analytics && stack.analytics.length > 0) techData.push(["分析工具", stack.analytics.join("; ")])
    if (stack.cdn && stack.cdn.length > 0) techData.push(["CDN服务", stack.cdn.join("; ")])
    if (stack.cache && stack.cache.length > 0) techData.push(["缓存技术", stack.cache.join("; ")])
    if (stack.database && stack.database.length > 0) techData.push(["数据库", stack.database.join("; ")])
    if (stack.os) techData.push(["操作系统", stack.os])
    if (stack.security_headers && Object.keys(stack.security_headers).length > 0) {
      Object.entries(stack.security_headers).forEach(([key, value]) => {
        techData.push([`安全响应头: ${key}`, value])
      })
    }
    
    if (techData.length > 0) {
      const techSheet = createInfoSheet(getTranslation(locale, "scan.cardTechStack"), techData)
      XLSX.utils.book_append_sheet(workbook, techSheet, getTranslation(locale, "scan.moduleNameTechStack"))
    }
  }

  // Scan Results Sheet (页面链接检查) - 放在最后
  const resultsData: any[][] = []
  const header = ["URL", "状态码", "标题", "响应时间 (ms)", "IP地址", "TLS", "CDN"]
  resultsData.push(header)
  
  report.results.forEach((r) => {
    resultsData.push([
      r.url,
      r.status,
      r.title || "",
      r.response_time || 0,
      r.ip || "",
      r.tls ? "Yes" : "No",
      r.cdn ? "Yes" : "No",
    ])
  })
  
  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData)
  
  // Set column widths for results sheet (优化列宽)
  resultsSheet['!cols'] = [
    { wch: 55 }, // URL (increased)
    { wch: 12 }, // Status (increased)
    { wch: 45 }, // Title (increased)
    { wch: 18 }, // ResponseTime (increased)
    { wch: 18 }, // IP (slightly decreased)
    { wch: 8 },  // TLS
    { wch: 8 },  // CDN
  ]
  
  // 将页面链接检查放在最后
  XLSX.utils.book_append_sheet(workbook, resultsSheet, "页面链接检查")

  // Write file
  try {
    XLSX.writeFile(workbook, generateFilename("scan-report", "xlsx", report.target))
  } catch (error) {
    console.error("[Export] Excel export failed:", error)
    throw new Error("Excel导出失败")
  }
}

// 清理 summary 文本
function cleanSummary(summary: string | undefined): string {
  if (!summary) return ""
  let cleaned = summary
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1])
      cleaned = parsed.summary || cleaned
    } catch {
      // 解析失败，使用原始内容
    }
  } else if (cleaned.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(cleaned)
      cleaned = parsed.summary || cleaned
    } catch {
      // 解析失败，使用原始内容
    }
  }
  return cleaned
}

// 创建信息行的辅助函数
function createInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ text: value })],
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
    ],
  })
}

// 导出 WORD 文档
export async function exportWord(report: ScanReport, locale: Locale = "zh") {
  const children: (Paragraph | Table)[] = []

  // 标题
  children.push(
    new Paragraph({
      text: "网站扫描报告",
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  )

  // 基本信息
  children.push(
    new Paragraph({
      text: "基本信息",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  )

  const basicInfoRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "目标URL", bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ text: report.target })],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "扫描时间", bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: report.scannedAt })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "总URL数", bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: report.summary.total.toString() })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "可用数量", bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: report.summary.alive.toString() })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "不可用数量", bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: report.summary.dead.toString() })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "平均响应时间", bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: `${report.summary.avgResponse} ms` })],
        }),
      ],
    }),
  ]

  children.push(
    new Table({
      rows: basicInfoRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  )

  // 网站信息
  if (report.websiteInfo) {
    children.push(
      new Paragraph({
        text: "网站信息",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const info = report.websiteInfo
    const websiteRows: TableRow[] = []
    if (info.title) websiteRows.push(createInfoRow("标题", info.title))
    if (info.description) websiteRows.push(createInfoRow("描述", info.description))
    if (info.keywords && info.keywords.length > 0) websiteRows.push(createInfoRow("关键词", info.keywords.join(", ")))
    if (info.language) websiteRows.push(createInfoRow("语言", info.language))
    if (info.charset) websiteRows.push(createInfoRow("字符集", info.charset))
    if (info.author) websiteRows.push(createInfoRow("作者", info.author))
    if (info.generator) websiteRows.push(createInfoRow("生成器", info.generator))
    if (info.viewport) websiteRows.push(createInfoRow("视口", info.viewport))
    if (info.robots) websiteRows.push(createInfoRow("机器人", info.robots))

    if (websiteRows.length > 0) {
      children.push(
        new Table({
          rows: websiteRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )
    }
  }

  // 域名信息
  if (report.domainInfo) {
    children.push(
      new Paragraph({
        text: "域名信息",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const info = report.domainInfo
    const domainRows: TableRow[] = []
    if (info.domain) domainRows.push(createInfoRow("域名", info.domain))
    if (info.ip) domainRows.push(createInfoRow("IP地址", info.ip))
    if (info.ipv4 && info.ipv4.length > 0) domainRows.push(createInfoRow("IPv4", info.ipv4.join(", ")))
    if (info.ipv6 && info.ipv6.length > 0) domainRows.push(createInfoRow("IPv6", info.ipv6.join(", ")))
    if (info.mx && info.mx.length > 0) domainRows.push(createInfoRow("MX记录", info.mx.join(", ")))
    if (info.ns && info.ns.length > 0) domainRows.push(createInfoRow("NS记录", info.ns.join(", ")))
    if (info.txt && info.txt.length > 0) domainRows.push(createInfoRow("TXT记录", info.txt.join(", ")))
    if (info.asn) domainRows.push(createInfoRow("ASN", info.asn))
    if (info.asn_name) domainRows.push(createInfoRow("ASN名称", info.asn_name))
    if (info.country) domainRows.push(createInfoRow("国家", info.country))
    if (info.city) domainRows.push(createInfoRow("城市", info.city))
    if (info.isp) domainRows.push(createInfoRow("ISP", info.isp))
    if (info.organization) domainRows.push(createInfoRow("组织", info.organization))

    if (domainRows.length > 0) {
      children.push(
        new Table({
          rows: domainRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )
    }
  }

  // SSL证书信息
  if (report.sslInfo) {
    children.push(
      new Paragraph({
        text: "SSL证书信息",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const info = report.sslInfo
    const sslRows: TableRow[] = []
    if (info.issuer) sslRows.push(createInfoRow("颁发者", info.issuer))
    if (info.subject) sslRows.push(createInfoRow("主题", info.subject))
    if (info.common_name) sslRows.push(createInfoRow("通用名称", info.common_name))
    if (info.valid_from) sslRows.push(createInfoRow("有效期开始", info.valid_from))
    if (info.valid_to) sslRows.push(createInfoRow("有效期结束", info.valid_to))
    if (info.is_valid !== undefined) sslRows.push(createInfoRow("证书状态", info.is_valid ? "有效" : "无效"))
    if (info.days_remaining !== undefined) sslRows.push(createInfoRow("剩余天数", info.days_remaining.toString()))
    if (info.signature_alg) sslRows.push(createInfoRow("签名算法", info.signature_alg))
    if (info.public_key_alg) sslRows.push(createInfoRow("公钥算法", info.public_key_alg))
    if (info.key_size) sslRows.push(createInfoRow("密钥长度", `${info.key_size} bits`))
    if (info.serial_number) sslRows.push(createInfoRow("序列号", info.serial_number))
    if (info.organization) sslRows.push(createInfoRow("组织", info.organization))
    if (info.organization_unit) sslRows.push(createInfoRow("组织单位", info.organization_unit))
    if (info.country) sslRows.push(createInfoRow("国家", info.country))
    if (info.locality) sslRows.push(createInfoRow("地区", info.locality))
    if (info.province) sslRows.push(createInfoRow("省份", info.province))
    if (info.dns_names && info.dns_names.length > 0) sslRows.push(createInfoRow("DNS名称 (SAN)", info.dns_names.join(", ")))

    if (sslRows.length > 0) {
      children.push(
        new Table({
          rows: sslRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )
    }
  }

  // 技术栈信息
  if (report.techStack) {
    children.push(
      new Paragraph({
        text: getTranslation(locale, "scan.cardTechStack"),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const stack = report.techStack
    const techRows: TableRow[] = []
    if (stack.server) techRows.push(createInfoRow("Web服务器", stack.server))
    if (stack.powered_by) techRows.push(createInfoRow("Powered By", stack.powered_by))
    if (stack.content_type) techRows.push(createInfoRow("内容类型", stack.content_type))
    if (stack.content_length) techRows.push(createInfoRow("内容长度", `${(stack.content_length / 1024).toFixed(2)} KB`))
    if (stack.last_modified) techRows.push(createInfoRow("最后修改", stack.last_modified))
    if (stack.etag) techRows.push(createInfoRow("ETag", stack.etag))
    if (stack.technologies && stack.technologies.length > 0) techRows.push(createInfoRow("检测到的技术", stack.technologies.join(", ")))
    if (stack.framework && stack.framework.length > 0) techRows.push(createInfoRow("框架", stack.framework.join(", ")))
    if (stack.cms && stack.cms.length > 0) techRows.push(createInfoRow("CMS系统", stack.cms.join(", ")))
    if (stack.language && stack.language.length > 0) techRows.push(createInfoRow("编程语言", stack.language.join(", ")))
    if (stack.javascript_lib && stack.javascript_lib.length > 0) techRows.push(createInfoRow("JavaScript库", stack.javascript_lib.join(", ")))
    if (stack.analytics && stack.analytics.length > 0) techRows.push(createInfoRow("分析工具", stack.analytics.join(", ")))
    if (stack.cdn && stack.cdn.length > 0) techRows.push(createInfoRow("CDN服务", stack.cdn.join(", ")))
    if (stack.cache && stack.cache.length > 0) techRows.push(createInfoRow("缓存技术", stack.cache.join(", ")))
    if (stack.database && stack.database.length > 0) techRows.push(createInfoRow("数据库", stack.database.join(", ")))
    if (stack.os) techRows.push(createInfoRow("操作系统", stack.os))
    if (stack.security_headers && Object.keys(stack.security_headers).length > 0) {
      Object.entries(stack.security_headers).forEach(([key, value]) => {
        techRows.push(createInfoRow(`安全响应头: ${key}`, value))
      })
    }

    if (techRows.length > 0) {
      children.push(
        new Table({
          rows: techRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )
    }
  }

  // 性能指标 (Lighthouse)
  if (report.performance) {
    children.push(
      new Paragraph({
        text: getTranslation(locale, "scan.performanceTitle"),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const perf = report.performance
    const perfRows: TableRow[] = []
    if (perf.score !== undefined) perfRows.push(createInfoRow("性能得分", perf.score.toString()))
    if (perf.fcp !== undefined) perfRows.push(createInfoRow("FCP", `${perf.fcp.toFixed(2)} ms`))
    if (perf.lcp !== undefined) perfRows.push(createInfoRow("LCP", `${perf.lcp.toFixed(2)} ms`))
    if (perf.cls !== undefined) perfRows.push(createInfoRow("CLS", perf.cls.toFixed(4)))
    if (perf.tbt !== undefined) perfRows.push(createInfoRow("TBT", `${perf.tbt.toFixed(2)} ms`))
    if (perf.speed_index !== undefined) perfRows.push(createInfoRow("Speed Index", `${perf.speed_index.toFixed(2)} ms`))
    if (perf.lcp_element) perfRows.push(createInfoRow("LCP 元素", perf.lcp_element))

    children.push(
      new Table({
        rows: perfRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )
  }

  // SEO 合规性 (Lighthouse)
  if (report.seo) {
    children.push(
      new Paragraph({
        text: "SEO 合规性 (Lighthouse)",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const seo = report.seo
    const seoRows: TableRow[] = []
    if (seo.score !== undefined) seoRows.push(createInfoRow("SEO 得分", seo.score.toString()))
    seoRows.push(createInfoRow("Title 标签", seo.has_title ? "✅" : "❌"))
    seoRows.push(createInfoRow("Meta 描述", seo.has_description ? "✅" : "❌"))
    seoRows.push(createInfoRow("视口设置", seo.has_viewport ? "✅" : "❌"))
    seoRows.push(createInfoRow("Robots.txt", seo.has_robots_txt ? "✅" : "❌"))
    seoRows.push(createInfoRow("Canonical 标签", seo.has_canonical ? "✅" : "❌"))
    seoRows.push(createInfoRow("可索引性", seo.indexable ? "✅" : "❌"))
    if (seo.spa_visibility !== undefined) seoRows.push(createInfoRow("SPA 可见性", `${(seo.spa_visibility * 100).toFixed(0)}%`))

    children.push(
      new Table({
        rows: seoRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )
  }

  // 前端安全风险 (Lighthouse)
  if (report.security) {
    children.push(
      new Paragraph({
        text: "前端安全风险 (Lighthouse)",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const sec = report.security
    const secRows: TableRow[] = [
      createInfoRow("安全得分", sec.score?.toString() ?? ""),
      createInfoRow("第三方脚本数量", sec.script_count?.toString() ?? ""),
    ]
    if (sec.vulnerabilities && sec.vulnerabilities.length > 0) {
      secRows.push(createInfoRow("安全发现", sec.vulnerabilities.join("\n")))
    }

    children.push(
      new Table({
        rows: secRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )
  }

  // 可访问性合规 (Lighthouse)
  if (report.accessibility) {
    children.push(
      new Paragraph({
        text: "可访问性合规 (Lighthouse)",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const acc = report.accessibility
    const accRows: TableRow[] = []
    if (acc.score !== undefined) accRows.push(createInfoRow("可访问性得分", acc.score.toString()))
    if (acc.findings && acc.findings.length > 0) {
      accRows.push(createInfoRow("改进建议", acc.findings.join("\n")))
    }

    children.push(
      new Table({
        rows: accRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )
  }

  // AI 分析报告
  if (report.aiAnalysis) {
    children.push(
      new Paragraph({
        text: "AI 分析报告",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const ai = report.aiAnalysis
    const aiRows: TableRow[] = []

    // 总体结论
    const summary = cleanSummary(ai.summary)
    if (summary) {
      // 如果内容过长，分段处理
      const summaryParts = summary.match(/.{1,500}/g) || [summary]
      summaryParts.forEach((part, index) => {
        aiRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: index === 0 ? "总体结论" : "", bold: true })],
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: part })],
                width: { size: 80, type: WidthType.PERCENTAGE },
              }),
            ],
          })
        )
      })
    }

    // 风险等级
    if (ai.risk_level) {
      aiRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "风险等级", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ text: ai.risk_level })],
            }),
          ],
        })
      )
    }

    // 评分
    const scores: Array<{ label: string; value: number }> = []
    if (ai.availability_score !== undefined && ai.availability_score !== null) {
      scores.push({ label: "可用性评分", value: ai.availability_score })
    }
    if (ai.performance_score !== undefined && ai.performance_score !== null) {
      scores.push({ label: "性能评分", value: ai.performance_score })
    }
    if (ai.security_score !== undefined && ai.security_score !== null) {
      scores.push({ label: "安全评分", value: ai.security_score })
    }
    if (ai.seo_score !== undefined && ai.seo_score !== null) {
      scores.push({ label: "SEO评分", value: ai.seo_score })
    }

    if (scores.length > 0) {
      scores.forEach((score) => {
        aiRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: score.label, bold: true })] })],
              }),
              new TableCell({
                children: [new Paragraph({ text: score.value.toString() })],
              }),
            ],
          })
        )
      })
    }

    // 关键发现、分析结果和建议 - 分片处理
    const processList = (
      title: string,
      items: string[] | undefined
    ) => {
      if (!items || items.length === 0) return
      aiRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })],
              rowSpan: items.length,
            }),
            new TableCell({
              children: [new Paragraph({ text: items[0] })],
            }),
          ],
        })
      )
      for (let i = 1; i < items.length; i++) {
        // 如果内容过长，分段处理
        const item = items[i]
        const parts = item.length > 500 ? item.match(/.{1,500}/g) || [item] : [item]
        parts.forEach((part, partIndex) => {
          aiRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: partIndex === 0 ? part : `  ${part}` })],
                }),
              ],
            })
          )
        })
      }
    }

    processList("关键发现", ai.highlights)
    processList("可用性分析", ai.availability_findings)
    processList("性能分析", ai.performance_findings)
    processList("安全分析", ai.security_findings)
    processList("SEO 分析", ai.seo_findings)
    processList("优化建议", ai.recommendations)

    if (aiRows.length > 0) {
      children.push(
        new Table({
          rows: aiRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )
    }
  }

  // 扫描结果 - 分片处理，每批处理100条
  if (report.results.length > 0) {
    children.push(
      new Paragraph({
        text: "扫描结果",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const batchSize = 100
    for (let i = 0; i < report.results.length; i += batchSize) {
      const batch = report.results.slice(i, i + batchSize)
      const resultRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "URL", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "状态码", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "标题", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "响应时间(ms)", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "IP地址", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "TLS", bold: true })] })],
            }),
          ],
        }),
      ]

      batch.forEach((r) => {
        resultRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: r.url })],
              }),
              new TableCell({
                children: [new Paragraph({ text: r.status.toString() })],
              }),
              new TableCell({
                children: [new Paragraph({ text: r.title || "-" })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: r.response_time ? r.response_time.toString() : "-",
                  }),
                ],
              }),
              new TableCell({
                children: [new Paragraph({ text: r.ip || "-" })],
              }),
              new TableCell({
                children: [new Paragraph({ text: r.tls ? "是" : "否" })],
              }),
            ],
          })
        )
      })

      children.push(
        new Table({
          rows: resultRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )

      // 如果不是最后一批，添加分隔段落
      if (i + batchSize < report.results.length) {
        children.push(
          new Paragraph({
            text: `（继续显示第 ${i + batchSize + 1}-${Math.min(i + batchSize * 2, report.results.length)} 条结果）`,
            spacing: { before: 200, after: 200 },
          })
        )
      }
    }
  }

  // 创建文档
  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  })

  // 生成并下载
  try {
    const blob = await Packer.toBlob(doc)
    download(blob, generateFilename("scan-report", "docx", report.target))
  } catch (error) {
    console.error("[Export] Word export failed:", error)
    throw new Error("Word导出失败，请重试")
  }
}

// 导出 PDF 文档 - 使用html2canvas解决中文乱码问题
export async function exportPDF(report: ScanReport, locale: Locale = "zh") {
  // 创建临时容器
  const container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "-9999px"
  container.style.width = "210mm" // A4 width
  container.style.padding = "20mm"
  container.style.backgroundColor = "#ffffff"
  container.style.color = "#000000"
  container.style.fontFamily = '"Noto Sans SC", "Microsoft YaHei", sans-serif'
  container.style.fontSize = "12px"
  container.style.lineHeight = "1.6"

  // 构建HTML内容
  let html = `
    <div style="margin-bottom: 20px;">
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">网站扫描报告</h1>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">基本信息</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">目标URL</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(report.target)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">扫描时间</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(report.scannedAt)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">总URL数</td><td style="padding: 8px; border: 1px solid #ddd;">${report.summary.total}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">可用数量</td><td style="padding: 8px; border: 1px solid #ddd;">${report.summary.alive}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">不可用数量</td><td style="padding: 8px; border: 1px solid #ddd;">${report.summary.dead}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">平均响应时间</td><td style="padding: 8px; border: 1px solid #ddd;">${report.summary.avgResponse} ms</td></tr>
      </table>
    </div>
  `

  // 性能指标
  if (report.performance) {
    const perf = report.performance
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">${escapeHtml(getTranslation(locale, "scan.performanceTitle"))}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${perf.score !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">性能得分</td><td style="padding: 8px; border: 1px solid #ddd;">${perf.score}</td></tr>` : ""}
        ${perf.fcp !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">FCP</td><td style="padding: 8px; border: 1px solid #ddd;">${perf.fcp.toFixed(2)} ms</td></tr>` : ""}
        ${perf.lcp !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">LCP</td><td style="padding: 8px; border: 1px solid #ddd;">${perf.lcp.toFixed(2)} ms</td></tr>` : ""}
        ${perf.cls !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">CLS</td><td style="padding: 8px; border: 1px solid #ddd;">${perf.cls.toFixed(4)}</td></tr>` : ""}
        ${perf.tbt !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">TBT</td><td style="padding: 8px; border: 1px solid #ddd;">${perf.tbt.toFixed(2)} ms</td></tr>` : ""}
        ${perf.speed_index !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Speed Index</td><td style="padding: 8px; border: 1px solid #ddd;">${perf.speed_index.toFixed(2)} ms</td></tr>` : ""}
        ${perf.lcp_element ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">LCP 元素</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(perf.lcp_element)}</td></tr>` : ""}
      </table>
    </div>`
  }

  // SEO 合规性
  if (report.seo) {
    const seo = report.seo
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">SEO 合规性 (Lighthouse)</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${seo.score !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">SEO 得分</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.score}</td></tr>` : ""}
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Title 标签</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.has_title ? "✅" : "❌"}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Meta 描述</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.has_description ? "✅" : "❌"}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">视口设置</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.has_viewport ? "✅" : "❌"}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Robots.txt</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.has_robots_txt ? "✅" : "❌"}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Canonical 标签</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.has_canonical ? "✅" : "❌"}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">可索引性</td><td style="padding: 8px; border: 1px solid #ddd;">${seo.indexable ? "✅" : "❌"}</td></tr>
        ${seo.spa_visibility !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">SPA 可见性</td><td style="padding: 8px; border: 1px solid #ddd;">${(seo.spa_visibility * 100).toFixed(0)}%</td></tr>` : ""}
      </table>
    </div>`
  }

  // 安全风险
  if (report.security) {
    const sec = report.security
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">前端安全风险 (Lighthouse)</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${sec.score !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">安全得分</td><td style="padding: 8px; border: 1px solid #ddd;">${sec.score}</td></tr>` : ""}
        ${sec.script_count !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">第三方脚本数量</td><td style="padding: 8px; border: 1px solid #ddd;">${sec.script_count}</td></tr>` : ""}
        ${sec.vulnerabilities && sec.vulnerabilities.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">安全发现</td><td style="padding: 8px; border: 1px solid #ddd;">
          <ul style="margin: 0; padding-left: 20px;">
            ${sec.vulnerabilities.map(v => `<li>${escapeHtml(v)}</li>`).join("")}
          </ul>
        </td></tr>` : ""}
      </table>
    </div>`
  }

  // 可访问性
  if (report.accessibility) {
    const acc = report.accessibility
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">可访问性合规 (Lighthouse)</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${acc.score !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">可访问性得分</td><td style="padding: 8px; border: 1px solid #ddd;">${acc.score}</td></tr>` : ""}
        ${acc.findings && acc.findings.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">改进建议</td><td style="padding: 8px; border: 1px solid #ddd;">
          <ul style="margin: 0; padding-left: 20px;">
            ${acc.findings.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
          </ul>
        </td></tr>` : ""}
      </table>
    </div>`
  }

  // 网站信息
  if (report.websiteInfo) {
    const info = report.websiteInfo
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">网站信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${info.title ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">标题</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.title)}</td></tr>` : ""}
        ${info.description ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">描述</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.description)}</td></tr>` : ""}
        ${info.keywords && info.keywords.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">关键词</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.keywords.join(", "))}</td></tr>` : ""}
        ${info.language ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">语言</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.language)}</td></tr>` : ""}
        ${info.charset ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">字符集</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.charset)}</td></tr>` : ""}
        ${info.author ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">作者</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.author)}</td></tr>` : ""}
        ${info.generator ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">生成器</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.generator)}</td></tr>` : ""}
        ${info.viewport ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">视口</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.viewport)}</td></tr>` : ""}
        ${info.robots ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">机器人</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.robots)}</td></tr>` : ""}
      </table>
    </div>`
  }

  // 域名信息
  if (report.domainInfo) {
    const info = report.domainInfo
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">域名信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${info.domain ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">域名</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.domain)}</td></tr>` : ""}
        ${info.ip ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">IP地址</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.ip)}</td></tr>` : ""}
        ${info.ipv4 && info.ipv4.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">IPv4</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.ipv4.join(", "))}</td></tr>` : ""}
        ${info.ipv6 && info.ipv6.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">IPv6</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.ipv6.join(", "))}</td></tr>` : ""}
        ${info.mx && info.mx.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">MX记录</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.mx.join(", "))}</td></tr>` : ""}
        ${info.ns && info.ns.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">NS记录</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.ns.join(", "))}</td></tr>` : ""}
        ${info.txt && info.txt.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">TXT记录</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.txt.join(", "))}</td></tr>` : ""}
        ${info.asn ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ASN</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.asn)}</td></tr>` : ""}
        ${info.asn_name ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ASN名称</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.asn_name)}</td></tr>` : ""}
        ${info.country ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">国家</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.country)}</td></tr>` : ""}
        ${info.city ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">城市</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.city)}</td></tr>` : ""}
        ${info.isp ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ISP</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.isp)}</td></tr>` : ""}
        ${info.organization ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">组织</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.organization)}</td></tr>` : ""}
      </table>
    </div>`
  }

  // SSL证书信息
  if (report.sslInfo) {
    const info = report.sslInfo
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">SSL证书信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${info.issuer ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">颁发者</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.issuer)}</td></tr>` : ""}
        ${info.subject ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">主题</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.subject)}</td></tr>` : ""}
        ${info.common_name ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">通用名称</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.common_name)}</td></tr>` : ""}
        ${info.valid_from ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">有效期开始</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.valid_from)}</td></tr>` : ""}
        ${info.valid_to ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">有效期结束</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.valid_to)}</td></tr>` : ""}
        ${info.is_valid !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">证书状态</td><td style="padding: 8px; border: 1px solid #ddd;">${info.is_valid ? "有效" : "无效"}</td></tr>` : ""}
        ${info.days_remaining !== undefined ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">剩余天数</td><td style="padding: 8px; border: 1px solid #ddd;">${info.days_remaining}</td></tr>` : ""}
        ${info.signature_alg ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">签名算法</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.signature_alg)}</td></tr>` : ""}
        ${info.public_key_alg ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">公钥算法</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.public_key_alg)}</td></tr>` : ""}
        ${info.key_size ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">密钥长度</td><td style="padding: 8px; border: 1px solid #ddd;">${info.key_size} bits</td></tr>` : ""}
        ${info.serial_number ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">序列号</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.serial_number)}</td></tr>` : ""}
        ${info.organization ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">组织</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.organization)}</td></tr>` : ""}
        ${info.organization_unit ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">组织单位</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.organization_unit)}</td></tr>` : ""}
        ${info.country ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">国家</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.country)}</td></tr>` : ""}
        ${info.locality ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">地区</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.locality)}</td></tr>` : ""}
        ${info.province ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">省份</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.province)}</td></tr>` : ""}
        ${info.dns_names && info.dns_names.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">DNS名称 (SAN)</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(info.dns_names.join(", "))}</td></tr>` : ""}
      </table>
    </div>`
  }

  // 技术栈信息
  if (report.techStack) {
    const stack = report.techStack
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">${escapeHtml(getTranslation(locale, "scan.cardTechStack"))}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${stack.server ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Web服务器</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.server)}</td></tr>` : ""}
        ${stack.powered_by ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Powered By</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.powered_by)}</td></tr>` : ""}
        ${stack.content_type ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">内容类型</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.content_type)}</td></tr>` : ""}
        ${stack.content_length ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">内容长度</td><td style="padding: 8px; border: 1px solid #ddd;">${(stack.content_length / 1024).toFixed(2)} KB</td></tr>` : ""}
        ${stack.last_modified ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">最后修改</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.last_modified)}</td></tr>` : ""}
        ${stack.etag ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ETag</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.etag)}</td></tr>` : ""}
        ${stack.technologies && stack.technologies.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">检测到的技术</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.technologies.join(", "))}</td></tr>` : ""}
        ${stack.framework && stack.framework.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">框架</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.framework.join(", "))}</td></tr>` : ""}
        ${stack.cms && stack.cms.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">CMS系统</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.cms.join(", "))}</td></tr>` : ""}
        ${stack.language && stack.language.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">编程语言</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.language.join(", "))}</td></tr>` : ""}
        ${stack.javascript_lib && stack.javascript_lib.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">JavaScript库</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.javascript_lib.join(", "))}</td></tr>` : ""}
        ${stack.analytics && stack.analytics.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">分析工具</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.analytics.join(", "))}</td></tr>` : ""}
        ${stack.cdn && stack.cdn.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">CDN服务</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.cdn.join(", "))}</td></tr>` : ""}
        ${stack.cache && stack.cache.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">缓存技术</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.cache.join(", "))}</td></tr>` : ""}
        ${stack.database && stack.database.length > 0 ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">数据库</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.database.join(", "))}</td></tr>` : ""}
        ${stack.os ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">操作系统</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(stack.os)}</td></tr>` : ""}
      </table>
    </div>`
  }

  // AI 分析报告
  if (report.aiAnalysis) {
    const ai = report.aiAnalysis
    const summary = cleanSummary(ai.summary)
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">AI 分析报告</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${summary ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">总体结论</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(summary)}</td></tr>` : ""}
        ${ai.risk_level ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">风险等级</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(ai.risk_level)}</td></tr>` : ""}
        ${ai.availability_score !== undefined && ai.availability_score !== null ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">可用性评分</td><td style="padding: 8px; border: 1px solid #ddd;">${ai.availability_score}</td></tr>` : ""}
        ${ai.performance_score !== undefined && ai.performance_score !== null ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">性能评分</td><td style="padding: 8px; border: 1px solid #ddd;">${ai.performance_score}</td></tr>` : ""}
        ${ai.security_score !== undefined && ai.security_score !== null ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">安全评分</td><td style="padding: 8px; border: 1px solid #ddd;">${ai.security_score}</td></tr>` : ""}
        ${ai.seo_score !== undefined && ai.seo_score !== null ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">SEO评分</td><td style="padding: 8px; border: 1px solid #ddd;">${ai.seo_score}</td></tr>` : ""}
      </table>
    </div>`

    // AI分析详细内容
    const addAISection = (title: string, items: string[] | undefined) => {
      if (!items || items.length === 0) return ""
      return `<div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">${title}</h3>
        <ul style="margin-left: 20px; padding-left: 0;">
          ${items.map(item => `<li style="margin-bottom: 5px;">${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>`
    }

    html += `<div style="margin-bottom: 30px;">`
    html += addAISection("关键发现", ai.highlights)
    html += addAISection("可用性分析", ai.availability_findings)
    html += addAISection("性能分析", ai.performance_findings)
    html += addAISection("安全分析", ai.security_findings)
    html += addAISection("SEO 分析", ai.seo_findings)
    html += addAISection("优化建议", ai.recommendations)
    html += `</div>`
  }

  // 扫描结果
  if (report.results.length > 0) {
    html += `<div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">扫描结果</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">URL</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">状态</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">标题</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">响应时间(ms)</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">IP</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">TLS</th>
          </tr>
        </thead>
        <tbody>
          ${report.results.slice(0, 100).map(r => `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(r.url.length > 50 ? r.url.substring(0, 47) + "..." : r.url)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${r.status}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml((r.title || "-").length > 30 ? (r.title || "-").substring(0, 27) + "..." : (r.title || "-"))}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${r.response_time || "-"}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${escapeHtml(r.ip || "-")}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${r.tls ? "是" : "否"}</td>
            </tr>
          `).join("")}
          ${report.results.length > 100 ? `<tr><td colspan="6" style="padding: 8px; text-align: center; color: #666;">（仅显示前100条结果，共${report.results.length}条）</td></tr>` : ""}
        </tbody>
      </table>
    </div>`
  }

  container.innerHTML = html
  document.body.appendChild(container)

  try {
    // 使用html2canvas转换为图片
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: false,
      removeContainer: false,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    })

    const imgData = canvas.toDataURL("image/png")
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    const doc = new jsPDF("p", "mm", "a4")
    let position = 0

    doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      doc.addPage()
      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    doc.save(generateFilename("scan-report", "pdf", report.target))
  } catch (error) {
    console.error("[Export] PDF export failed:", error)
    throw new Error("PDF导出失败，请重试")
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  }
}

// HTML转义函数
function escapeHtml(text: string | undefined | null): string {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

