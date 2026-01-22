'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface ApiStatsCardProps {
  stats: {
    total_requests: number;
    monthly_requests: number;
    monthly_limit?: number;
    remaining_requests?: number;
  };
}

export default function ApiStatsCard({ stats }: ApiStatsCardProps) {
  const { t } = useLanguage();

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
      <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
        {/* Decorative Corner Markers */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
            <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
              {t('api.stats.title')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
              <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">
                {t('api.stats.totalRequests')}
              </div>
              <div className="text-2xl font-bold text-tech-cyan">{stats.total_requests}</div>
            </div>
            
            <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
              <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">
                {t('api.stats.monthlyRequests')}
              </div>
              <div className="text-2xl font-bold text-tech-cyan">
                {stats.monthly_requests}
                {stats.monthly_limit && ` / ${stats.monthly_limit}`}
              </div>
              {stats.monthly_limit && (
                <div className="w-full bg-tech-surface/80 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-tech-cyan h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (stats.monthly_requests / stats.monthly_limit) * 100)}%`
                    }}
                  ></div>
                </div>
              )}
            </div>
            
            {stats.remaining_requests !== undefined && (
              <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded">
                <div className="text-tech-cyan/70 font-mono text-xs uppercase mb-2">
                  {t('api.stats.remainingRequests')}
                </div>
                <div className={`text-2xl font-bold ${stats.remaining_requests > 0 ? 'text-tech-cyan' : 'text-red-400'}`}>
                  {stats.remaining_requests}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
