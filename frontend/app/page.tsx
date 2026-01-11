"use client"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import UrlInput from "@/components/UrlInput"
import { useLanguage } from "@/contexts/LanguageContext"

export default function Home() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />

      <main className="flex-grow flex items-center justify-center p-4 relative w-full">
        
        {/* Floating background elements */}
        <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
        <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

        {/* Main HUD Container */}
        <div className="w-full max-w-5xl mx-auto z-10 relative">
          
          {/* Top Decorative Line */}
          <div className="flex items-center justify-between mb-3 text-tech-cyan/80 text-[10px] font-mono tracking-widest px-2 md:px-0">
            <span>SECURE_CONNECTION_ESTABLISHED</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {t("home.secureConnection")}
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
                 
                {/* Header Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-tech-cyan/5 border border-tech-cyan/20 rounded text-tech-cyan text-[10px] font-mono tracking-[0.2em]">
                    <span className="w-1 h-1 bg-tech-cyan shadow-neon-cyan animate-pulse"></span>
                    {t("home.systemStatus")}
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-10">
                  <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-white animate-text-glitch">
                    {t("home.mainTitle").includes(" ") ? (
                      <>
                        {t("home.mainTitle").split(" ")[0]} <span className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">{t("home.mainTitle").split(" ").slice(1).join(" ")}</span>
                      </>
                    ) : (
                      <>
                        {t("home.mainTitle").slice(0, 2)}<span className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">{t("home.mainTitle").slice(2)}</span>
                      </>
                    )}
                  </h1>
                  <p className="text-tech-cyan font-sans text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                    &gt; {t("home.subtitle")}<br/>
                    <span className="text-gray-300/70">{t("home.description")}</span>
                  </p>
                </div>

                {/* Command Line Input Section */}
                <div className="mb-10 relative">
                  <UrlInput />
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-tech-border/10 pt-10">
                  <div className="bg-tech-surface border border-white/5 hover:border-tech-cyan/40 transition-all duration-300 rounded-lg backdrop-blur-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 bg-tech-cyan shadow-neon-cyan animate-pulse"></span>
                      <h3 className="font-sans font-black text-sm text-white">{t("home.featureFree")}</h3>
                    </div>
                    <p className="text-[10px] font-mono text-tech-cyan/70 uppercase tracking-wider">{t("home.featureFreeDesc")}</p>
                  </div>
                  <div className="bg-tech-surface border border-white/5 hover:border-tech-cyan/40 transition-all duration-300 rounded-lg backdrop-blur-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 bg-tech-cyan shadow-neon-cyan animate-pulse"></span>
                      <h3 className="font-sans font-black text-sm text-white">{t("home.featureRealTime")}</h3>
                    </div>
                    <p className="text-[10px] font-mono text-tech-cyan/70 uppercase tracking-wider">{t("home.featureRealTimeDesc")}</p>
                  </div>
                  <div className="bg-tech-surface border border-white/5 hover:border-tech-cyan/40 transition-all duration-300 rounded-lg backdrop-blur-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 bg-tech-cyan shadow-neon-cyan animate-pulse"></span>
                      <h3 className="font-sans font-black text-sm text-white">{t("home.featureExport")}</h3>
                    </div>
                    <p className="text-[10px] font-mono text-tech-cyan/70 uppercase tracking-wider">{t("home.featureExportDesc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Stats - HUD Style */}
          <div className="flex justify-between items-end mt-6 text-[10px] font-mono text-tech-cyan/60 px-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2"><span className="w-1 h-1 bg-tech-cyan rounded-full shadow-neon-cyan"></span> {t("home.cpuLoad")}</div>
              <div className="flex items-center gap-2"><span className="w-1 h-1 bg-tech-blue rounded-full"></span> {t("home.memAlloc")}</div>
            </div>
            <div className="flex gap-8 opacity-80">
              <div className="text-right group cursor-default">
                <div className="text-white font-bold text-lg leading-none group-hover:text-tech-cyan transition-colors">99.9%</div>
                <div className="text-[9px] tracking-wider mt-1">{t("home.accuracy")}</div>
              </div>
              <div className="text-right group cursor-default">
                <div className="text-white font-bold text-lg leading-none group-hover:text-tech-cyan transition-colors">10K+</div>
                <div className="text-[9px] tracking-wider mt-1">{t("home.todayScans")}</div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
