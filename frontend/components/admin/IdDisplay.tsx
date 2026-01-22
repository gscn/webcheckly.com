'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface IdDisplayProps {
  id: string;
  className?: string;
  showFull?: boolean;
}

export default function IdDisplay({ id, className = '', showFull = false }: IdDisplayProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 显示格式：前8位...后4位，这样可以看到ID的开头和结尾
  const displayId = showFull ? id : `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;

  return (
    <div className={`relative inline-flex items-center gap-2 group ${className}`}>
      <span
        className="font-mono text-xs text-tech-cyan/70 hover:text-tech-cyan cursor-pointer transition-colors break-all"
        onClick={handleCopy}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={id}
      >
        {displayId}
      </span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 text-xs bg-tech-surface/50 hover:bg-tech-surface/70 border border-tech-border/30 rounded text-tech-cyan/70 hover:text-tech-cyan"
        title={copied ? t('common.copied') : t('common.copy')}
        aria-label={copied ? t('common.copied') : t('common.copy')}
      >
        {copied ? '✓' : '📋'}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-tech-bg/95 border border-tech-border/40 rounded text-xs font-mono text-gray-300 whitespace-nowrap z-50 shadow-lg max-w-md break-all">
          {id}
        </div>
      )}
    </div>
  );
}

