'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const menuItems = [
    { href: '/admin', label: t('admin.nav.dashboard'), icon: '📊' },
    { href: '/admin/users', label: t('admin.nav.users'), icon: '👥' },
    { href: '/admin/tasks', label: t('admin.nav.tasks'), icon: '📋' },
    { href: '/admin/subscriptions', label: t('admin.nav.subscriptions'), icon: '💳' },
    { href: '/admin/credits', label: t('admin.nav.credits'), icon: '💰' },
    { href: '/admin/revenue', label: t('admin.nav.revenue'), icon: '💵' },
    { href: '/admin/blacklist', label: t('admin.nav.blacklist'), icon: '🚫' },
  ];

  return (
    <div className="w-64 bg-tech-bg/90 backdrop-blur-xl border-r border-tech-border/40 min-h-screen">
      <div className="p-6 border-b border-tech-border/40">
        <h2 className="text-xl font-black text-tech-cyan font-mono uppercase tracking-wider">
          {t('admin.title')}
        </h2>
        <p className="text-tech-cyan/70 font-mono text-xs mt-1">
          ADMIN_PANEL
        </p>
      </div>
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-tech-cyan/20 border border-tech-cyan/60 text-tech-cyan'
                  : 'text-gray-300 hover:bg-tech-surface/50 hover:text-tech-cyan border border-transparent'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-mono text-sm font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-tech-surface/50 hover:text-tech-cyan border border-transparent transition-all"
        >
          <span className="text-xl">←</span>
          <span className="font-mono text-sm font-bold">{t('admin.nav.backToDashboard')}</span>
        </Link>
      </div>
    </div>
  );
}

