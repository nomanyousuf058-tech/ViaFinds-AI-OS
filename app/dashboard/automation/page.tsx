'use client'

import React, { useEffect, useState } from 'react'

const MANUAL_STAGES = [
  { id: 'discovered', label: 'Checking Product' },
  { id: 'researching', label: 'Product Research' },
  { id: 'competitor_analysis', label: 'Competitor Analysis' },
  { id: 'content_generating', label: 'Writing Article' },
  { id: 'content_refining', label: 'Refining Content' },
  { id: 'eeat_analysis', label: 'E-E-A-T Testing' },
  { id: 'seo_analysis', label: 'SEO / GEO / AEO' },
  { id: 'quality_gate', label: 'Quality Gate' },
  { id: 'publishing', label: 'Publishing to CMS' },
]

const AUTO_STAGES = [
  { id: 'discovered', label: 'Finding Best Product' },
  { id: 'researching', label: 'Product Research' },
  { id: 'competitor_analysis', label: 'Competitor Analysis' },
  { id: 'content_generating', label: 'Writing Article' },
  { id: 'content_refining', label: 'Refining Content' },
  { id: 'eeat_analysis', label: 'E-E-A-T Testing' },
  { id: 'seo_analysis', label: 'SEO / GEO / AEO' },
  { id: 'quality_gate', label: 'Quality Gate' },
  { id: 'publishing', label: 'Publishing to CMS' },
]

const PARTNERS = [
  { id: 'digistore24', name: 'Digistore24', icon: '🏪' },
]

type Mode = 'opportunities' | 'manual' | 'auto'

interface OpportunityItem {
  id: string
  productName: string
  vendorName: string | null
  vendorWebsite: string | null
  salesPageUrl: string | null
  source: string
  sourceEvidence: string
  lastVerifiedAt: string
  digistore24Status: 'VERIFIED' | 'NOT_FOUND' | 'API_UNAVAILABLE' | 'NEEDS_MANUAL_CHECK'
  digistore24ProductId: string | null
  affiliateInstructions: string | null
  price: string | null
  commission: string | null
  viafindsFitReasoning: string
  category: string | null
  status: 'active' | 'archived' | 'rejected'
}

interface VerificationResult {
  level: 'UNVERIFIED' | 'FORMAT_VALID' | 'REDIRECT_VALID' | 'PRODUCT_VERIFIED' | 'AFFILIATE_CONFIRMED'
  formatValid: boolean
  redirectValid: boolean | null
  redirectStatus: number | null
  redirectDestination: string | null
  productVerified: boolean | null
  affiliateConfirmed: boolean
  errors: string[]
  warnings: string[]
  checkedAt: string
}

interface CustomerPreview {
  buttonText: string
  targetUrl: string
  rel: string
  target: string
  isVerified: boolean
  productName: string
  vendorName: string
  priceInfo: string | null
  affiliateDisclosure: string
  previewHtml: string
}

interface ReadinessResult {
  ready: boolean
  blockers: string[]
  checks: {
    hasVerifiedProduct: boolean
    hasAffiliateLink: boolean
    linkVerificationLevel: string
    linkIsAffiliateConfirmed: boolean
    hasRequiredImages: boolean
    articlePassedQualityGate: boolean
    ownerApproved: boolean
    noDegradedContent: boolean
    noFakeClaims: boolean
  }
}

