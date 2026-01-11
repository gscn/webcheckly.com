'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { adjustUserCredits } from '@/services/adminService';

export default function AdminCreditsPage() {
  const { t } = useLanguage();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !amount || !reason) {
      setError(t('admin.credits.fillAllFields'));
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum === 0) {
      setError(t('admin.credits.invalidAmount'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      await adjustUserCredits(userId, amountNum, reason);
      setSuccess(true);
      setUserId('');
      setAmount('');
      setReason('');
    } catch (err: any) {
      console.error('Failed to adjust credits:', err);
      setError(err.message || t('admin.errors.adjustFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-white">
          {t('admin.credits.title')}
        </h1>
        <p className="text-tech-cyan font-mono text-sm font-bold uppercase tracking-wider">
          CREDITS_MANAGEMENT_SYSTEM
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="relative group mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel p-6">
            <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase mb-6">
              {t('admin.credits.adjustCredits')}
            </h2>

            {error && (
              <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 text-red-400 font-mono text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-950/40 border border-green-500/40 rounded-lg p-4 text-green-400 font-mono text-sm mb-4">
                {t('admin.credits.adjustSuccess')}
              </div>
            )}

            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-2">
                  {t('admin.credits.userId')}
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={t('admin.credits.userIdPlaceholder')}
                  className="w-full px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-2">
                  {t('admin.credits.amount')}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('admin.credits.amountPlaceholder')}
                  className="w-full px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan"
                  required
                />
                <p className="text-tech-cyan/50 font-mono text-xs mt-1">
                  {t('admin.credits.amountHint')}
                </p>
              </div>

              <div>
                <label className="block text-tech-cyan/70 font-mono text-xs uppercase mb-2">
                  {t('admin.credits.reason')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('admin.credits.reasonPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 bg-tech-surface/50 border border-tech-border/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-tech-cyan resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full clip-tech-btn bg-tech-cyan hover:bg-[#33f2ff] text-black font-black font-mono text-sm px-6 py-3 transition-all shadow-[0_0_15px_rgba(0,240,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('admin.credits.adjusting') : t('admin.credits.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

