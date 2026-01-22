"use client"

import { SecurityRisk } from "@/types/scan"
import { Shield, ShieldAlert, ShieldCheck, Globe, Code, Lock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface SecurityPanelProps {
  security: SecurityRisk
}

export default function SecurityPanel({ security }: SecurityPanelProps) {
  const { t } = useLanguage()
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-tech-border/20">
        <div className="flex items-center gap-2">
          <div className="text-tech-cyan">
            <Shield size={18} />
          </div>
          <h3 className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">{t("scan.securityTitle")}</h3>
        </div>
        <div className={`font-mono font-bold ${getScoreColor(security.score || 0)}`}>
          SCORE: {security.score ?? "-"}
        </div>
      </div>

      <div className="space-y-6">
        {/* Third Party Scripts */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-tech-cyan/80">
            <Globe size={14} />
            <span className="text-xs font-mono font-bold uppercase tracking-tight">{t("scan.thirdPartyScripts")} ({security.script_count})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {security.third_party_scripts && security.third_party_scripts.length > 0 ? (
              security.third_party_scripts.map((script, index) => (
                <span key={index} className="px-2 py-1 bg-tech-cyan/5 text-tech-cyan/70 font-mono text-[10px] rounded border border-tech-cyan/20">
                  {script}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic font-mono">{t("scan.noExternalScripts")}</span>
            )}
          </div>
        </div>

        {/* Security Headers */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-tech-cyan/80">
            <Lock size={14} />
            <span className="text-xs font-mono font-bold uppercase tracking-tight">{t("scan.securityHeaders")}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {security.security_headers && Object.entries(security.security_headers).length > 0 ? (
              Object.entries(security.security_headers).map(([header, value], index) => (
                <div key={index} className="p-2 border border-tech-border/10 rounded bg-tech-surface/30">
                  <div className="text-[10px] font-bold text-tech-cyan/50 uppercase font-mono mb-1">{header}</div>
                  <div className="text-xs text-gray-300 truncate font-mono" title={value}>{value}</div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-xs text-gray-500 italic font-mono">{t("scan.noSecurityHeaders")}</div>
            )}
          </div>
        </div>

        {/* Vulnerabilities */}
        {security.vulnerabilities && security.vulnerabilities.length > 0 && (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded">
            <div className="flex items-center gap-2 mb-2 text-red-500/80 font-bold font-mono text-xs uppercase tracking-tight">
              <ShieldAlert size={14} />
              <span>{t("scan.securityAlerts")} / SECURITY_ALERTS</span>
            </div>
            <ul className="list-none space-y-1">
              {security.vulnerabilities.map((vuln, index) => (
                <li key={index} className="text-[11px] text-red-400 font-mono flex items-start gap-2">
                  <span className="mt-1 w-1 h-1 bg-red-400 rounded-full shrink-0"></span>
                  {vuln}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

