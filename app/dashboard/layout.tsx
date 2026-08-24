'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { href: '/dashboard/optimization', label: 'Optimization', icon: 'tune' },
  { href: '/dashboard/content', label: 'Content', icon: 'edit_note' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
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
    </div>
  )
}
