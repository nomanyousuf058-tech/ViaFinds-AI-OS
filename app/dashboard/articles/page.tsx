import React from 'react'
import Link from 'next/link'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'
import DeleteArticleButton from '@/components/DeleteArticleButton'

interface DashboardArticlesPageProps {
  searchParams: Promise<{ status?: string; q?: string; type?: string }>
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
  try {
    const resolvedParams = await searchParams
    const statusFilter = resolvedParams.status || ''
    const typeFilter = resolvedParams.type || ''
    const query = resolvedParams.q || ''

    let articles = await articleRepository.findAll(100, 0, statusFilter || undefined)
    if (!statusFilter) {
      // Hide archived from the "All Articles" view by default
      articles = articles.filter((a: ArticleRow) => a.status !== 'archived')
    }

    if (typeFilter) {
      articles = articles.filter((a: ArticleRow) => a.article_type === typeFilter)
    }
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
            className="inline-flex items-center justify-center gap-2 bg-primary text-deep-navy font-ui-body text-ui-body font-bold uppercase tracking-wider px-6 py-3 hover:bg-gold-accent transition-colors rounded shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">add</span>
            New Article
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const isActive = statusFilter === option.value
              const count = option.value ? countsMap[option.value] : articles.length
              return (
                <Link
                  key={option.value}
                  href={`/dashboard/articles?${new URLSearchParams({
                    ...(option.value && { status: option.value }),
                    ...(typeFilter && { type: typeFilter }),
                    ...(query && { q: query })
                  }).toString()}`}
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
          
          <form className="flex gap-2">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            {query && <input type="hidden" name="q" value={query} />}
            <select
              name="type"
              defaultValue={typeFilter}
              className="bg-surface-container border border-slate-border rounded px-3 py-2 font-ui-body text-sm text-on-background focus:outline-none focus:border-primary"
            >
              <option value="">All Types</option>
              <option value="Standard">Standard</option>
              <option value="Comparison">Comparison</option>
              <option value="News">News</option>
              <option value="Feature">Feature</option>
              <option value="Opinion">Opinion</option>
              <option value="Investigative">Investigative</option>
              <option value="Review">Review</option>
              <option value="How-To">How-To</option>
              <option value="Listicle">Listicle</option>
              <option value="Guide">Guide</option>
              <option value="Explainer">Explainer</option>
              <option value="Case Study">Case Study</option>
              <option value="Roundup">Roundup</option>
              <option value="Analysis">Analysis</option>
              <option value="Buying Guide">Buying Guide</option>
            </select>
            <button type="submit" className="bg-surface-container-high text-on-background border border-slate-border rounded px-3 py-2 font-ui-body text-sm hover:bg-surface-container-highest transition-colors">
              Filter
            </button>
          </form>
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
                  Type
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
                        <div className="font-ui-body text-on-surface font-medium line-clamp-1" title={article.title}>
                        {article.title}
                      </div>
                      <div className="text-xs text-on-surface-variant truncate max-w-[200px] md:max-w-xs" title={article.slug}>
                        {article.slug}
                      </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-surface-container border border-slate-border text-on-surface-variant px-2 py-1 rounded text-xs">
                        {article.article_type || 'Standard'}
                      </span>
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
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard/articles/${article.id}`}
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center rounded-full hover:bg-surface-container"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[20px] leading-none">edit</span>
                        </Link>
                        <a
                          href={`/articles/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center rounded-full hover:bg-surface-container"
                          title="View Live"
                        >
                          <span className="material-symbols-outlined text-[20px] leading-none">open_in_new</span>
                        </a>
                        <DeleteArticleButton id={article.id} title={article.title} />
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
  } catch (error) {
    console.error('Error fetching articles:', error)
    return (
      <div className="max-w-6xl">
        <div className="bg-error/10 border border-error/20 p-6 rounded text-error">
          <h2 className="font-headline-sm mb-2">Failed to load articles</h2>
          <p className="font-ui-body">
            {error instanceof Error ? error.message : 'An unexpected error occurred while fetching data from the database.'}
          </p>
          <pre className="mt-4 p-4 bg-black/20 rounded font-mono-data text-xs overflow-auto">
            {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    )
  }
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
