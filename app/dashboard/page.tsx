import React from 'react'
import Link from 'next/link'
import DashboardLayout from '@/app/dashboard/layout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
          Editorial Dashboard
        </h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">
          Manage your digital product editorial content and optimization workflows.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/optimization" className="group bg-obsidian-deep border border-slate-border rounded p-6 hover:border-outline-variant transition-colors">
            <span className="material-symbols-outlined text-[32px] text-primary mb-4 block" aria-hidden="true">
              tune
            </span>
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-2">
              Optimization
            </h2>
            <p className="font-ui-body text-ui-body text-on-surface-variant text-sm">
              Run SEO, GEO, and AEO analysis on your editorial content.
            </p>
          </Link>

          <Link href="/articles" className="group bg-obsidian-deep border border-slate-border rounded p-6 hover:border-outline-variant transition-colors">
            <span className="material-symbols-outlined text-[32px] text-tertiary mb-4 block" aria-hidden="true">
              edit_note
            </span>
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-2">
              Articles
            </h2>
            <p className="font-ui-body text-ui-body text-on-surface-variant text-sm">
              Manage articles, guides, and editorial content.
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
