'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ArticleEditor from '@/components/ArticleEditor'
import ArticleAffiliatePanel from '@/components/ArticleAffiliatePanel'

interface ArticleEditorPageProps {
  params: Promise<{ id: string }>
}

const ARTICLE_TYPES = [
  'Standard', 'Comparison', 'News', 'Feature', 'Opinion', 
  'Investigative', 'Review', 'How-To', 'Listicle', 'Guide', 
  'Explainer', 'Case Study', 'Roundup', 'Analysis', 'Buying Guide'
]

export default function ArticleEditorPage({ params }: ArticleEditorPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [error, setError] = useState<string | null>(null)
  const [blockers, setBlockers] = useState<string[]>([])
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [article, setArticle] = useState<Record<string, unknown> | null>(null)
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

  interface AffiliateState {
    status: 'MISSING' | 'PRESENT'
    link: {
      id: string
      network: string
      destinationUrl: string
      shortCode: string
      status: string
      verificationStatus?: string
      createdAt: string
      clickCount: number
      conversionCount: number
      totalCommission: number
    } | null
    message?: string
    clickCount: number
    conversionCount: number
    totalCommission: number
  }
  const [affiliate, setAffiliate] = useState<AffiliateState | null>(null)

  // Detect unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === 'unsaved') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveState])

  const { id } = React.use(params)

  useEffect(() => {
    const fetchArticle = async () => {
      const res = await fetch(`/api/articles/${id}`)
      if (!res.ok) {
        setError('Article not found')
        setLoading(false)
        return
      }
      const data = await res.json()
      const a = data.article
      setArticle(a)
      setForm({
        title: a.title || '',
        slug: a.slug || '',
        article_type: a.article_type || 'Standard',
        excerpt: a.excerpt || '',
        content: JSON.stringify(a.content || [], null, 2),
        cover_image_url: a.cover_image_url || '',
        status: a.status || 'draft',
        reading_time: a.reading_time?.toString() || '',
        seo_title: ((a.seo as Record<string, string> | null)?.metaTitle) || '',
        seo_description: ((a.seo as Record<string, string> | null)?.metaDescription) || '',
        geo_intent: ((a.geo as Record<string, string> | null)?.intent) || '',
        aeo_answer: ((a.aeo as Record<string, string> | null)?.answer) || '',
      })
      if (a.cover_image_url) {
        setCoverImagePreview(a.cover_image_url)
      }
      // Load affiliate status separately so a failure here never blocks
      // the editor from opening.
      try {
        const detailRes = await fetch(`/api/articles/${id}/detail`)
        const detailJson = await detailRes.json()
        if (detailJson.success && detailJson.affiliate) {
          const link = detailJson.affiliate
          setAffiliate({
            status: link.status === 'MISSING' ? 'MISSING' : 'PRESENT',
            link: link.status === 'MISSING' ? null : {
              id: link.id,
              network: link.network,
              destinationUrl: link.destinationUrl,
              shortCode: link.shortCode,
              status: link.status,
              verificationStatus: link.verificationStatus,
              createdAt: link.createdAt,
              clickCount: link.clickCount ?? 0,
              conversionCount: link.conversionCount ?? 0,
              totalCommission: link.totalCommission ?? 0,
            },
            message: link.message,
            clickCount: link.clickCount ?? 0,
            conversionCount: link.conversionCount ?? 0,
            totalCommission: link.totalCommission ?? 0,
          })
        }
      } catch {
        // Non-blocking: the editor still opens without affiliate data.
      }
      setLoading(false)
      setSaveState('saved')
    }
    fetchArticle()
  }, [id])
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
        setSaveState('unsaved')
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
    if (!article) return
    if (isUploading) {
      setError('Please wait for the image upload to finish before saving.')
      return
    }
    
    setSaving(true)
    setSaveState('saving')
    setError(null)
    setBlockers([])

    const payloadStatus = statusOverride || form.status
    // Only signal publishAction when the user explicitly clicks the Publish
    // button (statusOverride === 'published'). A plain Save never triggers
    // the publication readiness gate, even if the dropdown says "published".
    const isPublishAction = statusOverride === 'published'
    
    // Auto-generate some JSON if content string is empty (failsafe)
    let parsedContent = []
    try {
      parsedContent = JSON.parse(form.content)
    } catch {
      parsedContent = []
    }

    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          content: parsedContent,
          status: payloadStatus,
          publishAction: isPublishAction,
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

      const data = await res.json()

      if (!res.ok) {
        if (Array.isArray(data.blockers) && data.blockers.length > 0) {
          setBlockers(data.blockers)
        }
        // If the server saved content but blocked publication, acknowledge
        // the partial success — the user's work is not lost.
        if (data.contentSaved && data.article) {
          setArticle(prev => prev ? { ...prev, ...data.article } : null)
          setSaveState('saved')
          setError(data.error || 'Publication blocked, but your content was saved.')
          return
        }
        throw new Error(data.error || 'Failed to save article')
      }

      setArticle(prev => prev ? { ...prev, ...data.article || {}, status: payloadStatus } : null)
      setForm(prev => ({ ...prev, status: payloadStatus }))
      setSaveState('saved')
      setError(null)
      setBlockers([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSaveState('unsaved')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!article) return
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete article')
      }
      setSaveState('saved') // Prevent unsaved changes dialog
      router.push('/dashboard/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSaving(false)
      setShowDeleteConfirm(false)
    }
  }

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveState('unsaved')
  }

  const applyTemplate = () => {
    // Generate a basic template based on article type if content is empty or user agrees
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
    <div className="w-full max-w-[960px] mx-auto space-y-6">
      
      {/* Sticky Top Bar — Publishing Controls */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-slate-border -mx-4 px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Save & Publication State */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Real Persisted Database Status */}
            {article?.status === 'published' ? (
              <span
                className="inline-flex items-center gap-1 font-mono-data text-xs font-bold px-2.5 py-1 rounded-full bg-green-600/20 text-green-400 border border-green-500/30"
                title="Persisted database status: Published"
              >
                <span className="material-symbols-outlined text-xs">public</span>
                Published (Live)
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 font-mono-data text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30"
                title={`Persisted database status: ${article?.status || 'draft'}`}
              >
                <span className="material-symbols-outlined text-xs">edit_note</span>
                {typeof article?.status === 'string'
                  ? article.status.charAt(0).toUpperCase() + article.status.slice(1).replace('_', ' ')
                  : 'Draft'}
              </span>
            )}

            {/* Save state badge */}
            <span className={`inline-flex items-center gap-1.5 font-mono-data text-xs font-bold px-2.5 py-1 rounded-full ${
              saveState === 'saved' ? 'bg-green-500/15 text-green-400' : 
              saveState === 'unsaved' ? 'bg-amber-500/15 text-amber-400' : 
              'bg-blue-500/15 text-blue-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                saveState === 'saved' ? 'bg-green-400' : saveState === 'unsaved' ? 'bg-amber-400' : 'bg-blue-400 animate-pulse'
              }`} />
              {saveState === 'saved' ? 'Saved' : saveState === 'unsaved' ? 'Unsaved' : 'Saving...'}
            </span>

            {/* Unsaved Status Selection Notice */}
            {form.status !== article?.status && (
              <span className="inline-flex items-center gap-1 font-mono-data text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <span className="material-symbols-outlined text-[12px]">sync_alt</span>
                Status pending: {String(article?.status || 'draft')} &rarr; {form.status}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 h-8">
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="h-full bg-surface-container-low border border-slate-border rounded px-2 font-ui-body text-xs text-on-background focus:outline-none focus:border-primary"
              title="Select workflow status for article"
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
              className="h-full inline-flex items-center justify-center bg-surface-container-high text-on-background border border-slate-border font-ui-body text-xs font-bold px-4 rounded hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              title="Save current article content and status selection"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <a
              href={`/articles/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-full inline-flex items-center justify-center bg-surface-container-high text-on-background border border-slate-border font-ui-body text-xs font-bold px-4 rounded hover:bg-surface-container-highest transition-colors"
              title={article?.status === 'published' ? 'View live published article' : 'Preview draft article'}
            >
              Preview
            </a>

            <button
              type="button"
              onClick={() => saveArticle('published')}
              disabled={saving || (article?.status === 'published' && form.status === 'published' && saveState === 'saved')}
              className={`h-full inline-flex items-center justify-center font-ui-body text-xs font-bold px-4 rounded transition-colors ${
                article?.status === 'published' && form.status === 'published' && saveState === 'saved'
                  ? 'bg-green-600/30 text-green-300/60 cursor-not-allowed' 
                  : 'bg-primary text-deep-navy hover:bg-gold-accent'
              }`}
              title={article?.status === 'published' ? 'Article is currently published' : 'Evaluate publication gate and publish article'}
            >
              {article?.status === 'published' && form.status === 'published' && saveState === 'saved'
                ? 'Published'
                : article?.status === 'published'
                  ? 'Update Live'
                  : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-300 font-ui-body text-sm space-y-2">
          <div className="flex items-start gap-2 font-bold text-red-200">
            <span className="material-symbols-outlined text-base mt-0.5">error</span>
            <div>
              <span>{error}</span>
              {article?.status === 'published' && (
                <p className="text-xs font-normal text-red-300/80 mt-0.5">
                  The article is currently marked as published in the database, but updates cannot be saved with status &ldquo;published&rdquo; while publication gate requirements remain unmet.
                </p>
              )}
            </div>
          </div>
          {blockers.length > 0 && (
            <div className="mt-2.5 pl-6 border-t border-red-500/20 pt-2.5">
              <p className="text-xs text-red-300/90 font-semibold uppercase tracking-wider mb-1.5">
                Specific blockers preventing publication (must resolve to publish):
              </p>
              <ul className="list-disc space-y-1 text-xs text-red-200/90">
                {blockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Section: Basics — compact row */}
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

      {/* Section: Cover Image — compact inline */}
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

      {/* Section: Content — FULL WIDTH, maximum space */}
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


      {/* Affiliate panel — persists manual links to the article */}
      {affiliate ? (
        <ArticleAffiliatePanel
          articleId={id}
          articleSlug={form.slug}
          initial={affiliate}
          onSaved={setAffiliate}
        />
      ) : null}

    </div>
  )
}