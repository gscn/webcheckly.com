"use client"

import { TestSSLResult } from "@/types/scan"
import { useLanguage } from "@/contexts/LanguageContext"

interface TestSSLResultsProps {
  result: TestSSLResult | undefined
}

export default function TestSSLResults({ result }: TestSSLResultsProps) {
  const { t } = useLanguage()

  if (!result) {
    return (
      <div className="border border-tech-border/20 rounded-lg p-6 bg-tech-bg/50">
        <h2 className="text-lg font-bold text-white mb-2">{t("deepScan.results.testssl.title")}</h2>
        <p className="text-gray-400 text-sm">{t("common.loading")}</p>
      </div>
    )
  }

  const getGradeColor = (grade: string | undefined) => {
    if (!grade) return "text-gray-400"
    if (grade.includes("A+") || grade.includes("A")) return "text-green-400"
    if (grade.includes("B")) return "text-yellow-400"
    if (grade.includes("C")) return "text-orange-400"
    return "text-red-400"
  }

  const getVulnerabilitySeverity = (vuln: string) => {
    const vulnLower = vuln.toLowerCase()
    if (vulnLower.includes("critical") || vulnLower.includes("heartbleed") || vulnLower.includes("poodle")) {
      return "critical"
    }
    if (vulnLower.includes("high") || vulnLower.includes("medium")) {
      return "high"
    }
    return "medium"
  }

  return (
    <div className="border border-tech-border/20 rounded-lg p-6 bg-tech-bg/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">{t("deepScan.results.testssl.title")}</h2>
        {result.grade && (
          <div className={`text-2xl font-bold ${getGradeColor(result.grade)}`}>
            {result.grade}
          </div>
        )}
      </div>

      {/* 协议支持 */}
      {result.protocols && result.protocols.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">{t("deepScan.results.testssl.protocols")}</h3>
          <div className="flex flex-wrap gap-2">
            {result.protocols.map((protocol, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  protocol.includes("1.3") || protocol.includes("1.2")
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}
              >
                {protocol}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 漏洞列表 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">
          {result.vulnerabilities && result.vulnerabilities.length > 0
            ? t("deepScan.results.testssl.hasVulnerabilities").replace("{count}", String(result.vulnerabilities.length))
            : t("deepScan.results.testssl.noVulnerabilities")}
        </h3>
        {result.vulnerabilities && result.vulnerabilities.length > 0 && (
          <div className="space-y-2">
            {result.vulnerabilities.map((vuln, index) => {
              const severity = getVulnerabilitySeverity(vuln)
              return (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    severity === "critical"
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : severity === "high"
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="text-sm">{vuln}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 加密套件 */}
      {result.ciphers && result.ciphers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">{t("deepScan.results.testssl.ciphers")}</h3>
          <div className="bg-gray-900/50 rounded p-3 max-h-40 overflow-y-auto">
            <div className="space-y-1">
              {result.ciphers.slice(0, 10).map((cipher, index) => (
                <div key={index} className="text-xs text-gray-300 font-mono">
                  {cipher}
                </div>
              ))}
              {result.ciphers.length > 10 && (
                <div className="text-xs text-gray-500 mt-2">
                  ... 还有 {result.ciphers.length - 10} 个加密套件
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 安全特性 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-3 rounded border ${result.hsts ? "bg-green-500/10 border-green-500/30" : "bg-gray-900/50 border-tech-border/20"}`}>
          <div className="text-xs text-gray-400 mb-1">{t("deepScan.results.testssl.hsts")}</div>
          <div className={`text-sm font-semibold ${result.hsts ? "text-green-400" : "text-gray-400"}`}>
            {result.hsts ? "✓ 已启用" : "✗ 未启用"}
          </div>
        </div>
        <div className={`p-3 rounded border ${result.ocsp ? "bg-green-500/10 border-green-500/30" : "bg-gray-900/50 border-tech-border/20"}`}>
          <div className="text-xs text-gray-400 mb-1">{t("deepScan.results.testssl.ocsp")}</div>
          <div className={`text-sm font-semibold ${result.ocsp ? "text-green-400" : "text-gray-400"}`}>
            {result.ocsp ? "✓ 已启用" : "✗ 未启用"}
          </div>
        </div>
      </div>

      {/* 安全建议 */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">{t("deepScan.results.testssl.recommendations")}</h3>
          <div className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <div key={index} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
                💡 {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