export default function AutomationPage() {
  const [mode, setMode] = useState<Mode>('opportunities')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Opportunities state
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([])
  const [oppsLoading, setOppsLoading] = useState(false)
  const [oppsError, setOppsError] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Manual mode state
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem | null>(null)
  const [affiliateUrl, setAffiliateUrl] = useState('')
  const [ctaText, setCtaText] = useState('Check Official Price')
  const [ownerAffiliateId, setOwnerAffiliateId] = useState('')
  const [isVerifyingLink, setIsVerifyingLink] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [ctaPreview, setCtaPreview] = useState<CustomerPreview | null>(null)
  const [readinessResult, setReadinessResult] = useState<ReadinessResult | null>(null)
  const [verifiedLinkId, setVerifiedLinkId] = useState<string | null>(null)

  // Auto mode state
  const [selectedPartner, setSelectedPartner] = useState('digistore24')

  // Fetch opportunities from API
  const fetchOpportunities = async () => {
    setOppsLoading(true)
    setOppsError(null)
    setAuthError(false)
    try {
      const res = await fetch('/api/affiliate/opportunities')
      if (res.status === 401) {
        setAuthError(true)
        setOppsError('Admin authorization required. Please log in as an administrator.')
        return
      }
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setOpportunities(data.data)
      } else {
        setOpportunities([])
      }
    } catch (err) {
      setOppsError(err instanceof Error ? err.message : 'Failed to load affiliate opportunities')
    } finally {
      setOppsLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchJob = async (id: string) => {
    try {
      const res = await fetch('/api/automation/jobs')
      const json = await res.json()
      if (json.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const found = json.data.jobs.find((j: any) => j.id === id)
        if (found) setJob(found)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!activeJobId) return
    fetchJob(activeJobId)
    const interval = setInterval(() => fetchJob(activeJobId), 3000)
    return () => clearInterval(interval)
  }, [activeJobId])

  // Select opportunity and switch to verification tab
  const handleSelectOpportunity = (opp: OpportunityItem) => {
    setSelectedOpportunity(opp)
    setMode('manual')
    setVerificationResult(null)
    setCtaPreview(null)
    setReadinessResult(null)
    setVerifyError(null)
  }

  // Verify pasted affiliate URL
  const handleVerifyAffiliateLink = async () => {
    if (!affiliateUrl.trim()) return
    setIsVerifyingLink(true)
    setVerifyError(null)
    setVerificationResult(null)
    setCtaPreview(null)
    setReadinessResult(null)

    try {
      const verifyRes = await fetch('/api/affiliate/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliateUrl: affiliateUrl.trim(),
          productOpportunityId: selectedOpportunity?.id || null,
          ctaText: ctaText.trim() || 'Check Official Price',
          ownerAffiliateId: ownerAffiliateId.trim() || undefined,
        }),
      })

      if (verifyRes.status === 401) {
        setVerifyError('Unauthorized. Admin credentials required to verify affiliate links.')
        return
      }

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.success) {
        setVerifyError(verifyData.error || 'Failed to verify affiliate URL format or redirection.')
        return
      }

      const linkData = verifyData.data.link
      setVerifiedLinkId(linkData.id)
      setVerificationResult(linkData.verification)
      setCtaPreview(verifyData.data.preview)

      // Next evaluate publication readiness gate
      const checkRes = await fetch('/api/affiliate/publish-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: linkData.id,
          productOpportunityId: selectedOpportunity?.id || null,
          coverImageUrl: 'https://placehold.co/1200x630/2c3e50/ffffff.png?text=Product+Cover',
          qualityStatus: 'PASS',
          ownerApproved: linkData.ownerApproved,
        }),
      })

      if (checkRes.ok) {
        const checkData = await checkRes.json()
        if (checkData.success) {
          setReadinessResult(checkData.data)
        }
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Network error during verification.')
    } finally {
      setIsVerifyingLink(false)
    }
  }

  const handleRunManual = async () => {
    if (!affiliateUrl.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual_affiliate',
          mode: 'manual',
          affiliateUrl: affiliateUrl.trim(),
          opportunityId: selectedOpportunity?.id || undefined,
          linkId: verifiedLinkId || undefined,
        }),
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        setActiveJobId(json.data.id)
        setJob(json.data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleRunAuto = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'auto_partner', mode: 'auto', partnerName: selectedPartner }),
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        setActiveJobId(json.data.id)
        setJob(json.data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setActiveJobId(null)
    setJob(null)
    setAffiliateUrl('')
    setVerificationResult(null)
    setCtaPreview(null)
    setReadinessResult(null)
    setVerifiedLinkId(null)
  }

  const stages = mode === 'manual' ? MANUAL_STAGES : AUTO_STAGES

  const filteredOpportunities = opportunities.filter((opp) => {
    if (categoryFilter === 'all') return true
    return opp.category?.toLowerCase() === categoryFilter.toLowerCase()
  })

  const categories = ['all', ...Array.from(new Set(opportunities.map((o) => o.category).filter(Boolean)))]

  const renderProgress = () => {
    if (!job) return null
    const currentStageIdx = stages.findIndex((s) => s.id === job.currentStage)
    const isCompleted = job.status === 'completed'
    const isFailed = job.status === 'failed'

    return (
      <div className="bg-obsidian-deep border border-slate-border rounded p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Workflow Progress</h3>
          {isCompleted && <span className="text-green-400 text-xs font-bold uppercase">✓ Done</span>}
          {isFailed && <span className="text-red-400 text-xs font-bold uppercase">✕ Failed</span>}
        </div>
        <ul className="space-y-3">
          {stages.map((stage, idx) => {
            const completed = idx < currentStageIdx || isCompleted
            const current = stage.id === job.currentStage && !isCompleted && !isFailed
            const failed = isFailed && stage.id === job.currentStage

            return (
              <li key={stage.id} className="flex items-center gap-3">
                {completed ? (
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">✓</span>
                ) : current ? (
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </span>
                ) : failed ? (
                  <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs">✕</span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-700/30 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                  </span>
                )}
                <span className={`font-ui-body text-sm ${current ? 'text-on-background font-medium' : completed ? 'text-on-surface-variant' : failed ? 'text-red-400' : 'text-slate-500'}`}>
                  {stage.label}
                </span>
              </li>
            )
          })}
        </ul>

        {job.status === 'running' && (
          <div className="mt-5 pt-4 border-t border-slate-border/50">
            <p className="font-mono-data text-xs text-primary animate-pulse">
              {job.auditLog?.[job.auditLog.length - 1]?.details || 'Processing...'}
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderWorkspace = () => {
    if (!job) {
      return (
        <div className="flex flex-col items-center justify-center h-80 border border-dashed border-slate-border rounded-lg bg-obsidian-deep/50 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">smart_toy</span>
          <p className="font-ui-body text-on-surface-variant mb-2">No active workflow.</p>
          <p className="font-mono-data text-xs text-slate-500">
            {mode === 'manual' ? 'Paste an affiliate link and click Run to start.' : 'Select a partner and click Run to start.'}
          </p>
        </div>
      )
    }

    if (job.error) {
      return (
        <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            <h3 className="font-headline-lg text-lg font-bold">Workflow Blocked / Error</h3>
          </div>
          <p className="font-mono-data text-sm mb-4">{job.error}</p>
          <button onClick={handleReset} className="px-5 py-2 bg-surface-container rounded hover:bg-surface-container/80 transition-colors text-sm text-on-background">
            Start New Workflow
          </button>
        </div>
      )
    }

    const { result } = job

    if (job.status === 'running') {
      return (
        <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
            </div>
            <div>
              <h2 className="font-headline-lg text-lg text-on-background font-bold">Processing...</h2>
              <p className="font-mono-data text-xs text-on-surface-variant">
                {job.auditLog?.[job.auditLog.length - 1]?.details || 'Working on your article...'}
              </p>
            </div>
          </div>

          {result?.selectedProduct && (
            <div className="p-4 bg-surface-container/30 rounded border border-slate-border mb-4">
              <h3 className="font-ui-body text-on-background font-medium mb-2">
                {mode === 'auto' ? 'Best Product Found' : 'Product Detected'}
              </h3>
              <p className="font-mono-data text-sm text-on-surface-variant">
                <strong>{result.selectedProduct.name}</strong>
                {result.selectedProduct.commissionRate && ` — ${result.selectedProduct.commissionRate}% commission`}
              </p>
            </div>
          )}

          {job.auditLog && job.auditLog.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {job.auditLog.slice(-8).map((entry: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 font-mono-data shrink-0">{entry.stage}</span>
                  <span className="text-on-surface-variant font-mono-data">{entry.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (job.status === 'completed') {
      return (
        <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
            </div>
            <div>
              <h2 className="font-headline-lg text-xl text-on-background font-bold">Article Published!</h2>
              <p className="font-mono-data text-xs text-green-400">Successfully published to the Article CMS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {result?.draft?.title && (
              <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Title</p>
                <p className="font-ui-body text-on-background font-medium">{result.draft.title}</p>
              </div>
            )}
            {result?.publishedUrl && (
              <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Slug</p>
                <p className="font-mono-data text-primary text-sm">/articles/{result.publishedUrl}</p>
              </div>
            )}
          </div>

          <div className="flex gap-4 border-t border-slate-border pt-5">
            <button onClick={handleReset} className="px-6 py-2.5 bg-primary text-deep-navy font-medium rounded hover:bg-primary/90 transition-colors">
              Start New Workflow
            </button>
            {result?.articleId && (
              <a href={`/dashboard/articles/${result.articleId}`} className="px-6 py-2.5 bg-surface-container border border-slate-border text-on-background font-medium rounded hover:bg-surface-container-high transition-colors">
                View in CMS
              </a>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
        <p className="font-ui-body text-on-surface-variant">
          Status: {job.status} — {job.auditLog?.[job.auditLog.length - 1]?.details || 'Waiting...'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">AFFILIATE AUTOMATION & DISCOVERY</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant">
          Research verified digital products, submit manual affiliate promo links with redirection & attribution validation, inspect customer CTA button previews, and run fail-closed content generation.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex mb-8 border-b border-slate-border">
        <button
          onClick={() => { setMode('opportunities'); if (!activeJobId) setJob(null) }}
          className={`px-6 py-3 font-ui-body text-sm font-medium uppercase tracking-wider transition-colors relative ${
            mode === 'opportunities'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-background'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">travel_explore</span>
            Opportunities ({opportunities.length})
          </span>
          {mode === 'opportunities' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => { setMode('manual'); if (!activeJobId) setJob(null) }}
          className={`px-6 py-3 font-ui-body text-sm font-medium uppercase tracking-wider transition-colors relative ${
            mode === 'manual'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-background'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">verified_user</span>
            Link Verification & CTA Preview
          </span>
          {mode === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => { setMode('auto'); if (!activeJobId) setJob(null) }}
          className={`px-6 py-3 font-ui-body text-sm font-medium uppercase tracking-wider transition-colors relative ${
            mode === 'auto'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-background'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            Auto Mode
          </span>
          {mode === 'auto' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {/* Main Content Area */}
      {!activeJobId && (
        <div className="mb-8">
          {/* TAB 1: OPPORTUNITIES BROWSER */}
          {mode === 'opportunities' && (
            <div className="space-y-6">
              {/* Category Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-obsidian-deep border border-slate-border rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-data text-xs text-on-surface-variant uppercase mr-2">Category:</span>
                  {categories.map((cat) => (
                    <button
                      key={cat || 'all'}
                      onClick={() => setCategoryFilter(cat || 'all')}
                      className={`px-3 py-1.5 rounded text-xs font-mono-data uppercase transition-colors ${
                        categoryFilter === (cat || 'all')
                          ? 'bg-primary text-deep-navy font-bold'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchOpportunities}
                  disabled={oppsLoading}
                  className="px-3 py-1.5 text-xs font-mono-data border border-slate-border rounded hover:bg-surface-container transition-colors text-on-surface-variant flex items-center gap-1.5"
                >
                  <span className={`material-symbols-outlined text-sm ${oppsLoading ? 'animate-spin' : ''}`}>sync</span>
                  Refresh
                </button>
              </div>

              {/* Auth error notification */}
              {authError && (
                <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg text-red-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 mt-0.5">lock</span>
                  <div>
                    <h4 className="font-bold text-sm">Admin Authentication Required</h4>
                    <p className="text-xs text-red-300 mt-1">
                      Endpoint <code className="bg-red-900/60 px-1 py-0.5 rounded">/api/affiliate/opportunities</code> requires admin credentials.
                      Please sign in via the admin login to view and verify affiliate product opportunities.
                    </p>
                  </div>
                </div>
              )}

              {/* Generic error */}
              {oppsError && !authError && (
                <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-lg text-amber-200 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-400">warning</span>
                  <p className="text-sm">{oppsError}</p>
                </div>
              )}

              {/* Loading indicator */}
              {oppsLoading && (
                <div className="flex items-center justify-center p-12 bg-obsidian-deep border border-slate-border rounded-lg text-on-surface-variant">
                  <span className="material-symbols-outlined text-2xl animate-spin mr-3 text-primary">progress_activity</span>
                  <span className="font-ui-body text-sm">Loading verified opportunities...</span>
                </div>
              )}

              {/* Opportunities Grid */}
              {!oppsLoading && filteredOpportunities.length === 0 && !oppsError && (
                <div className="p-12 text-center bg-obsidian-deep border border-dashed border-slate-border rounded-lg text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">folder_off</span>
                  <p className="text-sm">No product opportunities found in this category.</p>
                </div>
              )}

              {!oppsLoading && filteredOpportunities.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredOpportunities.map((opp) => {
                    const isManualCheck = opp.digistore24Status === 'NEEDS_MANUAL_CHECK'
                    const isVerified = opp.digistore24Status === 'VERIFIED'

                    return (
                      <div
                        key={opp.id}
                        className={`bg-obsidian-deep border rounded-lg p-6 flex flex-col justify-between transition-all ${
                          selectedOpportunity?.id === opp.id
                            ? 'border-primary ring-1 ring-primary'
                            : 'border-slate-border hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Top tags & status */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <span className="px-2.5 py-1 bg-surface-container rounded text-xs font-mono-data text-primary">
                              {opp.category || 'Digital SaaS'}
                            </span>
                            {/* Verification status badge */}
                            {isManualCheck ? (
                              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-mono-data font-bold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">help</span>
                                NEEDS MANUAL CHECK
                              </span>
                            ) : isVerified ? (
                              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono-data font-bold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                MARKETPLACE VERIFIED
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded text-xs font-mono-data">
                                {opp.digistore24Status}
                              </span>
                            )}
                          </div>

                          {/* Product & Vendor Name */}
                          <h3 className="font-headline-lg text-lg font-bold text-on-background mb-1">
                            {opp.productName}
                          </h3>
                          <p className="font-mono-data text-xs text-on-surface-variant mb-4">
                            Vendor: <strong className="text-on-background">{opp.vendorName || 'Independent Vendor'}</strong>
                          </p>

                          {/* Unresolved info alert for NEEDS_MANUAL_CHECK */}
                          {isManualCheck && (
                            <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded mb-4 text-xs text-amber-200/90 leading-relaxed">
                              <strong>Marketplace Note:</strong> No active Digistore24 product ID is currently configured for this product. Having a public vendor site does <em>not</em> imply it is listed on your Digistore24 affiliate account. Obtain a genuine promo link from the vendor portal or Digistore24 marketplace.
                            </div>
                          )}

                          {/* Pricing & Commission */}
                          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-surface-container/30 rounded border border-slate-border/50 text-xs">
                            <div>
                              <span className="font-mono-data text-slate-400 block uppercase text-[10px]">Price</span>
                              <span className="font-bold text-on-background">{opp.price || 'See Vendor Page'}</span>
                            </div>
                            <div>
                              <span className="font-mono-data text-slate-400 block uppercase text-[10px]">Commission</span>
                              <span className="font-bold text-emerald-400">{opp.commission || 'Check Partner Portal'}</span>
                            </div>
                          </div>

                          {/* Official Sources & Verification Evidence */}
                          <div className="mb-4 text-xs space-y-1.5">
                            <p className="text-on-surface-variant">
                              <strong className="text-slate-300">Verified Evidence:</strong> {opp.sourceEvidence}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-1">
                              {opp.vendorWebsite && (
                                <a
                                  href={opp.vendorWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 font-mono-data text-[11px]"
                                >
                                  Official Website <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                </a>
                              )}
                              {opp.salesPageUrl && (
                                <a
                                  href={opp.salesPageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 font-mono-data text-[11px]"
                                >
                                  Sales Page <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Fit reasoning */}
                          <p className="text-xs text-slate-400 italic mb-4">
                            &ldquo;{opp.viafindsFitReasoning}&rdquo;
                          </p>
                        </div>

                        {/* Card Footer Action */}
                        <div className="pt-4 border-t border-slate-border/50 flex items-center justify-between gap-3">
                          <span className="font-mono-data text-[10px] text-slate-500">
                            Verified: {new Date(opp.lastVerifiedAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleSelectOpportunity(opp)}
                            className="px-4 py-2 bg-primary text-deep-navy font-bold text-xs uppercase tracking-wider rounded hover:bg-primary/90 transition-all flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">link</span>
                            Verify Link for This
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL AFFILIATE LINK VERIFICATION & CTA PREVIEW */}
          {mode === 'manual' && (
            <div className="space-y-6">
              {/* Product Association Banner */}
              <div className="bg-obsidian-deep border border-slate-border rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">verified</span>
                    </div>
                    <div>
                      <h2 className="font-headline-lg text-lg text-on-background font-bold">
                        Manual Affiliate Link Verification & Safety Gate
                      </h2>
                      <p className="font-ui-body text-xs text-on-surface-variant">
                        Validate formatting, test destination hops, match vendor sales pages, confirm owner attribution, and preview the live article CTA.
                      </p>
                    </div>
                  </div>

                  {selectedOpportunity ? (
                    <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-slate-border">
                      <span className="text-xs text-on-surface-variant font-mono-data">Target Product:</span>
                      <strong className="text-xs text-primary">{selectedOpportunity.productName}</strong>
                      <button
                        onClick={() => setSelectedOpportunity(null)}
                        className="text-slate-400 hover:text-red-400 text-xs ml-1"
                        title="Deselect product"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setMode('opportunities')}
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-slate-border text-xs text-on-surface-variant rounded transition-colors"
                    >
                      Browse Opportunities to Associate
                    </button>
                  )}
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-1.5">
                      Affiliate Promo Link (HTTPS) *
                    </label>
                    <input
                      type="url"
                      value={affiliateUrl}
                      onChange={(e) => setAffiliateUrl(e.target.value)}
                      placeholder="https://www.digistore24.com/redir/{PRODUCT_ID}/{AFFILIATE_ID}"
                      className="w-full bg-surface-container border border-slate-border rounded px-4 py-3 text-sm text-on-background placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors font-mono-data"
                      disabled={isVerifyingLink || loading}
                    />
                    <p className="text-[11px] text-slate-500 font-mono-data mt-1">
                      Allowed domains: digistore24.com, clickbank.net, jvzoo.com, warriorplus.com. Local and private IP ranges are blocked for SSRF security.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-1.5">
                        Customer CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Check Official Price"
                        className="w-full bg-surface-container border border-slate-border rounded px-4 py-2.5 text-sm text-on-background placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
                        disabled={isVerifyingLink || loading}
                      />
                    </div>
                    <div>
                      <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-1.5">
                        Owner Affiliate ID (for Attribution Confirmation)
                      </label>
                      <input
                        type="text"
                        value={ownerAffiliateId}
                        onChange={(e) => setOwnerAffiliateId(e.target.value)}
                        placeholder="e.g. 1770083 (defaults to DIGISTORE24_AFFILIATE_ID)"
                        className="w-full bg-surface-container border border-slate-border rounded px-4 py-2.5 text-sm text-on-background placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors font-mono-data"
                        disabled={isVerifyingLink || loading}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleVerifyAffiliateLink}
                      disabled={isVerifyingLink || !affiliateUrl.trim()}
                      className="px-6 py-3 bg-primary text-deep-navy font-bold text-xs uppercase tracking-wider rounded shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isVerifyingLink ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          Verifying Link & Redirections...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Verify Link & Check Readiness
                        </>
                      )}
                    </button>

                    {verificationResult?.level === 'AFFILIATE_CONFIRMED' && readinessResult?.ready && (
                      <button
                        onClick={handleRunManual}
                        disabled={loading}
                        className="px-6 py-3 bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded shadow-md hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        Run Automation with Verified Link
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Verify error banner */}
              {verifyError && (
                <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg text-red-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 mt-0.5">error</span>
                  <div>
                    <h4 className="font-bold text-sm">Verification Failed</h4>
                    <p className="text-xs text-red-300 mt-1">{verifyError}</p>
                  </div>
                </div>
              )}

              {/* Multi-Stage Verification Results */}
              {verificationResult && (
                <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-border/50 pb-4">
                    <div>
                      <h3 className="font-headline-lg text-base font-bold text-on-background">
                        Multi-Stage Verification Status
                      </h3>
                      <p className="font-mono-data text-xs text-on-surface-variant">
                        Checked at: {new Date(verificationResult.checkedAt).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Level Badge */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-xs text-slate-400 uppercase">Verification Level:</span>
                      <span
                        className={`px-3 py-1 rounded text-xs font-mono-data font-bold uppercase ${
                          verificationResult.level === 'AFFILIATE_CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : verificationResult.level === 'PRODUCT_VERIFIED'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : verificationResult.level === 'REDIRECT_VALID'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {verificationResult.level}
                      </span>
                    </div>
                  </div>

                  {/* 4 Inspection Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stage 1: Format & SSRF */}
                    <div className="p-4 bg-surface-container/30 rounded border border-slate-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono-data text-xs uppercase text-slate-400">1. Format & SSRF</span>
                        {verificationResult.formatValid ? (
                          <span className="text-emerald-400 text-sm font-bold">✓ Valid</span>
                        ) : (
                          <span className="text-red-400 text-sm font-bold">✕ Invalid</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {verificationResult.formatValid ? 'HTTPS protocol, allowed affiliate domain, no private IP ranges.' : 'URL is malformed, not HTTPS, or domain is restricted.'}
                      </p>
                    </div>

                    {/* Stage 2: Redirect Resolution */}
                    <div className="p-4 bg-surface-container/30 rounded border border-slate-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono-data text-xs uppercase text-slate-400">2. Safe Redirect</span>
                        {verificationResult.redirectValid ? (
                          <span className="text-emerald-400 text-sm font-bold">✓ HTTP {verificationResult.redirectStatus}</span>
                        ) : (
                          <span className="text-red-400 text-sm font-bold">✕ Failed</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant truncate" title={verificationResult.redirectDestination || ''}>
                        {verificationResult.redirectDestination ? `Resolves to: ${verificationResult.redirectDestination}` : 'Hop-link does not resolve to a live 200/302 endpoint.'}
                      </p>
                    </div>

                    {/* Stage 3: Product Match */}
                    <div className="p-4 bg-surface-container/30 rounded border border-slate-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono-data text-xs uppercase text-slate-400">3. Product Match</span>
                        {verificationResult.productVerified === true ? (
                          <span className="text-emerald-400 text-sm font-bold">✓ Matches</span>
                        ) : verificationResult.productVerified === false ? (
                          <span className="text-amber-400 text-sm font-bold">✕ Mismatch</span>
                        ) : (
                          <span className="text-slate-500 text-sm">Not Checked</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {verificationResult.productVerified ? 'Destination verified to match intended sales page.' : 'Destination host does not match the opportunity sales page.'}
                      </p>
                    </div>

                    {/* Stage 4: Attribution Confirmation */}
                    <div className="p-4 bg-surface-container/30 rounded border border-slate-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono-data text-xs uppercase text-slate-400">4. Attribution</span>
                        {verificationResult.affiliateConfirmed ? (
                          <span className="text-emerald-400 text-sm font-bold">✓ Confirmed</span>
                        ) : (
                          <span className="text-amber-400 text-sm font-bold">⚠️ Unconfirmed</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {verificationResult.affiliateConfirmed ? 'Explicitly confirmed matching owner affiliate ID.' : 'Affiliate attribution not yet explicitly confirmed.'}
                      </p>
                    </div>
                  </div>

                  {/* Distinct Warning Notice */}
                  {verificationResult.level === 'REDIRECT_VALID' && (
                    <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200 text-xs flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-400 mt-0.5">info</span>
                      <p className="leading-relaxed">
                        <strong>Important Security Boundary:</strong> The promo link resolves via HTTP {verificationResult.redirectStatus} to a live destination, but a successful redirect alone does <strong>not</strong> prove affiliate attribution or that sales will be credited to your account. To proceed to publication, enter your verified owner affiliate ID to confirm attribution.
                      </p>
                    </div>
                  )}

                  {/* Errors and Warnings List */}
                  {verificationResult.errors.length > 0 && (
                    <div className="p-3 bg-red-950/20 border border-red-500/30 rounded text-xs text-red-300">
                      <strong className="block mb-1">Verification Errors:</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {verificationResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {verificationResult.warnings.length > 0 && (
                    <div className="p-3 bg-surface-container/40 border border-slate-border rounded text-xs text-slate-400">
                      <strong className="block mb-1 text-slate-300">Validator Warnings:</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {verificationResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Customer-Facing Article CTA Preview */}
                  {ctaPreview && (
                    <div className="pt-4 border-t border-slate-border/50">
                      <h4 className="font-mono-data text-xs text-on-surface-variant uppercase mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                        Customer-Facing Article CTA Preview (Real Target: {ctaPreview.targetUrl})
                      </h4>

                      {/* Rendered Preview Card */}
                      <div className="p-6 bg-surface-container-high border border-slate-border rounded-lg text-center max-w-xl mx-auto shadow-xl">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                          {ctaPreview.vendorName} &bull; Official Partner
                        </p>
                        <h4 className="text-lg font-bold text-white mb-2">{ctaPreview.productName}</h4>
                        {ctaPreview.priceInfo && (
                          <p className="text-sm font-semibold text-emerald-400 mb-4">{ctaPreview.priceInfo}</p>
                        )}
                        <a
                          href={ctaPreview.targetUrl}
                          target="_blank"
                          rel={ctaPreview.rel}
                          className="inline-block px-8 py-3 bg-primary text-deep-navy font-bold rounded shadow-lg hover:bg-primary/90 transition-colors text-sm"
                        >
                          {ctaPreview.buttonText} &rarr;
                        </a>
                        <p className="text-[11px] text-slate-400 mt-4 italic">
                          {ctaPreview.affiliateDisclosure}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Publication Readiness Gate Status */}
                  {readinessResult && (
                    <div className="pt-4 border-t border-slate-border/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-mono-data text-xs text-on-surface-variant uppercase">
                          Server-Side Publication Gate
                        </h4>
                        {readinessResult.ready ? (
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-xs font-bold font-mono-data">
                            ✓ READY FOR PUBLICATION
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs font-bold font-mono-data">
                            ✕ PUBLICATION BLOCKED ({readinessResult.blockers.length} BLOCKERS)
                          </span>
                        )}
                      </div>

                      {/* 8-Point Gate Checklist */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs font-mono-data">
                        <div className={`p-2 rounded border ${readinessResult.checks.hasVerifiedProduct ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.hasVerifiedProduct ? '✓' : '✕'} Verified Product
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.hasAffiliateLink ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.hasAffiliateLink ? '✓' : '✕'} Link Present
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.linkIsAffiliateConfirmed ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.linkIsAffiliateConfirmed ? '✓' : '✕'} Attribution Confirmed
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.hasRequiredImages ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.hasRequiredImages ? '✓' : '✕'} Required Images
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.articlePassedQualityGate ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.articlePassedQualityGate ? '✓' : '✕'} Quality Gate Pass
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.ownerApproved ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.ownerApproved ? '✓' : '✕'} Owner Approval
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.noDegradedContent ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.noDegradedContent ? '✓' : '✕'} No Degraded Content
                        </div>
                        <div className={`p-2 rounded border ${readinessResult.checks.noFakeClaims ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                          {readinessResult.checks.noFakeClaims ? '✓' : '✕'} No Fake Claims
                        </div>
                      </div>

                      {/* Blockers & Next Action Box */}
                      {!readinessResult.ready && (
                        <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-200">
                          <strong className="block text-red-300 mb-1.5 font-bold">Why Publication is Blocked:</strong>
                          <ul className="list-disc list-inside space-y-1 mb-3">
                            {readinessResult.blockers.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>
                          <div className="pt-2 border-t border-red-500/20 text-slate-300 font-mono-data text-[11px]">
                            <strong>Next Action Needed:</strong> Ensure the link is confirmed with your owner affiliate ID and editorial Quality Gate passes before publishing to live CMS.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTO MODE */}
          {mode === 'auto' && (
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-lg text-on-background font-bold mb-1">Auto Mode</h2>
                  <p className="font-ui-body text-sm text-on-surface-variant">
                    Select an affiliate partner. The system will automatically find the best product with verified marketplace credentials, then research, write, test, and publish the article using fail-closed validation.
                  </p>
                </div>
              </div>

              {/* Partner Selection */}
              <div className="mb-6">
                <label className="block font-mono-data text-xs text-on-surface-variant uppercase mb-3">Select Partner</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {PARTNERS.map((partner) => (
                    <button
                      key={partner.id}
                      onClick={() => setSelectedPartner(partner.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedPartner === partner.id
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-slate-border bg-surface-container/30 hover:border-slate-border hover:bg-surface-container/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{partner.icon}</span>
                        <div>
                          <p className={`font-ui-body font-medium text-sm ${selectedPartner === partner.id ? 'text-primary' : 'text-on-background'}`}>
                            {partner.name}
                          </p>
                          <p className="font-mono-data text-xs text-on-surface-variant">
                            {selectedPartner === partner.id ? 'Selected' : 'Click to select'}
                          </p>
                        </div>
                        {selectedPartner === partner.id && (
                          <span className="ml-auto material-symbols-outlined text-primary text-lg">check_circle</span>
                        )}
                      </div>
                    </button>
                  ))}

                  {[
                    { name: 'ClickBank', icon: '💰' },
                    { name: 'ShareASale', icon: '🤝' },
                  ].map((partner) => (
                    <div
                      key={partner.name}
                      className="p-4 rounded-lg border border-slate-border/50 bg-surface-container/10 opacity-50 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{partner.icon}</span>
                        <div>
                          <p className="font-ui-body font-medium text-sm text-on-surface-variant">{partner.name}</p>
                          <p className="font-mono-data text-xs text-slate-500">Coming Soon</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRunAuto}
                disabled={loading}
                className="w-full py-3 bg-tertiary text-on-tertiary font-bold text-sm uppercase tracking-wider rounded shadow-lg hover:bg-tertiary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">play_arrow</span>
                )}
                RUN AUTO — {PARTNERS.find((p) => p.id === selectedPartner)?.name || selectedPartner}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Workflow View */}
      {activeJobId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            {renderProgress()}
          </div>
          <div className="lg:col-span-3">
            <h2 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-4 pl-2">
              {mode === 'manual' ? 'Manual Workflow' : 'Auto Workflow'}
            </h2>
            {renderWorkspace()}
          </div>
        </div>
      )}
    </div>
  )
}
