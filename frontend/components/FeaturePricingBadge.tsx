'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface FeaturePricingBadgeProps {
  featureCode: string;
  creditsCost?: number;
  isFree?: boolean;
  isPremium?: boolean;
}

export default function FeaturePricingBadge({
  featureCode,
  creditsCost,
  isFree = false,
  isPremium = false,
}: FeaturePricingBadgeProps) {
  const { t, locale } = useLanguage();
  
  if (isFree || (!creditsCost && !isPremium)) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded border border-green-500/30">
        {locale === 'zh' ? '免费' : 'Free'}
      </span>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
      {creditsCost ? `${creditsCost}${locale === 'zh' ? '积分' : ' credits'}` : (locale === 'zh' ? '付费' : 'Paid')}
    </span>
  );
}

