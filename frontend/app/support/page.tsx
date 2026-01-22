"use client"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function SupportPage() {
  const { t } = useLanguage()
  const supportChannels = [
    {
      icon: "📧",
      title: t("pages.support.emailTitle"),
      description: t("pages.support.emailDesc"),
      contact: "support@webcheckly.com",
      action: t("pages.support.emailAction")
    },
    {
      icon: "💬",
      title: t("pages.support.feedbackTitle"),
      description: t("pages.support.feedbackDesc"),
      contact: t("pages.support.feedbackContact"),
      action: t("pages.support.feedbackAction")
    },
    {
      icon: "📚",
      title: t("pages.support.docsTitle"),
      description: t("pages.support.docsDesc"),
      contact: t("pages.support.docsContact"),
      action: t("pages.support.docsAction")
    }
  ]

  const commonIssues = [
    {
      title: t("pages.support.issue1Title"),
      solution: t("pages.support.issue1Solution")
    },
    {
      title: t("pages.support.issue2Title"),
      solution: t("pages.support.issue2Solution")
    },
    {
      title: t("pages.support.issue3Title"),
      solution: t("pages.support.issue3Solution")
    },
    {
      title: t("pages.support.issue4Title"),
      solution: t("pages.support.issue4Solution")
    }
  ]

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      
      <main className="flex-grow p-6 relative w-full">
        {/* Floating background elements */}
        <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
        <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between mb-3 text-tech-cyan/80 text-[10px] font-mono tracking-widest">
            <span>SUPPORT_CENTER</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {t("pages.support.title")}
            </span>
          </div>

          <div className="relative group">
            {/* Outer Glow Border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            
            <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
              
              {/* Decorative Corner Markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

              {/* Inner Content */}
              <div className="p-8 md:p-14 relative overflow-hidden z-10">
                
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white">
                    {t("pages.support.title").split(" ").map((word, i) => 
                      i === 1 ? (
                        <span key={i} className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">{word} </span>
                      ) : (
                        <span key={i}>{word} </span>
                      )
                    )}
                  </h1>
                  <p className="text-tech-cyan/80 font-mono text-sm max-w-2xl mx-auto">
                    {t("pages.support.subtitle")}
                  </p>
                </div>

                {/* Support Channels */}
                <div className="mb-12">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    {t("pages.support.contactTitle")}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {supportChannels.map((channel, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm hover:border-tech-cyan/40 transition-all"
                      >
                        <div className="text-3xl mb-3">{channel.icon}</div>
                        <h3 className="text-lg font-black text-white mb-2">{channel.title}</h3>
                        <p className="text-tech-cyan/70 text-sm mb-4">{channel.description}</p>
                        <div className="text-tech-cyan font-mono text-xs mb-4">{channel.contact}</div>
                        <button className="w-full clip-tech-btn bg-tech-cyan/10 hover:bg-tech-cyan/20 border border-tech-cyan/40 text-tech-cyan font-mono text-xs font-bold px-4 py-2 transition-all">
                          {channel.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Issues */}
                <div className="mb-12">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    {t("pages.support.issuesTitle")}
                  </h2>
                  <div className="space-y-4">
                    {commonIssues.map((issue, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm"
                      >
                        <h3 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                          <span className="text-tech-cyan">⚠</span>
                          {issue.title}
                        </h3>
                        <p className="text-gray-300/80 text-sm leading-relaxed pl-6 border-l-2 border-tech-cyan/30">
                          {issue.solution}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response Time */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
                    <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                      {t("pages.support.responseTitle")}
                  </h2>
                    <div className="space-y-3 text-gray-300/80">
                      <p>
                        <span className="text-tech-cyan font-mono font-bold">{t("pages.support.response1").split("：")[0]}：</span>
                        {t("pages.support.response1").split("：")[1]}
                      </p>
                      <p>
                        <span className="text-tech-cyan font-mono font-bold">{t("pages.support.response2").split("：")[0]}：</span>
                        {t("pages.support.response2").split("：")[1]}
                      </p>
                      <p>
                        <span className="text-tech-cyan font-mono font-bold">{t("pages.support.response3").split("：")[0]}：</span>
                        {t("pages.support.response3").split("：")[1]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* FAQ Link */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm text-center">
                    <p className="text-tech-cyan/70 font-mono text-sm mb-4">
                      {t("pages.support.faqLink")}
                    </p>
                    <Link
                      href="/faq"
                      className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-8 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan relative overflow-hidden group/btn"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {t("pages.support.faqButton")}
                      </span>
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 ease-out"></div>
                    </Link>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="mt-12 pt-8 border-t border-tech-border/20 text-center">
                    <Link
                      href="/"
                      className="inline-block clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-sm font-bold px-8 py-3 transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                    >
                      {t("pages.support.ctaHome")}
                    </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

