'use client'

import React, { useEffect, useState } from 'react'



const INTERACTIVE_STAGES = [
  { id: 'discovered', label: 'Trend Research' },
  { id: 'researching', label: 'Product Discovery' },
  { id: 'affiliate_analysis', label: 'Affiliate Research' },
  { id: 'competitor_analysis', label: 'Article Strategy' },
  { id: 'content_generating', label: 'Content' },
  { id: 'eeat_analysis', label: 'E-E-A-T' },
  { id: 'seo_analysis', label: 'SEO / GEO / AEO' },
  { id: 'publishing', label: 'Final Review & Publish' },
]

export default function AutomationPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Affiliate link state
  const [affiliateLink, setAffiliateLink] = useState('')
  const [linkPlacement, setLinkPlacement] = useState<'cta' | 'word'>('cta')
  const [ctaText, setCtaText] = useState('Check Official Website')

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

  const handleStartTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'find_trends', mode: 'manual' }),
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

  const handleFullAutomation = async () => {
    // Prompt for topic for full automation since it requires it
    const topic = window.prompt("Enter a topic or keyword for full automation:")
    if (!topic) return

    setLoading(true)
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'article_generation', mode: 'auto', topic }),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAction = async (action: string, data?: any) => {
    if (!activeJobId) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/automation/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: activeJobId, action, data }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setJob(json.data)
      }
    } catch {
    } finally {
      setActionLoading(false)
    }
  }

  const renderProgress = () => {
    if (!job) return null
    const currentStageIdx = INTERACTIVE_STAGES.findIndex(s => s.id === job.currentStage) || 0
    
    return (
      <div className="bg-obsidian-deep border border-slate-border rounded p-4 mb-6">
        <h3 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-4">Current Workflow</h3>
        <ul className="space-y-3">
          {INTERACTIVE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx || (job.status === 'completed')
            const isCurrent = stage.id === job.currentStage && job.status !== 'completed'
            
            return (
              <li key={stage.id} className="flex items-center gap-3">
                {isCompleted ? (
                  <span className="text-green-400">✓</span>
                ) : isCurrent ? (
                  <span className="text-primary animate-pulse">●</span>
                ) : (
                  <span className="text-slate-600">○</span>
                )}
                <span className={`font-ui-body text-sm ${isCurrent ? 'text-on-background font-medium' : isCompleted ? 'text-on-surface-variant' : 'text-slate-500'}`}>
                  {stage.label}
                </span>
              </li>
            )
          })}
        </ul>
        
        {job.status === 'running' && (
           <div className="mt-6 pt-4 border-t border-slate-border/50">
             <p className="font-mono-data text-xs text-primary animate-pulse">Working: {job.auditLog?.[job.auditLog.length - 1]?.details || 'Processing...'}</p>
           </div>
        )}
      </div>
    )
  }

  const renderWorkspace = () => {
    if (!job) {
      return (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-border rounded bg-obsidian-deep/50 text-center">
          <p className="font-ui-body text-on-surface-variant mb-2">No active automation workflow.</p>
          <p className="font-mono-data text-xs text-slate-500">Select an option above to begin.</p>
        </div>
      )
    }

    if (job.error) {
      return (
        <div className="p-6 bg-red-900/20 border border-red-500/30 rounded text-red-200">
          <h3 className="font-headline-lg mb-2">Workflow Error</h3>
          <p className="font-mono-data text-sm">{job.error}</p>
          <button 
            onClick={() => setActiveJobId(null)}
            className="mt-4 px-4 py-2 bg-surface-container rounded hover:bg-surface-container/80 transition-colors text-sm"
          >
            Start New Research
          </button>
        </div>
      )
    }

    const { result } = job

    return (
      <div className="space-y-6">
        
        {/* Step 1: Trends */}
        {result?.trendingProducts && !result?.selectedProduct && (
          <div className="bg-obsidian-deep border border-slate-border rounded p-6">
            <h2 className="font-headline-lg text-on-background mb-4">Trending Digital Products</h2>
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {result.trendingProducts.map((product: any, idx: number) => (
                <div key={idx} className="p-4 border border-slate-border rounded bg-surface-container/30 flex justify-between items-start">
                  <div>
                    <h3 className="font-ui-body font-medium text-lg text-on-background">{product.name}</h3>
                    <p className="font-mono-data text-xs text-on-surface-variant mt-1">
                      Volume: {product.searchVolume} | Trend: {product.trendDirection} | Commission: {product.estimatedCommission}%
                    </p>
                    {product.partnerAvailability?.length > 0 ? (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                        Available on {product.partnerAvailability.join(', ')}
                      </span>
                    ) : (
                      <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        Partner Check Required
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAction('select_product', { product })}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary text-deep-navy text-sm font-medium rounded hover:bg-primary/90 transition-colors"
                  >
                    Select Product
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Product Strategy & Generation */}
        {result?.selectedProduct && !result?.draft && job.status === 'awaiting_approval' && (
           <div className="bg-obsidian-deep border border-slate-border rounded p-6">
             <h2 className="font-headline-lg text-on-background mb-4">Article Strategy: {result.selectedProduct.name}</h2>
             
             {result.affiliateDecision && (
               <div className="mb-6 p-4 bg-surface-container/50 rounded border border-slate-border">
                 <h3 className="font-ui-body text-on-background font-medium mb-2">Affiliate Opportunity</h3>
                 <p className="font-mono-data text-sm text-on-surface-variant">
                   Partner: {result.affiliateDecision.recommendedPartner || 'Unknown'}<br/>
                   Status: {result.affiliateDecision.commissionInfo}
                 </p>
               </div>
             )}

             {result.articleStrategy && (
               <div className="mb-6">
                 <h3 className="font-ui-body text-on-background font-medium mb-2">Recommended Approach: {result.articleStrategy.recommendedArticleType}</h3>
                 <p className="font-mono-data text-sm text-on-surface-variant mb-4">{result.articleStrategy.reasoning}</p>
                 <div className="p-4 bg-surface-container/30 rounded border border-slate-border">
                   <h4 className="font-mono-data text-xs text-on-surface-variant uppercase mb-2">Outline</h4>
                   <ul className="list-disc pl-5 font-ui-body text-sm text-on-background space-y-1">
                     {result.articleStrategy.outline.map((item: string, i: number) => (
                       <li key={i}>{item}</li>
                     ))}
                   </ul>
                 </div>
               </div>
             )}

             <button
                onClick={() => handleAction('process_article')}
                disabled={actionLoading}
                className="w-full py-3 bg-primary text-deep-navy font-medium rounded hover:bg-primary/90 transition-colors"
             >
               {actionLoading ? 'Processing...' : 'PROCESS ARTICLE'}
             </button>
           </div>
        )}

        {/* Step 3: Review and Publish */}
        {result?.draft && (
           <div className="bg-obsidian-deep border border-slate-border rounded p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="font-headline-lg text-on-background">Content Review</h2>
               <div className="flex gap-2">
                 <span className={`px-2 py-1 text-xs rounded ${result.qualityResult?.status === 'pass' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                   E-E-A-T: {result.qualityResult?.status?.toUpperCase() || 'REVIEW'}
                 </span>
                 <span className={`px-2 py-1 text-xs rounded ${(result.seoResult?.score || 0) > 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                   SEO: {result.seoResult?.score || 0}
                 </span>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="md:col-span-2">
                 <div className="prose prose-invert prose-slate max-w-none bg-surface-container/30 p-6 rounded border border-slate-border h-[500px] overflow-y-auto">
                   <h1 className="text-2xl font-bold mb-4">{result.draft.title}</h1>
                   <div dangerouslySetInnerHTML={{ __html: result.draft.body }} />
                 </div>
               </div>
               
               <div className="space-y-6">
                 {/* Images */}
                 {result.imageRequirements?.needed && (
                   <div className="p-4 bg-surface-container rounded border border-slate-border">
                     <h3 className="font-ui-body text-on-background font-medium mb-2">Images Needed</h3>
                     <ul className="list-disc pl-5 font-mono-data text-xs text-on-surface-variant mb-4">
                       {result.imageRequirements.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
                     </ul>
                     <button className="w-full py-2 border border-primary text-primary text-sm rounded hover:bg-primary/10 transition-colors">
                       Upload Image
                     </button>
                   </div>
                 )}

                 {/* Affiliate Link Config */}
                 <div className="p-4 bg-surface-container rounded border border-slate-border">
                   <h3 className="font-ui-body text-on-background font-medium mb-4">Affiliate Link</h3>
                   
                   <label className="block font-mono-data text-xs text-on-surface-variant mb-1">Affiliate URL</label>
                   <input 
                     type="text" 
                     value={affiliateLink}
                     onChange={(e) => setAffiliateLink(e.target.value)}
                     placeholder={result.affiliateDecision?.affiliateUrl || "https://..."}
                     className="w-full bg-obsidian-deep border border-slate-border rounded px-3 py-2 text-sm mb-4 text-on-background"
                   />

                   <label className="block font-mono-data text-xs text-on-surface-variant mb-1">Placement</label>
                   <div className="flex gap-4 mb-4">
                     <label className="flex items-center gap-2 text-sm text-on-background">
                       <input type="radio" checked={linkPlacement === 'cta'} onChange={() => setLinkPlacement('cta')} />
                       CTA BUTTON
                     </label>
                     <label className="flex items-center gap-2 text-sm text-on-background">
                       <input type="radio" checked={linkPlacement === 'word'} onChange={() => setLinkPlacement('word')} />
                       WORD / PHRASE
                     </label>
                   </div>

                   {linkPlacement === 'cta' && (
                     <>
                       <label className="block font-mono-data text-xs text-on-surface-variant mb-1">CTA Text</label>
                       <input 
                         type="text" 
                         value={ctaText}
                         onChange={(e) => setCtaText(e.target.value)}
                         className="w-full bg-obsidian-deep border border-slate-border rounded px-3 py-2 text-sm mb-2 text-on-background"
                       />
                     </>
                   )}
                 </div>
               </div>
             </div>

             {job.status === 'awaiting_approval' && (
               <div className="flex gap-4 border-t border-slate-border pt-6">
                 <button 
                   onClick={() => handleAction('publish', { affiliateUrl: affiliateLink, ctaText, draftOnly: true })}
                   disabled={actionLoading}
                   className="px-6 py-2 bg-surface-container text-on-background font-medium rounded hover:bg-surface-container/80 transition-colors"
                 >
                   Save Draft
                 </button>
                 <button 
                   onClick={() => handleAction('publish', { affiliateUrl: affiliateLink, ctaText, draftOnly: false })}
                   disabled={actionLoading}
                   className="px-6 py-2 bg-primary text-deep-navy font-medium rounded hover:bg-primary/90 transition-colors"
                 >
                   Publish
                 </button>
               </div>
             )}

             {job.status === 'completed' && (
               <div className="p-4 bg-green-900/20 border border-green-500/30 rounded text-green-400 mt-6 text-center">
                 <p className="font-medium mb-4">Article successfully {result.publishedUrl ? 'published' : 'saved as draft'}!</p>
                 <div className="flex justify-center gap-4">
                   <button 
                     onClick={() => { setActiveJobId(null); setJob(null) }}
                     className="px-6 py-2 bg-surface-container text-on-background text-sm rounded hover:bg-surface-container/80 transition-colors"
                   >
                     Next Article
                   </button>
                   <button 
                     onClick={() => { setActiveJobId(null); setJob(null) }}
                     className="px-6 py-2 bg-surface-container text-on-background text-sm rounded hover:bg-surface-container/80 transition-colors"
                   >
                     New Research
                   </button>
                 </div>
               </div>
             )}
           </div>
        )}

      </div>
    )
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">AUTOMATION</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-6">Find the best digital-product opportunities and turn them into affiliate content.</p>
        
        <div className="flex gap-4">
          <button
            onClick={handleStartTrends}
            disabled={loading || actionLoading}
            className="px-6 py-3 bg-primary text-deep-navy font-medium rounded shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            RUN FINDS TRENDS
          </button>
          <button
            onClick={handleFullAutomation}
            disabled={loading || actionLoading}
            className="px-6 py-3 bg-surface-container border border-slate-border text-on-background font-medium rounded hover:bg-surface-container/80 transition-colors disabled:opacity-50"
          >
            RUN FULL AUTOMATION
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          {renderProgress()}
        </div>
        <div className="lg:col-span-3">
          <h2 className="font-mono-data text-mono-data text-xs text-on-surface-variant uppercase mb-4 pl-2">AI Workspace</h2>
          {renderWorkspace()}
        </div>
      </div>
    </div>
  )
}
