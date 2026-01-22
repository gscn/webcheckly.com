"use client"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function PrivacyPage() {
  const { t } = useLanguage()
  const sections = [
    {
      title: t("pages.privacy.section1Title"),
      content: [
        t("pages.privacy.section1Content1"),
        t("pages.privacy.section1Content2"),
        t("pages.privacy.section1Content3"),
        t("pages.privacy.section1Content4"),
        t("pages.privacy.section1Content5"),
      ]
    },
    {
      title: t("pages.privacy.section2Title"),
      content: [
        t("pages.privacy.section2Content1"),
        t("pages.privacy.section2Content2"),
        t("pages.privacy.section2Content3"),
      ]
    },
    {
      title: t("pages.privacy.section3Title"),
      content: [
        t("pages.privacy.section3Content1"),
        t("pages.privacy.section3Content2"),
        t("pages.privacy.section3Content3"),
      ]
    },
    {
      title: t("pages.privacy.section4Title"),
      content: [
        t("pages.privacy.section4Content1"),
        t("pages.privacy.section4Content2"),
        t("pages.privacy.section4Content3"),
      ]
    },
    {
      title: t("pages.privacy.section5Title"),
      content: [
        t("pages.privacy.section5Content1"),
        t("pages.privacy.section5Content2"),
        t("pages.privacy.section5Content3"),
        t("pages.privacy.section5Content4"),
      ]
    },
    {
      title: t("pages.privacy.section6Title"),
      content: [
        t("pages.privacy.section6Content1"),
        t("pages.privacy.section6Content2"),
        t("pages.privacy.section6Content3"),
      ]
    },
    {
      title: t("pages.privacy.section7Title"),
      content: [
        t("pages.privacy.section7Content1"),
        t("pages.privacy.section7Content2"),
        t("pages.privacy.section7Content3"),
        t("pages.privacy.section7Content4"),
      ]
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
            <span>PRIVACY_POLICY</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {t("pages.privacy.title")}
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
                    {t("pages.privacy.title").split(" ").map((word, i) => 
                      i === 1 ? (
                        <span key={i} className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">{word} </span>
                      ) : (
                        <span key={i}>{word} </span>
                      )
                    )}
                  </h1>
                  <p className="text-tech-cyan/80 font-mono text-sm max-w-2xl mx-auto">
                    {t("pages.privacy.subtitle")}
                  </p>
                </div>

                {/* Introduction */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
                    <p className="text-gray-300/80 leading-relaxed">
                      {t("pages.privacy.intro")}
                    </p>
                  </div>
                </div>

                {/* Privacy Sections */}
                <div className="space-y-6 mb-12">
                  {sections.map((section, index) => (
                    <div
                      key={index}
                      className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm"
                    >
                      <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
                        <span className="text-tech-cyan font-mono text-sm">{String(index + 1).padStart(2, '0')}</span>
                        {section.title}
                      </h2>
                      <ul className="space-y-3">
                        {section.content.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-gray-300/80">
                            <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full mt-1.5 flex-shrink-0 shadow-neon-cyan"></span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Key Points */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-cyan/30 rounded-lg p-6 backdrop-blur-sm">
                    <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                      {t("pages.privacy.coreCommitment")}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-tech-cyan text-xl">✓</span>
                        <div>
                          <div className="text-white font-bold mb-1">{t("pages.privacy.commitment1Title")}</div>
                          <div className="text-tech-cyan/70 text-sm">{t("pages.privacy.commitment1Desc")}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-tech-cyan text-xl">✓</span>
                        <div>
                          <div className="text-white font-bold mb-1">{t("pages.privacy.commitment2Title")}</div>
                          <div className="text-tech-cyan/70 text-sm">{t("pages.privacy.commitment2Desc")}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-tech-cyan text-xl">✓</span>
                        <div>
                          <div className="text-white font-bold mb-1">{t("pages.privacy.commitment3Title")}</div>
                          <div className="text-tech-cyan/70 text-sm">{t("pages.privacy.commitment3Desc")}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-tech-cyan text-xl">✓</span>
                        <div>
                          <div className="text-white font-bold mb-1">{t("pages.privacy.commitment4Title")}</div>
                          <div className="text-tech-cyan/70 text-sm">{t("pages.privacy.commitment4Desc")}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-tech-cyan text-xl">✓</span>
                        <div>
                          <div className="text-white font-bold mb-1">{t("pages.privacy.commitment5Title")}</div>
                          <div className="text-tech-cyan/70 text-sm">{t("pages.privacy.commitment5Desc")}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm text-center">
                    <h2 className="text-xl font-black text-white mb-4">
                      {t("pages.privacy.contactTitle")}
                    </h2>
                    <p className="text-gray-300/80 mb-4">
                      {t("pages.privacy.contactText")}
                    </p>
                    <Link
                      href="/support"
                      className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-8 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan relative overflow-hidden group/btn"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {t("pages.privacy.contactButton")}
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
                    {t("pages.privacy.ctaHome")}
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

