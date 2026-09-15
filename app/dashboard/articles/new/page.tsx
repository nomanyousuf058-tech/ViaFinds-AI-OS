'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ArticleEditor from '@/components/ArticleEditor'

const ARTICLE_TYPES = [
  'Standard', 'Comparison', 'News', 'Feature', 'Opinion', 
  'Investigative', 'Review', 'How-To', 'Listicle', 'Guide', 
  'Explainer', 'Case Study', 'Roundup', 'Analysis', 'Buying Guide'
]

export default function NewArticlePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    article_type: 'Standard',
    excerpt: '',
    content: '[]',
    cover_image_url: '',
    status: 'draft',
    reading_time: '',
    seo_title: '',
    seo_description: '',
    geo_intent: '',
    aeo_answer: '',
  })

  const [isUploading, setIsUploading] = useState(false)

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and WEBP are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCoverImagePreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.url) {
        setForm(prev => ({ ...prev, cover_image_url: data.url }))
        setError(null)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const saveArticle = async (statusOverride?: string) => {
    if (isUploading) {
      setError('Please wait for the image upload to finish before saving.')
      return
    }
    setSaving(true)
    setError(null)

    const payloadStatus = statusOverride || form.status
    
    let parsedContent = []
    try {
      parsedContent = JSON.parse(form.content)
    } catch {
      parsedContent = []
    }

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          content: parsedContent,
          status: payloadStatus,
          reading_time: form.reading_time ? Number(form.reading_time) : null,
          seo: {
            metaTitle: form.seo_title,
            metaDescription: form.seo_description,
          },
          geo: {
            intent: form.geo_intent
          },
          aeo: {
            answer: form.aeo_answer
          }
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
      setSaving(false)
    }
  }

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const applyTemplate = () => {
    if (form.content !== '[]' && !confirm('This will overwrite your current content. Proceed?')) {
      return
    }

    const type = form.article_type
    const generateId = () => Math.random().toString(36).substring(2, 11)
    
    let blocks: Record<string, unknown>[] = []
    
    if (type === 'Review') {
      blocks = [
        { id: generateId(), type: 'heading', level: 2, content: 'Overview' },
        { id: generateId(), type: 'paragraph', content: 'Introduce the product and its primary purpose here.', links: [] },
        { id: generateId(), type: 'heading', level: 2, content: 'Key Features' },
        { id: generateId(), type: 'bullet-list', items: [{ id: generateId(), content: 'Feature 1', links: [] }] },
        { id: generateId(), type: 'heading', level: 2, content: 'Pros & Cons' },
        { id: generateId(), type: 'paragraph', content: 'List the advantages and disadvantages.', links: [] },
        { id: generateId(), type: 'heading', level: 2, content: 'Final Verdict' },
        { id: generateId(), type: 'paragraph', content: 'Summarize if it is worth buying.', links: [] },
      ]
    } else if (type === 'Comparison') {
      blocks = [
        { id: generateId(), type: 'heading', level: 2, content: 'Introduction' },
        { id: generateId(), type: 'paragraph', content: 'Briefly introduce the items being compared.', links: [] },
        { id: generateId(), type: 'heading', level: 2, content: 'Product A Overview' },
        { id: generateId(), type: 'paragraph', content: 'Details about the first product.', links: [] },
        { id: generateId(), type: 'heading', level: 2, content: 'Product B Overview' },
        { id: generateId(), type: 'paragraph', content: 'Details about the second product.', links: [] },
        { id: generateId(), type: 'heading', level: 2, content: 'Key Differences' },
        { id: generateId(), type: 'paragraph', content: 'What sets them apart?', links: [] },
        { id: generateId(), type: 'heading', level: 2, content: 'Verdict: Which should you choose?' },
        { id: generateId(), type: 'paragraph', content: 'Provide a recommendation based on use cases.', links: [] },
      ]
    } else {
      blocks = [
        { id: generateId(), type: 'heading', level: 2, content: 'Introduction' },
        { id: generateId(), type: 'paragraph', content: 'Start writing your article here...', links: [] }
      ]
    }
    
    update('content', JSON.stringify(blocks, null, 2))
  }

  const generateSlug = () => {
    if (form.title && !form.slug) {
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      update('slug', slug)
    }
  }

  return (
    <div className="w-full max-w-[960px] mx-auto space-y-6">
      
      {/* Sticky Top Bar — Publishing Controls */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-slate-border -mx-4 px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-lg text-on-background">New Article</h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="bg-surface-container-low border border-slate-border rounded px-2 py-1.5 font-ui-body text-xs text-on-background focus:outline-none focus:border-primary"
            >
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <button
              type="button"
              onClick={() => saveArticle()}
              disabled={saving}
              className="bg-surface-container-high text-on-background border border-slate-border font-ui-body text-xs font-bold px-4 py-1.5 rounded hover:bg-surface-container-highest transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button
              type="button"
              onClick={() => saveArticle('published')}
              disabled={saving}
              className="font-ui-body text-xs font-bold px-4 py-1.5 rounded transition-colors bg-primary text-deep-navy hover:bg-gold-accent disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 font-ui-body text-sm">
          {error}
        </div>
      )}

      {/* Section: Basics */}
      <section className="bg-surface-container border border-slate-border rounded-lg p-5">
        <div className="space-y-4">
          <div>
            <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              onBlur={generateSlug}
              required
              className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-2.5 font-ui-body text-on-background focus:outline-none focus:border-primary text-lg"
              placeholder="Article title"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1.5">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                required
                className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 font-ui-body text-sm text-on-background focus:outline-none focus:border-primary"
                placeholder="article-slug"
              />
            </div>

            <div>
              <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1.5">
                Article Type
              </label>
              <div className="flex gap-2">
                <select
                  value={form.article_type}
                  onChange={(e) => update('article_type', e.target.value)}
                  className="flex-1 bg-surface-container-low border border-slate-border rounded px-3 py-2 font-ui-body text-sm text-on-background focus:outline-none focus:border-primary"
                >
                  {ARTICLE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyTemplate}
                  className="bg-surface-container-high border border-slate-border px-3 py-2 rounded text-on-background font-ui-body text-sm hover:bg-surface-container-highest transition-colors"
                  title="Apply template for this type"
                >
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1.5">
                Reading Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.reading_time}
                  onChange={(e) => update('reading_time', e.target.value)}
                  className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 font-ui-body text-sm text-on-background focus:outline-none focus:border-primary"
                  placeholder="5"
                />
                <span className="text-xs text-on-surface-variant whitespace-nowrap">min</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1.5">
              Excerpt
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              rows={2}
              className="w-full bg-surface-container-low border border-slate-border rounded px-4 py-2.5 font-ui-body text-sm text-on-background focus:outline-none focus:border-primary resize-none"
              placeholder="Short summary of the article..."
            />
          </div>
        </div>
      </section>

      {/* Section: Cover Image */}
      <section className="bg-surface-container border border-slate-border rounded-lg p-5">
        <div className="flex items-start gap-5">
          <div
            onClick={() => coverInputRef.current?.click()}
            className="w-48 flex-shrink-0 aspect-video border-2 border-dashed border-slate-border rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-surface-container-low overflow-hidden"
          >
            {coverImagePreview || form.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImagePreview || form.cover_image_url}
                alt="Cover preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl">upload</span>
                <p className="text-[10px] text-on-surface-variant/60 mt-1">Cover Image</p>
              </div>
            )}
          </div>
          <div className="flex-1 pt-1">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <p className="text-xs text-on-surface-variant mb-2">
              1200×630px recommended. JPG, PNG, WEBP. Max 5MB.
            </p>
            {form.cover_image_url && (
              <button
                type="button"
                onClick={() => {
                  update('cover_image_url', '')
                  setCoverImagePreview(null)
                }}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Remove image
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section: Content */}
      <section className="bg-surface-container border border-slate-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-lg text-lg text-on-background">Content</h2>
        </div>
        <div className="bg-background border border-slate-border rounded p-4 min-h-[600px]">
          <ArticleEditor
            value={form.content}
            onChange={(val) => update('content', val)}
          />
        </div>
      </section>

      {/* Collapsible: SEO Settings */}
      <details className="bg-surface-container border border-slate-border rounded-lg group">
        <summary className="p-4 cursor-pointer font-headline-lg text-sm text-on-background list-none flex items-center justify-between">
          SEO Settings
          <span className="material-symbols-outlined text-sm transform group-open:rotate-180 transition-transform">expand_more</span>
        </summary>
        <div className="px-4 pb-4 space-y-3 border-t border-slate-border pt-3">
          <div>
            <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Meta Title
            </label>
            <input
              type="text"
              value={form.seo_title}
              onChange={(e) => update('seo_title', e.target.value)}
              className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-sm text-on-background focus:outline-none focus:border-primary"
              placeholder="Optional SEO override..."
            />
          </div>
          <div>
            <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Meta Description
            </label>
            <textarea
              value={form.seo_description}
              onChange={(e) => update('seo_description', e.target.value)}
              rows={2}
              className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-sm text-on-background focus:outline-none focus:border-primary resize-none"
              placeholder="Optional SEO description..."
            />
          </div>
        </div>
      </details>

      {/* Collapsible: GEO & AEO */}
      <details className="bg-surface-container border border-slate-border rounded-lg group">
        <summary className="p-4 cursor-pointer font-headline-lg text-sm text-on-background list-none flex items-center justify-between">
          GEO &amp; AEO Data
          <span className="material-symbols-outlined text-sm transform group-open:rotate-180 transition-transform">expand_more</span>
        </summary>
        <div className="px-4 pb-4 space-y-3 border-t border-slate-border pt-3">
          <div>
            <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Search Intent
            </label>
            <input
              type="text"
              value={form.geo_intent}
              onChange={(e) => update('geo_intent', e.target.value)}
              className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-sm text-on-background focus:outline-none focus:border-primary"
              placeholder="e.g. Informational, Commercial"
            />
          </div>
          <div>
            <label className="block font-label-caps text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
              Key Answer
            </label>
            <textarea
              value={form.aeo_answer}
              onChange={(e) => update('aeo_answer', e.target.value)}
              rows={2}
              className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-sm text-on-background focus:outline-none focus:border-primary resize-none"
              placeholder="Direct AEO answer block..."
            />
          </div>
        </div>
      </details>

    </div>
  )
}
