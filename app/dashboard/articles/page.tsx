import React from 'react'
import Link from 'next/link'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'

interface DashboardArticlesPageProps {
  searchParams: Promise<{ status?: string; q?: string }>
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Articles' },
  { value: 'draft', label: 'Drafts' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export default async function DashboardArticlesPage({ searchParams }: DashboardArticlesPageProps) {
  const resolvedParams = await searchParams
  const statusFilter = resolvedParams.status || ''
  const query = resolvedParams.q || ''

  let articles = await articleRepository.findAll(100, 0, statusFilter || undefined)
  if (query) {
    const lower = query.toLowerCase()
    articles = articles.filter(
      (a: ArticleRow) =>
        a.title.toLowerCase().includes(lower) ||
        (a.excerpt || '').toLowerCase().includes(lower) ||
        a.slug.toLowerCase().includes(lower)
    )
  }

  const counts = await Promise.all(
    ['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'].map((s) =>
      articleRepository.countByStatus(s)
    )
  )
  const countsMap: Record<string, number> = {
    draft: counts[0],
    in_review: counts[1],
    approved: counts[2],
    scheduled: counts[3],
    published: counts[4],
    archived: counts[5],
  }

  return (
          <div className="max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
              Articles
            </h1>
            <p className="font-ui-body text-ui-body text-on-surface-variant">
              Manage your editorial content and publishing workflow.
            </p>
          </div>
          <Link
            href="/dashboard/articles/new"
            className="inline-flex items-center gap-2 bg-primary text-deep-navy font-ui-body text-ui-body font-bold uppercase tracking-wider px-6 py-3 hover:bg-gold-accent transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Article
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_OPTIONS.map((option) => {
            const isActive = statusFilter === option.value
            const count = option.value ? countsMap[option.value] : articles.length
            return (
              <Link
                key={option.value}
                href={`/dashboard/articles${option.value ? `?status=${option.value}` : ''}`}
                className={`px-4 py-2 rounded border font-ui-body text-ui-body text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-deep-navy border-primary'
                    : 'bg-transparent text-on-surface-variant border-outline-variant/30 hover:border-outline-variant'
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs opacity-70">({count})</span>
              </Link>
            )
          })}
        </div>

        {/* Articles Table */}
        <div className="border border-slate-border rounded overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low border-b border-slate-border">
              <tr>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs">
                  Title
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs">
                  Status
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs hidden md:table-cell">
                  Updated
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs hidden md:table-cell">
                  Published
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border">
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-4">
                      article
                    </span>
                    <p className="font-ui-body text-ui-body text-on-surface-variant">
                      No articles found.
                    </p>
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-ui-body text-ui-body text-on-background font-medium">
                          {article.title}
                        </span>
                        <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">
                          {article.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-6 py-4 font-mono-data text-mono-data text-on-surface-variant text-xs hidden md:table-cell">
                      {article.updated_at
                        ? new Date(article.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 font-mono-data text-mono-data text-on-surface-variant text-xs hidden md:table-cell">
                      {article.published_at
                        ? new Date(article.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/articles/${article.id}`}
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        <Link
                          href={`/articles/${article.slug}`}
                          target="_blank"
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                          title="View"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-surface-container text-on-surface-variant',
    in_review: 'bg-gold-accent/10 text-gold-accent',
    approved: 'bg-blue-500/10 text-blue-400',
    scheduled: 'bg-purple-500/10 text-purple-400',
    published: 'bg-green-500/10 text-green-400',
    archived: 'bg-red-500/10 text-red-400',
  }
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full font-label-caps text-label-caps text-[10px] uppercase tracking-wider ${
        styles[status] || styles.draft
      }`}
    >
      {label}
    </span>
  )
}
