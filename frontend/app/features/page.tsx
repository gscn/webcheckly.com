"use client"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function FeaturesPage() {
  const { t } = useLanguage()
  // 核心检测功能
  const coreFeatures = [
    {
      icon: "🔗",
      title: t("pages.features.linkHealth.title"),
      description: t("pages.features.linkHealth.description"),
      details: [
        t("pages.features.linkHealth.detail1"),
        t("pages.features.linkHealth.detail2"),
        t("pages.features.linkHealth.detail3"),
        t("pages.features.linkHealth.detail4"),
        t("pages.features.linkHealth.detail5"),
      ]
    },
    {
      icon: "🌐",
      title: t("pages.features.websiteInfo.title"),
      description: t("pages.features.websiteInfo.description"),
      details: [
        t("pages.features.websiteInfo.detail1"),
        t("pages.features.websiteInfo.detail2"),
        t("pages.features.websiteInfo.detail3"),
        t("pages.features.websiteInfo.detail4"),
        t("pages.features.websiteInfo.detail5"),
      ]
    },
    {
      icon: "🌍",
      title: t("pages.features.domainInfo.title"),
      description: t("pages.features.domainInfo.description"),
      details: [
        t("pages.features.domainInfo.detail1"),
        t("pages.features.domainInfo.detail2"),
        t("pages.features.domainInfo.detail3"),
        t("pages.features.domainInfo.detail4"),
        t("pages.features.domainInfo.detail5"),
      ]
    },
    {
      icon: "🔒",
      title: t("pages.features.sslInfo.title"),
      description: t("pages.features.sslInfo.description"),
      details: [
        t("pages.features.sslInfo.detail1"),
        t("pages.features.sslInfo.detail2"),
        t("pages.features.sslInfo.detail3"),
        t("pages.features.sslInfo.detail4"),
        t("pages.features.sslInfo.detail5"),
      ]
    },
    {
      icon: "⚙️",
      title: t("pages.features.techStack.title"),
      description: t("pages.features.techStack.description"),
      details: [
        t("pages.features.techStack.detail1"),
        t("pages.features.techStack.detail2"),
        t("pages.features.techStack.detail3"),
        t("pages.features.techStack.detail4"),
        t("pages.features.techStack.detail5"),
        t("pages.features.techStack.detail6"),
      ]
    },
  ]

  // Lighthouse质量检测功能
  const qualityFeatures = [
    {
      icon: "⚡",
      title: t("pages.features.performance.title"),
      description: t("pages.features.performance.description"),
      details: [
        t("pages.features.performance.detail1"),
        t("pages.features.performance.detail2"),
        t("pages.features.performance.detail3"),
        t("pages.features.performance.detail4"),
        t("pages.features.performance.detail5"),
      ]
    },
    {
      icon: "🔍",
      title: t("pages.features.seoCompliance.title"),
      description: t("pages.features.seoCompliance.description"),
      details: [
        t("pages.features.seoCompliance.detail1"),
        t("pages.features.seoCompliance.detail2"),
        t("pages.features.seoCompliance.detail3"),
        t("pages.features.seoCompliance.detail4"),
        t("pages.features.seoCompliance.detail5"),
      ]
    },
    {
      icon: "🔐",
      title: t("pages.features.frontendSecurity.title"),
      description: t("pages.features.frontendSecurity.description"),
      details: [
        t("pages.features.frontendSecurity.detail1"),
        t("pages.features.frontendSecurity.detail2"),
        t("pages.features.frontendSecurity.detail3"),
        t("pages.features.frontendSecurity.detail4"),
        t("pages.features.frontendSecurity.detail5"),
      ]
    },
    {
      icon: "♿",
      title: t("pages.features.accessibility.title"),
      description: t("pages.features.accessibility.description"),
      details: [
        t("pages.features.accessibility.detail1"),
        t("pages.features.accessibility.detail2"),
        t("pages.features.accessibility.detail3"),
        t("pages.features.accessibility.detail4"),
        t("pages.features.accessibility.detail5"),
      ]
    },
  ]

  // 高级功能
  const advancedFeatures = [
    {
      icon: "🤖",
      title: t("pages.features.aiAnalysis.title"),
      description: t("pages.features.aiAnalysis.description"),
      details: [
        t("pages.features.aiAnalysis.detail1"),
        t("pages.features.aiAnalysis.detail2"),
        t("pages.features.aiAnalysis.detail3"),
        t("pages.features.aiAnalysis.detail4"),
        t("pages.features.aiAnalysis.detail5"),
      ]
    },
    {
      icon: "🕷️",
      title: t("pages.features.deepCheck.title"),
      description: t("pages.features.deepCheck.description"),
      details: [
        t("pages.features.deepCheck.detail1"),
        t("pages.features.deepCheck.detail2"),
        t("pages.features.deepCheck.detail3"),
        t("pages.features.deepCheck.detail4"),
        t("pages.features.deepCheck.detail5"),
      ]
    },
  ]

  // 系统特性
  const systemFeatures = [
    {
      icon: "📊",
      title: t("pages.features.realTime.title"),
      description: t("pages.features.realTime.description"),
      details: [
        t("pages.features.realTime.detail1"),
        t("pages.features.realTime.detail2"),
        t("pages.features.realTime.detail3"),
        t("pages.features.realTime.detail4"),
        t("pages.features.realTime.detail5"),
      ]
    },
    {
      icon: "📄",
      title: t("pages.features.export.title"),
      description: t("pages.features.export.description"),
      details: [
        t("pages.features.export.detail1"),
        t("pages.features.export.detail2"),
        t("pages.features.export.detail3"),
        t("pages.features.export.detail4"),
        t("pages.features.export.detail5"),
      ]
    },
    {
      icon: "🛡️",
      title: t("pages.features.security.title"),
      description: t("pages.features.security.description"),
      details: [
        t("pages.features.security.detail1"),
        t("pages.features.security.detail2"),
        t("pages.features.security.detail3"),
        t("pages.features.security.detail4"),
        t("pages.features.security.detail5"),
      ]
    },
  ]

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      
      <main className="flex-grow p-6 relative w-full">
        {/* Floating background elements */}
        <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
        <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between mb-3 text-tech-cyan/80 text-[10px] font-mono tracking-widest">
            <span>FEATURES_OVERVIEW</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {t("pages.features.title")}
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
                    {t("pages.features.title").split(" ").map((word, i) => 
                      i === 1 ? (
                        <span key={i} className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">{word} </span>
                      ) : (
                        <span key={i}>{word} </span>
                      )
                    )}
                  </h1>
                  <p className="text-tech-cyan/80 font-mono text-sm max-w-2xl mx-auto">
                    {t("pages.features.subtitle")}
                  </p>
                </div>

                {/* Core Features Section */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                    <h2 className="text-tech-cyan font-mono text-sm uppercase tracking-widest font-bold">{t("pages.features.sectionCore")}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {coreFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 hover:border-tech-cyan/40 rounded-lg p-6 transition-all duration-300 backdrop-blur-sm group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="text-3xl">{feature.icon}</div>
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-2 group-hover:text-tech-cyan transition-colors">
                              {feature.title}
                            </h3>
                            <p className="text-tech-cyan/70 text-sm mb-4">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        
                        <ul className="space-y-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300/80">
                              <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full mt-1.5 flex-shrink-0 shadow-neon-cyan"></span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Features Section */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                    <h2 className="text-tech-cyan font-mono text-sm uppercase tracking-widest font-bold">{t("pages.features.sectionQuality")}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {qualityFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 hover:border-tech-cyan/40 rounded-lg p-6 transition-all duration-300 backdrop-blur-sm group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="text-3xl">{feature.icon}</div>
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-2 group-hover:text-tech-cyan transition-colors">
                              {feature.title}
                            </h3>
                            <p className="text-tech-cyan/70 text-sm mb-4">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        
                        <ul className="space-y-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300/80">
                              <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full mt-1.5 flex-shrink-0 shadow-neon-cyan"></span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Features Section */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                    <h2 className="text-tech-cyan font-mono text-sm uppercase tracking-widest font-bold">{t("pages.features.sectionAdvanced")}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {advancedFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 hover:border-tech-cyan/40 rounded-lg p-6 transition-all duration-300 backdrop-blur-sm group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="text-3xl">{feature.icon}</div>
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-2 group-hover:text-tech-cyan transition-colors">
                              {feature.title}
                            </h3>
                            <p className="text-tech-cyan/70 text-sm mb-4">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        
                        <ul className="space-y-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300/80">
                              <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full mt-1.5 flex-shrink-0 shadow-neon-cyan"></span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Features Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                    <h2 className="text-tech-cyan font-mono text-sm uppercase tracking-widest font-bold">{t("pages.features.sectionSystem")}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {systemFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 hover:border-tech-cyan/40 rounded-lg p-6 transition-all duration-300 backdrop-blur-sm group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="text-3xl">{feature.icon}</div>
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-2 group-hover:text-tech-cyan transition-colors">
                              {feature.title}
                            </h3>
                            <p className="text-tech-cyan/70 text-sm mb-4">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        
                        <ul className="space-y-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300/80">
                              <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full mt-1.5 flex-shrink-0 shadow-neon-cyan"></span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Section */}
                <div className="mt-12 pt-8 border-t border-tech-border/20 text-center">
                  <p className="text-tech-cyan/70 font-mono text-sm mb-6">
                    {t("pages.features.ctaText")}
                  </p>
                  <Link
                    href="/"
                    className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-8 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {t("pages.features.ctaButton")}
                      <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 ease-out"></div>
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

