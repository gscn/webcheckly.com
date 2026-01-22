export interface ScanResult {
  url: string
  status: number
  title: string
  response_time: number
  ip: string
  tls: boolean
  cdn: boolean
}

export interface Progress {
  current: number
  total: number
}

export type ScanState = "idle" | "running" | "done" | "error"

export interface ScanOptions {
  linkHealthCheck: boolean
  websiteInfo: boolean
  domainInfo: boolean
  sslInfo: boolean
  techStack: boolean
  aiAnalysis: boolean
  performance: boolean
  seo: boolean
  security: boolean
  accessibility: boolean
  deepScan: boolean
}

export interface WebsiteInfo {
  title?: string
  description?: string
  keywords?: string[]
  language?: string
  charset?: string
  author?: string
  generator?: string
  viewport?: string
  robots?: string
}

export interface DomainInfo {
  domain?: string
  ip?: string
  ipv4?: string[]
  ipv6?: string[]
  mx?: string[]
  ns?: string[]
  txt?: string[]
  asn?: string
  asn_name?: string
  country?: string
  city?: string
  isp?: string
  organization?: string
}

export interface SSLInfo {
  issuer?: string
  subject?: string
  valid_from?: string
  valid_to?: string
  is_valid?: boolean
  days_remaining?: number
  signature_alg?: string
  public_key_alg?: string
  key_size?: number
  serial_number?: string
  dns_names?: string[]
  common_name?: string
  organization?: string
  organization_unit?: string
  country?: string
  locality?: string
  province?: string
}

export interface TechStack {
  // 服务器信息（从ServerInfo整合）
  server?: string
  powered_by?: string
  content_type?: string
  content_length?: number
  last_modified?: string
  etag?: string
  security_headers?: Record<string, string>
  
  // 技术栈检测
  technologies?: string[] // httpx检测到的技术栈
  framework?: string[]
  cms?: string[]
  language?: string[]
  javascript_lib?: string[]
  analytics?: string[]
  cdn?: string[]
  cache?: string[]
  database?: string[]
  os?: string
  meta_tags?: Record<string, string> // 技术相关元标签（已排除网站信息中的标准标签）
}

export interface AIAnalysis {
  summary?: string
  risk_level?: string
  availability_score?: number
  performance_score?: number
  security_score?: number
  seo_score?: number
  highlights?: string[]
  availability_findings?: string[]
  performance_findings?: string[]
  security_findings?: string[]
  seo_findings?: string[]
  recommendations?: string[]
}

export interface PerformanceMetrics {
  score?: number
  fcp?: number
  lcp?: number
  cls?: number
  tbt?: number
  speed_index?: number
  fcp_score?: number
  lcp_score?: number
  cls_score?: number
  tbt_score?: number
  speed_index_score?: number
  lcp_element?: string
}

export interface SEOCompliance {
  score?: number
  has_title?: boolean
  has_description?: boolean
  has_viewport?: boolean
  has_robots_txt?: boolean
  has_canonical?: boolean
  indexable?: boolean
  spa_visibility?: number
}

export interface SecurityRisk {
  score?: number
  third_party_scripts?: string[]
  script_count?: number
  security_headers?: Record<string, string>
  vulnerabilities?: string[]
}

export interface AccessibilityInfo {
  score?: number
  findings?: string[]
}

// 全站链接检查结果类型
export interface KatanaResult {
  url: string
  source?: string
  method?: string
  status: number
  title?: string
  type?: string
  length?: number
  response?: string
}

export interface TestSSLResult {
  host: string
  port: number
  protocols?: string[]
  ciphers?: string[]
  vulnerabilities?: string[]
  certificate_info?: SSLInfo
  grade?: string
  recommendations?: string[]
  protocol_details?: Record<string, string>
  cipher_details?: Record<string, string>
  hsts?: boolean
  hpkp?: boolean
  ocsp?: boolean
  certificate_chain?: string[]
}

export interface WhatWebResult {
  target: string
  status: number
  title?: string
  technologies?: Record<string, string>
  plugins?: string[]
  server?: string
  powered_by?: string
  framework?: string[]
  cms?: string[]
  language?: string[]
  javascript?: string[]
  database?: string[]
  os?: string
  cdn?: string[]
  analytics?: string[]
}

// 更新TaskResults接口以包含新工具结果
export interface TaskResults {
  link_health?: ScanResult[]
  website_info?: WebsiteInfo
  domain_info?: DomainInfo
  ssl_info?: SSLInfo
  tech_stack?: TechStack
  performance?: PerformanceMetrics
  seo_compliance?: SEOCompliance
  security_risk?: SecurityRisk
  accessibility?: AccessibilityInfo
  ai_analysis?: AIAnalysis
  katana_results?: KatanaResult[]
  testssl_results?: TestSSLResult
  whatweb_results?: WhatWebResult
  summary?: {
    total: number
    alive: number
    dead: number
    avg_response: number
    timeout: boolean
  }
}

