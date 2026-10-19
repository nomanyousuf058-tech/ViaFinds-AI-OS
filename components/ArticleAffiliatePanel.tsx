'use client'

import React, { useState } from 'react'

interface AffiliateLink {
  id: string
  network: string
  destinationUrl: string
  shortCode: string
  // The affiliate_links table has no `status` column; this is the persisted
  // verification_status (migration 023). It is never fabricated.
  status: string
  verificationStatus?: string
  createdAt: string
  clickCount: number
  conversionCount: number
  totalCommission: number
}

interface AffiliateState {
  status: 'MISSING' | 'PRESENT'
  link: AffiliateLink | null
  message?: string
  clickCount: number
  conversionCount: number
  totalCommission: number
}

interface Props {
  articleId: string
  articleSlug: string
  initial: AffiliateState
  onSaved?: (state: AffiliateState) => void
}

/**
 * Affiliate panel for the article editor.
 *
 * Shows the current affiliate status (real numbers, never invented), a
 * "no link" state, and a form to persist a manual link. The save result is
 * reconciled against the server row so the UI cannot drift from the DB.
 */
export default function ArticleAffiliatePanel({ articleId, articleSlug, initial, onSaved }: Props) {
  const [state, setState] = useState<AffiliateState>(initial)
  const [url, setUrl] = useState('')
  const [cta, setCta] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const hasLink = state.status === 'PRESENT' && state.link

  async function saveManualLink() {
    if (!url.trim()) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateUrl: url.trim(), ctaText: cta.trim() || undefined }),
      })
      const json = await res.json()
      if (!json.success) {
        if (json.code === 'NOT_FOUND') {
          setError('The destination URL could not be verified. The article is unchanged.')
        } else if (json.code === 'UNVERIFIED') {
          setNotice('Link saved but not verified. Verification status is shown separately from the saved status.')
          await refresh()
        } else {
          setError(json.error || 'Could not save the affiliate link.')
        }
        return
      }
      await refresh()
      setUrl('')
      setCta('')
    } catch {
      setError('Could not save the affiliate link. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function refresh() {
    try {
      const res = await fetch(`/api/articles/${articleId}/detail`)
      const json = await res.json()
      if (json.success && json.affiliate) {
        const next: AffiliateState = json.affiliate.status === 'MISSING'
          ? {
              status: 'MISSING',
              link: null,
              message: json.affiliate.message,
              clickCount: json.affiliate.clickCount ?? 0,
              conversionCount: json.affiliate.conversionCount ?? 0,
              totalCommission: json.affiliate.totalCommission ?? 0,
            }
          : {
              status: 'PRESENT',
              link: {
                id: json.affiliate.id,
                network: json.affiliate.network,
                destinationUrl: json.affiliate.destinationUrl,
                shortCode: json.affiliate.shortCode,
                status: json.affiliate.status,
                createdAt: json.affiliate.createdAt,
                clickCount: json.affiliate.clickCount ?? 0,
                conversionCount: json.affiliate.conversionCount ?? 0,
                totalCommission: json.affiliate.totalCommission ?? 0,
              },
              clickCount: json.affiliate.clickCount ?? 0,
              conversionCount: json.affiliate.conversionCount ?? 0,
              totalCommission: json.affiliate.totalCommission ?? 0,
            }
        setState(next)
        onSaved?.(next)
      }
    } catch {
      // Non-blocking refresh.
    }
  }

  return (
    <section className="bg-surface-container border border-slate-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline-lg text-lg text-on-background">Affiliate Link</h2>
        <span
          className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
            hasLink ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'
          }`}
        >
          {hasLink ? 'Linked' : 'No link'}
        </span>
      </div>

      {hasLink ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase">Network</p>
              <p className="text-on-background font-medium">{state.link!.network || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase">Status</p>
              <p className="text-on-background font-medium">
                {state.link!.verificationStatus
                  ? state.link!.verificationStatus.replace(/_/g, ' ').toLowerCase()
                  : 'unknown'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase">Destination</p>
            <a
              href={state.link!.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs break-all hover:underline"
            >
              {state.link!.destinationUrl}
            </a>
          </div>
          {state.link!.shortCode && (
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase">Short code</p>
              <p className="text-on-background font-mono-data text-xs">/go/{state.link!.shortCode}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-border">
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase">Clicks</p>
              <p className="text-on-background font-mono-data">{state.clickCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase">Conversions</p>
              <p className="text-on-background font-mono-data">{state.conversionCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase">Commission</p>
              <p className="text-on-background font-mono-data">${(state.totalCommission || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-on-surface-variant mb-3">
            {state.message || 'No affiliate link is associated with this article.'}
          </p>
          <div className="space-y-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-sm text-on-background focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="CTA text (optional)"
              className="w-full bg-surface-container-low border border-slate-border rounded px-3 py-2 text-sm text-on-background focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={saveManualLink}
              disabled={saving || !url.trim()}
              className="px-4 py-2 bg-primary text-deep-navy font-bold text-xs uppercase rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save affiliate link'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      )}
      {notice && (
        <p className="text-xs text-amber-400 mt-3">{notice}</p>
      )}
    </section>
  )
}