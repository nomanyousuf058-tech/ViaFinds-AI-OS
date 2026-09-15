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

type Mode = 'manual' | 'auto'

export default function AutomationPage() {
  const [mode, setMode] = useState<Mode>('manual')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Manual mode state
  const [affiliateUrl, setAffiliateUrl] = useState('')

  // Auto mode state
  const [selectedPartner, setSelectedPartner] = useState('digistore24')

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

  const handleRunManual = async () => {
    if (!affiliateUrl.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual_affiliate', mode: 'manual', affiliateUrl: affiliateUrl.trim() }),
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
  }

  const stages = mode === 'manual' ? MANUAL_STAGES : AUTO_STAGES

  const renderProgress = () => {
    if (!job) return null
    const currentStageIdx = stages.findIndex(s => s.id === job.currentStage)
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
            <h3 className="font-headline-lg text-lg font-bold">Workflow Error</h3>
          </div>
          <p className="font-mono-data text-sm mb-4">{job.error}</p>
          <button onClick={handleReset} className="px-5 py-2 bg-surface-container rounded hover:bg-surface-container/80 transition-colors text-sm text-on-background">
            Start New Workflow
          </button>
        </div>
      )
    }

    const { result } = job

    // Running state — show live progress details
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

          {/* Show discovered product info if available */}
          {result?.selectedProduct && (
            <div className="p-4 bg-surface-container/30 rounded border border-slate-border mb-4">
              <h3 className="font-ui-body text-on-background font-medium mb-2">
                {mode === 'auto' ? 'Best Product Found' : 'Product Detected'}
              </h3>
              <p className="font-mono-data text-sm text-on-surface-variant">
                <strong>{result.selectedProduct.name}</strong>
                {result.selectedProduct.commissionRate && ` — ${result.selectedProduct.commissionRate}% commission`}
              </p>
              {result.articleType && (
                <span className="inline-block mt-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                  Article Type: {result.articleType}
                </span>
              )}
            </div>
          )}

          {/* Live audit log */}
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

    // Completed state
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

          {/* Published article details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {result?.draft?.title && (
              <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Title</p>
                <p className="font-ui-body text-on-background font-medium">{result.draft.title}</p>
              </div>
            )}
            {result?.articleType && (
              <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Article Type</p>
                <p className="font-ui-body text-on-background font-medium capitalize">{result.articleType}</p>
              </div>
            )}
            {result?.publishedUrl && (
              <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Slug</p>
                <p className="font-mono-data text-primary text-sm">/articles/{result.publishedUrl}</p>
              </div>
            )}
            {result?.affiliateDecision && (
              <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                <p className="font-mono-data text-xs text-on-surface-variant uppercase mb-1">Affiliate</p>
                <p className="font-ui-body text-on-background text-sm">{result.affiliateDecision.recommendedPartner} — {result.affiliateDecision.commissionInfo}</p>
              </div>
            )}
          </div>

          {/* Quality scores */}
          <div className="flex flex-wrap gap-3 mb-6">
            {result?.eeatResult && (
              <span className={`px-3 py-1.5 text-xs rounded font-medium ${result.eeatResult.score >= 70 ? 'bg-green-500/20 text-green-400' : result.eeatResult.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                E-E-A-T: {result.eeatResult.score}
              </span>
            )}
            {result?.seoResult && (
              <span className={`px-3 py-1.5 text-xs rounded font-medium ${result.seoResult.score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                SEO: {result.seoResult.score}
              </span>
            )}
            {result?.geoResult && (
              <span className={`px-3 py-1.5 text-xs rounded font-medium ${result.geoResult.score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                GEO: {result.geoResult.score}
              </span>
            )}
            {result?.aeoResult && (
              <span className={`px-3 py-1.5 text-xs rounded font-medium ${result.aeoResult.score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                AEO: {result.aeoResult.score}
              </span>
            )}
            {result?.qualityResult && (
              <span className={`px-3 py-1.5 text-xs rounded font-medium ${result.qualityResult.status === 'pass' ? 'bg-green-500/20 text-green-400' : result.qualityResult.status === 'review' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                Quality: {result.qualityResult.status?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Article preview */}
          {result?.draft?.body && (
            <div className="mb-6">
              <h3 className="font-mono-data text-xs text-on-surface-variant uppercase mb-2">Article Preview</h3>
              <div className="prose prose-invert prose-slate max-w-none bg-surface-container/30 p-5 rounded border border-slate-border max-h-64 overflow-y-auto">
                <h1 className="text-xl font-bold mb-3">{result.draft.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: result.draft.body.substring(0, 2000) + (result.draft.body.length > 2000 ? '...' : '') }} />
              </div>
            </div>
          )}

          <div className="flex gap-4 border-t border-slate-border pt-5">
            <button onClick={handleReset} className="px-6 py-2.5 bg-primary text-deep-navy font-medium rounded hover:bg-primary/90 transition-colors">
              Start New Workflow
            </button>
            {result?.articleId && (
              <a href={`/dashboard/articles/${result.articleId}`} className="px-6 py-2.5 bg-surface-container border border-slate-border text-on-background font-medium rounded hover:bg-surface-container-high transition-colors">
                View in CMS
              </a>
            )}
            {result?.publishedUrl && (
              <a href={`/articles/${result.publishedUrl}`} className="px-6 py-2.5 bg-surface-container border border-slate-border text-on-background font-medium rounded hover:bg-surface-container-high transition-colors">
                View Article
              </a>
            )}
          </div>
        </div>
      )
    }

    // Fallback for awaiting_approval or other states
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
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">AUTOMATION</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant">
          Generate affiliate articles from digital products and publish them with full SEO, AEO, GEO, and E-E-A-T optimization.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex mb-8 border-b border-slate-border">
        <button
          onClick={() => { setMode('manual'); if (!activeJobId) setJob(null) }}
          className={`px-6 py-3 font-ui-body text-sm font-medium uppercase tracking-wider transition-colors relative ${
            mode === 'manual'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-background'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">edit_note</span>
            Manual
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
            Auto
          </span>
          {mode === 'auto' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {/* Input Section */}
      {!activeJobId && (
        <div className="mb-8">
          {mode === 'manual' ? (
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">link</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-lg text-on-background font-bold mb-1">Manual Mode</h2>
                  <p className="font-ui-body text-sm text-on-surface-variant">
                    Paste a product affiliate link. The system will check the product, research it, decide the best article type, write the article, test E-E-A-T compliance, optimize for SEO/AEO/GEO, and publish it to your Article CMS.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://www.digistore24.com/redir/123456/YOURID"
                  className="flex-1 bg-surface-container border border-slate-border rounded px-4 py-3 text-sm text-on-background placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
                <button
                  onClick={handleRunManual}
                  disabled={loading || !affiliateUrl.trim()}
                  className="px-8 py-3 bg-primary text-deep-navy font-bold text-sm uppercase tracking-wider rounded shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">play_arrow</span>
                  )}
                  RUN
                </button>
              </div>

              {/* How it works */}
              <div className="mt-6 pt-5 border-t border-slate-border/50">
                <p className="font-mono-data text-xs text-slate-500 uppercase mb-3">How It Works</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Check Product', 'Research & Write', 'E-E-A-T Test', 'Publish with SEO'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold text-[10px]">{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-obsidian-deep border border-slate-border rounded-lg p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-lg text-on-background font-bold mb-1">Auto Mode</h2>
                  <p className="font-ui-body text-sm text-on-surface-variant">
                    Select an affiliate partner. The system will automatically find the best product with the highest commission and best customer quality, then research, write, test, and publish the article.
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

                  {/* Coming soon partners */}
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
                RUN AUTO — {PARTNERS.find(p => p.id === selectedPartner)?.name || selectedPartner}
              </button>

              {/* How it works */}
              <div className="mt-6 pt-5 border-t border-slate-border/50">
                <p className="font-mono-data text-xs text-slate-500 uppercase mb-3">How It Works</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['Find Best Product', 'Research', 'Write Article', 'E-E-A-T + SEO', 'Publish'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary font-bold text-[10px]">{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Workflow */}
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
