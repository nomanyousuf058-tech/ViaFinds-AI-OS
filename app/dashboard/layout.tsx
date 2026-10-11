'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'

const navItems = [
  { href: '/dashboard', label: 'Today', icon: 'home' },
  { href: '/dashboard/attention', label: 'Attention', icon: 'notifications_active' },
  { href: '/dashboard/brain', label: 'Brain', icon: 'psychology' },
  { href: '/dashboard/automation', label: 'Automation', icon: 'smart_toy' },
  { href: '/dashboard/jobs', label: 'Jobs', icon: 'work_history' },
  { href: '/dashboard/articles', label: 'Content', icon: 'edit_note' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: 'calendar_month' },
  { href: '/dashboard/revenue', label: 'Growth', icon: 'trending_up' },
  { href: '/dashboard/optimization', label: 'Optimization', icon: 'tune' },
  { href: '/dashboard/services', label: 'System', icon: 'settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background text-on-background font-ui-body antialiased">
        <div className="flex">
          <aside className="w-64 border-r border-slate-border min-h-screen p-4 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <Link href="/dashboard" className="font-headline-lg text-headline-lg-mobile font-bold text-on-background">
                  ViaFinds Admin
                </Link>
                <p className="font-mono-data text-mono-data text-on-surface-variant text-xs mt-1">
                  Editorial Control Center
                </p>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded font-ui-body text-ui-body text-sm transition-colors ${
                        isActive
                          ? 'bg-primary text-deep-navy font-medium'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Storage & Engine Status Widget */}
            <div className="mt-6 pt-4 border-t border-slate-border">
              <div className="bg-surface-container/60 border border-slate-border/50 rounded p-3 text-xs">
                <div className="flex items-center justify-between text-on-surface-variant mb-1.5">
                  <span className="flex items-center gap-1.5 font-medium text-on-background">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    DB Health
                  </span>
                  <span className="font-mono-data text-[11px] text-emerald-400 font-semibold">17 MB</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-1.5 mb-2 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '3.4%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Supabase Postgres</span>
                  <span className="font-mono-data">PKT (UTC+5)</span>
                </div>
              </div>
            </div>
          </aside>
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
