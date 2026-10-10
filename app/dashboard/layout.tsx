'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import BrainChatWidget from '@/components/dashboard/BrainChatWidget'

const navItems = [
  { href: '/dashboard', label: 'Home / Today', icon: 'home' },
  { href: '/dashboard/articles', label: 'Articles', icon: 'article' },
  { href: '/dashboard/revenue', label: 'Revenue', icon: 'payments' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'bar_chart' },
  { href: '/dashboard/brain', label: 'AI Brain', icon: 'psychology' },
  { href: '/dashboard/calendar', label: 'Schedule', icon: 'calendar_month' },
  { href: '/dashboard/actions', label: 'My Actions', icon: 'checklist' },
  { href: '/dashboard/services', label: 'System / Settings', icon: 'settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background text-on-background font-ui-body antialiased">
        <div className="flex">
          <aside className="w-64 border-r border-slate-border min-h-screen p-4">
            <div className="mb-8">
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded font-ui-body text-ui-body text-sm transition-colors ${
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
          </aside>
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
        <BrainChatWidget />
      </div>
    </AdminGuard>
  )
}
