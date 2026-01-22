"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { Locale } from "@/utils/i18n"

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()

  const toggleLanguage = () => {
    setLocale(locale === "zh" ? "en" : "zh")
  }
  
  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1.5 text-xs font-mono text-tech-cyan/70 hover:text-tech-cyan border border-tech-border/30 hover:border-tech-cyan/50 rounded transition-all flex items-center gap-2 hover:bg-tech-cyan/5"
      title={locale === "zh" ? t("common.switchToEnglish") : t("common.switchToChinese")}
    >
      <span className="font-bold">{locale === "zh" ? "中" : "EN"}</span>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    </button>
  )
}

