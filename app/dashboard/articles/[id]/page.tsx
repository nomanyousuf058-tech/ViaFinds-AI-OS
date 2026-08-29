'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ArticleEditorPageProps {
  params: Promise<{ id: string }>
}

export default function ArticleEditorPage({ params }: ArticleEditorPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [article, setArticle] = useState<{
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: unknown
    status: string
    cover_image_url: string | null
    reading_time: number | null
    published_at: string | null
    created_at: string
    updated_at: string | null
    seo: unknown
  } | null>(null)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '[]',
    cover_image_url: '',
    status: 'draft',
    reading_time: '',
    seo_title: '',
    seo_description: '',
  })

  useEffect(() => {
    params.then(async (resolved) => {
      const res = await fetch(`/api/articles/${resolved.id}`)
      if (!res.ok) {
        setError('Article not found')
        setLoading(false)
        return
      }
      const data = await res.json()
      const a = data.article
      setArticle(a)
      setForm({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt || '',
        content: JSON.stringify(a.content || [], null, 2),
        cover_image_url: a.cover_image_url || '',
        status: a.status,
        reading_time: a.reading_time?.toString() || '',
        seo_title: (a.seo as { metaTitle?: string } | null)?.metaTitle || '',
        seo_description: (a.seo as { metaDescription?: string } | null)?.metaDescription || '',
      })
      setLoading(false)
    })
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!article) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reading_time: form.reading_time ? Number(form.reading_time) : null,
          seo: {
            metaTitle: form.seo_title,
            metaDescription: form.seo_description,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update article')
      }

      router.push('/dashboard/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
              <div className="flex items-center justify-center min-h-[400px]">
          <div className="font-ui-body text-ui-body text-on-surface-variant">Loading article...</div>
        </div>
          )
  }

  if (!article) {
    return (
              <div className="flex items-center justify-center min-h-[400px]">
          <div className="font-ui-body text-ui-body text-on-surface-variant">Article not found.</div>
        </div>
          )
  }

  return (
          <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
              Edit Article
            </h1>
            <p className="font-ui-body text-ui-body text-on-surface-variant">
              {article.slug}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 font-ui-body text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                required
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="Article title"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                required
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="article-slug"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => update('excerpt', e.target.value)}
                rows={3}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="Short summary of the article"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Content (JSON)
              </label>
              <textarea
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
                rows={16}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-mono-data text-mono-data text-on-background text-sm focus:outline-none focus:border-primary"
                placeholder='[{"_type":"block","children":[{"_type":"span","text":"Your paragraph..."}]}]'
              />
              <p className="mt-2 font-body text-xs text-on-surface-variant">
                Enter article content as JSON array of blocks.
              </p>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Cover Image URL
              </label>
              <input
                type="text"
                value={form.cover_image_url}
                onChange={(e) => update('cover_image_url', e.target.value)}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                Reading Time (minutes)
              </label>
              <input
                type="number"
                value={form.reading_time}
                onChange={(e) => update('reading_time', e.target.value)}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="5"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                SEO Title
              </label>
              <input
                type="text"
                value={form.seo_title}
                onChange={(e) => update('seo_title', e.target.value)}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="SEO title"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mb-2">
                SEO Description
              </label>
              <input
                type="text"
                value={form.seo_description}
                onChange={(e) => update('seo_description', e.target.value)}
                className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 font-ui-body text-ui-body text-on-background focus:outline-none focus:border-primary"
                placeholder="SEO description"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-border">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-deep-navy font-ui-body text-ui-body font-bold uppercase tracking-wider px-8 py-3 hover:bg-gold-accent transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Article'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-slate-border text-on-surface-variant font-ui-body text-ui-body px-6 py-3 hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      )
}
