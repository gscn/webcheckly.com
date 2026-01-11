import { ScanResult, WebsiteInfo, DomainInfo, SSLInfo, TechStack, AIAnalysis, PerformanceMetrics, SEOCompliance, SecurityRisk, AccessibilityInfo } from "@/types/scan"

export interface ScanReport {
  target: string
  scannedAt: string
  summary: {
    total: number
    alive: number
    dead: number
    avgResponse: number
  }
  results: ScanResult[]
  websiteInfo?: WebsiteInfo | null
  domainInfo?: DomainInfo | null
  sslInfo?: SSLInfo | null
  techStack?: TechStack | null
  aiAnalysis?: AIAnalysis | null
  performance?: PerformanceMetrics | null
  seo?: SEOCompliance | null
  security?: SecurityRisk | null
  accessibility?: AccessibilityInfo | null
}

export function buildReport(
  target: string,
  results: ScanResult[],
  websiteInfo?: WebsiteInfo | null,
  domainInfo?: DomainInfo | null,
  sslInfo?: SSLInfo | null,
  techStack?: TechStack | null,
  aiAnalysis?: AIAnalysis | null,
  performance?: PerformanceMetrics | null,
  seo?: SEOCompliance | null,
  security?: SecurityRisk | null,
  accessibility?: AccessibilityInfo | null
): ScanReport {
  const total = results.length
  const alive = results.filter((r) => r.status > 0 && r.status < 400).length
  const avg =
    Math.round(
      results.reduce((s, r) => s + (r.response_time || 0), 0) / total
    ) || 0

  return {
    target,
    scannedAt: new Date().toISOString(),
    summary: {
      total,
      alive,
      dead: total - alive,
      avgResponse: avg,
    },
    results,
    websiteInfo: websiteInfo || null,
    domainInfo: domainInfo || null,
    sslInfo: sslInfo || null,
    techStack: techStack || null,
    aiAnalysis: aiAnalysis || null,
    performance: performance || null,
    seo: seo || null,
    security: security || null,
    accessibility: accessibility || null,
  }
}

