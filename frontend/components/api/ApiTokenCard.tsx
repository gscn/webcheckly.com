'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAccessToken } from '@/services/authService';

function maskToken(token: string): string {
  if (token.length <= 20) return '••••••••••••••••••••';
  return token.slice(0, 12) + '••••••••••••' + token.slice(-8);
}

export default function ApiTokenCard() {
  const { t } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
    setLoaded(true);
  }, []);

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!loaded) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
        <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>
          <div className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
              <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
                {t('api.token.title')}
              </h2>
            </div>
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-tech-cyan/30 border-t-tech-cyan rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loaded && !token) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg blur opacity-30"></div>
        <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-amber-500/40 clip-tech-panel">
          <div className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
              <h2 className="text-xl font-bold text-amber-400 font-mono uppercase tracking-wider">
                {t('api.token.title')}
              </h2>
            </div>
            <p className="text-amber-200/90 font-mono text-sm mb-4">
              {t('api.token.notFound')}
            </p>
            <a
              href="/login?redirect=/api"
              className="inline-block clip-tech-btn bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400/60 text-amber-200 font-mono text-sm font-bold px-4 py-2 transition-all"
            >
              {t('api.token.goLogin')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const safeToken = token as string;
  const displayValue = visible ? safeToken : maskToken(safeToken);

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
      <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
            <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
              {t('api.token.title')}
            </h2>
          </div>

          <p className="text-gray-300 font-mono text-sm mb-4">
            {t('api.token.description')}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex-1 min-w-0 bg-tech-surface/50 border border-tech-border/30 rounded p-3 font-mono text-xs text-gray-300 break-all select-all">
              {displayValue}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="clip-tech-btn bg-tech-surface/80 hover:bg-tech-cyan/10 border-2 border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan font-mono text-xs font-bold px-3 py-2 transition-all"
              >
                {visible ? t('api.token.hide') : t('api.token.show')}
              </button>
              <button
                type="button"
                onClick={copyToken}
                className="clip-tech-btn bg-tech-cyan/20 hover:bg-tech-cyan/30 border-2 border-tech-cyan text-tech-cyan font-mono text-xs font-bold px-3 py-2 transition-all"
              >
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
          </div>

          <p className="text-amber-400/80 font-mono text-xs">
            {t('api.token.warning')}
          </p>
        </div>
      </div>
    </div>
  );
}
