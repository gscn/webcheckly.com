"use client"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function FAQPage() {
  const { t } = useLanguage()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: t("pages.faq.q1"),
      answer: t("pages.faq.a1")
    },
    {
      question: t("pages.faq.q13"),
      answer: t("pages.faq.a13")
    },
    {
      question: t("pages.faq.q14"),
      answer: t("pages.faq.a14")
    },
    {
      question: t("pages.faq.q2"),
      answer: t("pages.faq.a2")
    },
    {
      question: t("pages.faq.q3"),
      answer: t("pages.faq.a3")
    },
    {
      question: t("pages.faq.q4"),
      answer: t("pages.faq.a4")
    },
    {
      question: t("pages.faq.q5"),
      answer: t("pages.faq.a5")
    },
    {
      question: t("pages.faq.q6"),
      answer: t("pages.faq.a6")
    },
    {
      question: t("pages.faq.q7"),
      answer: t("pages.faq.a7")
    },
    {
      question: t("pages.faq.q8"),
      answer: t("pages.faq.a8")
    },
    {
      question: t("pages.faq.q9"),
      answer: t("pages.faq.a9")
    },
    {
      question: t("pages.faq.q10"),
      answer: t("pages.faq.a10")
    },
    {
      question: t("pages.faq.q11"),
      answer: t("pages.faq.a11")
    },
    {
      question: t("pages.faq.q15"),
      answer: t("pages.faq.a15")
    },
    {
      question: t("pages.faq.q12"),
      answer: t("pages.faq.a12")
    }
  ]

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-tech-cyan selection:text-black">
      <Header />
      
      <main className="flex-grow p-6 relative w-full">
        {/* Floating background elements */}
        <div className="absolute top-32 left-[10%] w-64 h-64 border border-tech-cyan/5 rounded-full animate-pulse-fast pointer-events-none"></div>
        <div className="absolute bottom-20 right-[10%] w-48 h-48 border border-tech-blue/10 rounded-full animate-float pointer-events-none"></div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between mb-3 text-tech-cyan/80 text-[10px] font-mono tracking-widest">
            <span>FAQ_DATABASE</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-cyan animate-pulse shadow-neon-cyan"></span>
              {t("pages.faq.title")}
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
                    {t("pages.faq.title").split(" ").map((word, i) => 
                      i === 1 ? (
                        <span key={i} className="text-tech-cyan drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">{word} </span>
                      ) : (
                        <span key={i}>{word} </span>
                      )
                    )}
                  </h1>
                  <p className="text-tech-cyan/80 font-mono text-sm max-w-2xl mx-auto">
                    {t("pages.faq.subtitle")}
                  </p>
                </div>

                {/* FAQ List */}
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-tech-surface/50 border border-tech-border/30 rounded-lg overflow-hidden transition-all duration-300 hover:border-tech-cyan/40"
                    >
                      <button
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        className="w-full p-6 text-left flex items-center justify-between group"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <span className="text-tech-cyan font-mono text-sm font-bold min-w-[2rem]">
                            Q{index + 1}
                          </span>
                          <h3 className="text-lg font-black text-white group-hover:text-tech-cyan transition-colors flex-1">
                            {faq.question}
                          </h3>
                        </div>
                        <svg
                          className={`w-5 h-5 text-tech-cyan transition-transform flex-shrink-0 ${
                            openIndex === index ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {openIndex === index && (
                        <div className="px-6 pb-6 animate-fade-in">
                          <div className="pl-12 border-l-2 border-tech-cyan/30">
                            <p className="text-gray-300/80 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* CTA Section */}
                <div className="mt-12 pt-8 border-t border-tech-border/20 text-center">
                  <p className="text-tech-cyan/70 font-mono text-sm mb-6">
                    {t("pages.faq.ctaText")}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link
                      href="/support"
                      className="inline-block clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-8 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] border-2 border-tech-cyan relative overflow-hidden group/btn"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {t("pages.faq.ctaSupport")}
                      </span>
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 ease-out"></div>
                    </Link>
                    <Link
                      href="/"
                      className="inline-block clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan hover:text-tech-cyan font-mono text-sm font-bold px-8 py-3 transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                    >
                      {t("pages.faq.ctaHome")}
                    </Link>
                  </div>
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

