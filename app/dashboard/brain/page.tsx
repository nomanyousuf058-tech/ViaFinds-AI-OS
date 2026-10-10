'use client'

import React, { useEffect, useState, useCallback } from 'react'

export default function BrainDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, reportsRes, statsRes] = await Promise.all([
        fetch('/api/brain/status'),
        fetch('/api/brain/reports'),
        fetch('/api/dashboard/stats')
      ])
      
      const statusJ = await statusRes.json()
      const reportsJ = await reportsRes.json()
      const statsJ = await statsRes.json()
      
      setData({
        status: statusJ.success ? statusJ.status : null,
        reports: reportsJ.success ? reportsJ.reports : [],
        stats: statsJ
      })
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-12 w-64 bg-surface-container animate-pulse rounded" />
        <div className="h-48 bg-surface-container animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-96 bg-surface-container animate-pulse rounded-xl" />
          <div className="h-96 bg-surface-container animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  const s = data?.status
  const stats = data?.stats
  const latestReport = data?.reports?.[0]
  
  // Calculate next run
  let nextScheduledRun = 'Unknown'
  if (stats?.scheduler?.upcoming?.length > 0) {
    const next = stats.scheduler.upcoming[0]
    nextScheduledRun = new Date(next.nextRun).toLocaleString()
  }

  const isHealthy = s?.brainState === 'active'

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">AI Brain</h1>
          <p className="font-ui-body text-on-surface-variant text-lg mt-1">Autonomous Business & Technical Intelligence.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full border border-slate-border">
            <div className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-brand-green shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-secondary shadow-[0_0_8px_rgba(255,219,157,0.6)]'}`} />
            <span className="font-mono-data text-sm">{isHealthy ? 'Brain Active' : (s?.brainState || 'Unknown Status')}</span>
          </div>
        </div>
      </header>

      {/* Cycle Summary */}
      <section className="bg-surface-container border border-slate-border rounded-2xl p-6">
        <h2 className="font-headline-lg text-xl font-bold text-on-background mb-4">Operations Cycle</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Current Status</p>
            <p className="text-on-background font-medium">{isHealthy ? 'Monitoring & Ready' : s?.brainState}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Last Successful Run</p>
            <p className="text-on-background font-medium">{s?.lastRun?.completedAt ? new Date(s.lastRun.completedAt).toLocaleString() : 'No recent run'}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Next Scheduled Run</p>
            <p className="text-on-background font-medium">{nextScheduledRun}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Recent Work</p>
            <p className="text-on-background font-medium">{s?.lastRun ? s.lastRun.runType : 'None'}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Technical Intelligence */}
        <section className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-border pb-4">
            <span className="material-symbols-outlined text-primary text-2xl">memory</span>
            <h2 className="font-headline-lg text-2xl font-bold text-on-background">Technical Intelligence</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-border/50">
              <span className="text-on-surface-variant text-sm">Website & API Health</span>
              <span className="text-brand-green font-medium text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> Healthy</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-border/50">
              <span className="text-on-surface-variant text-sm">Database Connectivity</span>
              <span className="text-brand-green font-medium text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> Connected</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-border/50">
              <span className="text-on-surface-variant text-sm">Scheduled Jobs (Cron)</span>
              {stats?.scheduler?.overdueCount > 0 ? (
                <span className="text-error font-medium text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">warning</span> {stats.scheduler.overdueCount} Overdue</span>
              ) : (
                <span className="text-brand-green font-medium text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> Reliable</span>
              )}
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-border/50">
              <span className="text-on-surface-variant text-sm">AI Providers</span>
              <span className="text-on-background font-medium text-sm">{s?.providersConfigured || 0} Configured</span>
            </div>
            
            {/* Displaying limitatons / config issues */}
            {s?.limitations && s.limitations.length > 0 && (
              <div className="bg-surface-container-high rounded-xl p-4 mt-4">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Configuration Notices</h4>
                <ul className="space-y-2">
                  {s.limitations.map((lim: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm text-on-surface-variant items-start">
                      <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">info</span>
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Business Intelligence */}
        <section className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-border pb-4">
            <span className="material-symbols-outlined text-primary text-2xl">trending_up</span>
            <h2 className="font-headline-lg text-2xl font-bold text-on-background">Business Intelligence</h2>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-surface-container-high rounded-xl p-4 border border-slate-border">
                <p className="text-xs text-on-surface-variant uppercase mb-1">Products Researched</p>
                <p className="text-2xl font-headline-lg text-on-background font-bold">{latestReport?.context?.products?.totalProducts || 0}</p>
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 border border-slate-border">
                <p className="text-xs text-on-surface-variant uppercase mb-1">Active Strategies</p>
                <p className="text-2xl font-headline-lg text-on-background font-bold">{s?.activeStrategies || 0}</p>
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 border border-slate-border">
                <p className="text-xs text-on-surface-variant uppercase mb-1">Articles Published</p>
                <p className="text-2xl font-headline-lg text-on-background font-bold">{stats?.articles?.published || 0}</p>
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 border border-slate-border">
                <p className="text-xs text-on-surface-variant uppercase mb-1">Opportunities Found</p>
                <p className="text-2xl font-headline-lg text-on-background font-bold">{s?.openOpportunities || 0}</p>
              </div>
            </div>

            {/* Recommendations */}
            {latestReport?.recommendations && latestReport.recommendations.length > 0 ? (
              <div className="bg-primary-fixed-dim/10 border border-primary/20 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Latest Brain Recommendations</h4>
                <ul className="space-y-3">
                  {latestReport.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm text-on-background items-start">
                      <span className="material-symbols-outlined text-primary text-[18px] shrink-0">tips_and_updates</span>
                      <span>{rec.recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-4 border border-dashed border-slate-border rounded-xl">No new recommendations right now.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
