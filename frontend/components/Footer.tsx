"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="w-full max-w-5xl mx-auto py-8 px-6 mt-auto border-t border-tech-border/10">
      <div className="flex flex-col md:flex-row justify-between items-center text-xs text-tech-cyan/50 font-mono gap-6">
        {/* Footer Links */}
        <div className="flex items-center gap-8">
          <Link className="hover:text-tech-cyan transition-colors flex items-center gap-1 group" href="/about">
            <span className="w-1 h-1 bg-tech-cyan opacity-0 group-hover:opacity-100 transition-opacity"></span> {t("nav.about")}
          </Link>
          <Link className="hover:text-tech-cyan transition-colors flex items-center gap-1 group" href="/support">
            <span className="w-1 h-1 bg-tech-cyan opacity-0 group-hover:opacity-100 transition-opacity"></span> {t("nav.support")}
          </Link>
          <Link className="hover:text-tech-cyan transition-colors flex items-center gap-1 group" href="/privacy">
            <span className="w-1 h-1 bg-tech-cyan opacity-0 group-hover:opacity-100 transition-opacity"></span> {t("nav.privacy")}
          </Link>
        </div>
        {/* Copyright Notice */}
        <div className="tracking-widest opacity-70">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  )
}

