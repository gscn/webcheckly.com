"use client"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AboutPage() {
  const { t } = useLanguage()
  const values = [
    {
      icon: "🚀",
      title: t("pages.about.value1Title"),
      description: t("pages.about.value1Desc")
    },
    {
      icon: "🔒",
      title: t("pages.about.value2Title"),
      description: t("pages.about.value2Desc")
    },
    {
      icon: "💡",
      title: t("pages.about.value3Title"),
      description: t("pages.about.value3Desc")
    },
    {
      icon: "📊",
      title: t("pages.about.value4Title"),
      description: t("pages.about.value4Desc")
    }
  ]

  const techStack = [
    { name: "Next.js", description: t("pages.about.tech1") },
    { name: "GoFiber", description: t("pages.about.tech2") },
    { name: "httpx", description: t("pages.about.tech3") },
    { name: "SSE", description: t("pages.about.tech4") },
    { name: "Tailwind CSS", description: t("pages.about.tech5") }
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
            <span>ABOUT_WEBCHECKLY</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {t("pages.about.title")}
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
                    {t("pages.about.title").split(" ").map((word, i) => 
                      i === 1 ? (
                        <span key={i} className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">{word} </span>
                      ) : (
                        <span key={i}>{word} </span>
                      )
                    )}
                  </h1>
                  <p className="text-tech-cyan/80 font-mono text-sm max-w-2xl mx-auto">
                    {t("pages.about.subtitle")}
                  </p>
                </div>

                {/* Introduction */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
                    <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                      {t("pages.about.introTitle")}
                    </h2>
                    <div className="space-y-4 text-gray-300/80 leading-relaxed">
                      <p>
                        {t("pages.about.intro1")}
                      </p>
                      <p>
                        {t("pages.about.intro2")}
                      </p>
                      <p>
                        {t("pages.about.intro3")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Values */}
                <div className="mb-12">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    {t("pages.about.valuesTitle")}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {values.map((value, index) => (
                      <div
                        key={index}
                        className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm hover:border-tech-cyan/40 transition-all"
                      >
                        <div className="text-3xl mb-3">{value.icon}</div>
                        <h3 className="text-lg font-black text-white mb-2">{value.title}</h3>
                        <p className="text-tech-cyan/70 text-sm">{value.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tech Stack */}
                <div className="mb-12">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                    {t("pages.about.techStackTitle")}
                  </h2>
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {techStack.map((tech, index) => (
                        <div key={index} className="text-center">
                          <div className="text-tech-cyan font-mono font-bold text-lg mb-1">{tech.name}</div>
                          <div className="text-tech-cyan/60 text-xs">{tech.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mission */}
                <div className="mb-12">
                  <div className="bg-tech-surface/50 border border-tech-border/30 rounded-lg p-6 backdrop-blur-sm">
                    <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
                      {t("pages.about.missionTitle")}
                    </h2>
                    <p className="text-gray-300/80 leading-relaxed">
                      {t("pages.about.mission")}
                    </p>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="mt-12 pt-8 border-t border-tech-border/20 text-center">
                  <p className="text-tech-cyan/70 font-mono text-sm mb-6">
                    {t("pages.about.ctaText")}
                  </p>
                  <Link
                    href="/"
                    className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-8 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {t("pages.about.ctaButton")}
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

