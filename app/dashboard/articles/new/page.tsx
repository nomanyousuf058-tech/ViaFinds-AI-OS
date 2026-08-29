'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewArticlePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '[]',
    cover_image_url: '',
    status: 'draft',
    featured: false,
    trending: false,
    reading_time: '',
    seo_title: '',
    seo_description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create article')
      }

      const data = await res.json()
      router.push(`/dashboard/articles/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
          <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
              New Article
            </h1>
            <p className="font-ui-body text-ui-body text-on-surface-variant">
              Create a new editorial article.
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
                rows={12}
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
              {saving ? 'Saving...' : 'Save Draft'}
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
