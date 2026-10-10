'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatJsonField } from '@/lib/utils/format'

interface BrainStatus {
  isOn: boolean
  brainState: string
  mode: string
  version: string
  lastWake: string | null
  lastRun: {
    id: string
    runType: string
    trigger: string
    status: string
    startedAt: string
    completedAt: string | null
  } | null
  activeStrategies: number
  pendingApprovals: number
  openOpportunities: number
  activeTasks: number
  providersConfigured: number
  dataSources: Record<string, string>
  currentStrategy: string
  limitations: string[]
}

interface TodayData {
  brainStatus: BrainStatus | null
  articles: { total: number; published: number; draft: number }
  jobs: { total: number; queued: number; failed: number }
  revenue: { total: number; recent: number; conversionsCount: number }
  scheduler: { upcoming: any[]; overdueCount: number }
  opportunities: Array<{
    id: string
    title: string
    category: string
    status: string
    confidence: string
    potentialImpact: string
  }>
  approvals: Array<{
    id: string
    proposedAction: string
    requestedPermission: string
    status: string
    createdAt: string
  }>
}

function TimeAgo({ date }: { date: string | null }) {
  if (!date) return <span className="text-on-surface-variant text-xs">Never</span>
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <span>Just now</span>
  if (mins < 60) return <span>{mins}m ago</span>
  const hours = Math.floor(mins / 60)
  if (hours < 24) return <span>{hours}h ago</span>
  const days = Math.floor(hours / 24)
  return <span>{days}d ago</span>
}

function StatusDot({ status }: { status: 'healthy' | 'warning' | 'error' | 'inactive' }) {
  const colors = {
    healthy: 'bg-brand-green shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    warning: 'bg-secondary shadow-[0_0_8px_rgba(255,219,157,0.6)]',
    error: 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]',
    inactive: 'bg-outline',
  }
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[status]}`} />
}

export default function TodayControlRoom() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [brainRes, statsRes] = await Promise.all([
        fetch('/api/brain/status'),
        fetch('/api/dashboard/stats'),
      ])

      const brainJson = await brainRes.json()
      const statsJson = await statsRes.json()

      let approvals: TodayData['approvals'] = []
      
      if (brainJson.success) {
        const approvalsRes = await fetch('/api/brain/activity?type=approvals&limit=10')
        const apprJson = await approvalsRes.json()
        if (apprJson.success && Array.isArray(apprJson.data)) {
          approvals = apprJson.data.map((a: any) => ({
            id: String(a.id || ''),
            proposedAction: formatJsonField(a.proposed_action || a.proposedAction),
            requestedPermission: formatJsonField(a.requested_permission || a.requestedPermission),
            status: String(a.status || 'pending'),
            createdAt: String(a.created_at || a.createdAt || ''),
          }))
        }
      }

      setData({
        brainStatus: brainJson.success ? brainJson.status : null,
        articles: statsJson.articles || { total: 0, published: 0, draft: 0 },
        jobs: statsJson.jobs || { total: 0, queued: 0, failed: 0 },
        revenue: statsJson.revenue || { total: 0, recent: 0, conversionsCount: 0 },
        scheduler: statsJson.scheduler || { upcoming: [], overdueCount: 0 },
        opportunities: [], // Simplified for this view, focus on approvals
        approvals,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Today data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-12 w-64 bg-surface-container animate-pulse rounded" />
        <div className="h-48 bg-surface-container animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-surface-container animate-pulse rounded-xl" />
          <div className="h-64 bg-surface-container animate-pulse rounded-xl" />
          <div className="h-64 bg-surface-container animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-6 bg-error-container text-on-error-container rounded-xl border border-error/20">
          <h2 className="font-headline-lg mb-2">Error Loading Control Room</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const s = data?.brainStatus
  const stats = data!

  // --- Derive state for briefing & metrics ---
  const isHealthy = s?.brainState === 'active' && stats.jobs.failed === 0 && stats.scheduler.overdueCount === 0
  const actionRequired = stats.approvals.length > 0 || stats.jobs.failed > 0
  const pendingActionCount = stats.approvals.length
  
  const analyticsConnected = s?.dataSources?.ga4 === 'CONFIGURED' || s?.dataSources?.analytics === 'CONFIGURED'
  
  // Next Action Logic
  let nextAction = null
  if (stats.jobs.failed > 0) {
    nextAction = { title: 'Review Failed Jobs', desc: 'There are background tasks that failed to complete. Check system services.', link: '/dashboard/services', urgent: true }
  } else if (pendingActionCount > 0) {
    nextAction = { title: `Review ${pendingActionCount} Pending Approval${pendingActionCount > 1 ? 's' : ''}`, desc: 'The AI Brain is waiting for your permission to proceed with business actions.', link: '/dashboard/actions', urgent: true }
  } else if (stats.articles.draft > 0) {
    nextAction = { title: 'Review Draft Articles', desc: 'You have articles waiting to be reviewed and published.', link: '/dashboard/articles', urgent: false }
  } else {
    nextAction = { title: 'No Action Required', desc: 'Everything is running smoothly.', link: null, urgent: false }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">Today</h1>
          <p className="font-ui-body text-on-surface-variant text-lg mt-1">ViaFinds Business Control Room</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container px-4 py-2 rounded-full border border-slate-border">
          <div className="flex items-center gap-2">
            <StatusDot status={isHealthy ? 'healthy' : (s?.brainState === 'error' ? 'error' : 'warning')} />
            <span className="font-mono-data text-sm">{s?.brainState === 'active' ? 'System Online' : 'System Needs Attention'}</span>
          </div>
        </div>
      </header>

      {/* Main Recommended Action Area */}
      <section className={`relative overflow-hidden rounded-2xl border p-8 ${nextAction.urgent ? 'bg-primary-fixed-dim/10 border-primary/30' : 'bg-surface-container border-slate-border'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-label-caps uppercase text-primary mb-2 tracking-widest font-semibold">Priority Action</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-headline-lg font-bold text-on-background mb-2">{nextAction.title}</h3>
              <p className="text-on-surface-variant font-ui-body text-lg max-w-2xl">{nextAction.desc}</p>
            </div>
            {nextAction.link && (
              <Link href={nextAction.link} className={`shrink-0 px-8 py-3 rounded-xl font-medium transition-all ${nextAction.urgent ? 'bg-primary text-deep-navy shadow-[0_0_15px_rgba(185,195,255,0.3)] hover:scale-105' : 'bg-surface-container-high border border-slate-border hover:bg-surface-variant'}`}>
                {nextAction.urgent ? 'Take Action Now' : 'Review'}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-slate-border rounded-xl p-5 hover:border-outline-variant transition-colors">
          <div className="flex items-center gap-2 mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">payments</span>
            <span className="text-sm font-medium">Actual Revenue</span>
          </div>
          <div className="text-3xl font-headline-lg text-on-background font-bold">${stats.revenue.total.toFixed(2)}</div>
          <div className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
            <span className="text-brand-green">+{stats.revenue.conversionsCount}</span> conversions
          </div>
        </div>

        <div className="bg-surface-container border border-slate-border rounded-xl p-5 hover:border-outline-variant transition-colors">
          <div className="flex items-center gap-2 mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">monitoring</span>
            <span className="text-sm font-medium">Analytics Status</span>
          </div>
          <div className="text-lg font-ui-body text-on-background font-medium mt-2">
            {analyticsConnected ? 'Connected & Recording' : 'Not Connected'}
          </div>
          <div className="text-xs text-on-surface-variant mt-3">
            {analyticsConnected ? 'Data flowing from configured sources' : 'Action needed: Connect Google Analytics'}
          </div>
        </div>

        <div className="bg-surface-container border border-slate-border rounded-xl p-5 hover:border-outline-variant transition-colors">
          <div className="flex items-center gap-2 mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">article</span>
            <span className="text-sm font-medium">Articles</span>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-headline-lg text-on-background font-bold">{stats.articles.published}</div>
            <div className="text-sm text-on-surface-variant pb-1">published</div>
          </div>
          <div className="text-xs text-on-surface-variant mt-2">
            {stats.articles.draft} drafts waiting for review
          </div>
        </div>

        <div className="bg-surface-container border border-slate-border rounded-xl p-5 hover:border-outline-variant transition-colors">
          <div className="flex items-center gap-2 mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">psychology</span>
            <span className="text-sm font-medium">Brain Activity</span>
          </div>
          <div className="text-lg font-ui-body text-on-background font-medium mt-2">
            {s?.activeStrategies || 0} active strategies
          </div>
          <div className="text-xs text-on-surface-variant mt-3 flex justify-between">
            <span>Last cycle:</span>
            <span><TimeAgo date={s?.lastRun?.completedAt || null} /></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Briefing */}
        <section className="bg-surface-container-low border border-slate-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-border pb-4">
            <span className="material-symbols-outlined text-primary text-2xl">menu_book</span>
            <h2 className="font-headline-lg text-2xl font-bold text-on-background">Daily Briefing</h2>
          </div>
          
          <div className="space-y-6 font-ui-body">
            <div>
              <h4 className="text-sm font-semibold text-on-background mb-1">What happened?</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {s?.lastRun ? `The AI Brain completed a ${s.lastRun.runType} cycle recently.` : 'No recent brain cycles recorded.'}
                We currently have {stats.articles.published} active published articles generating traffic and potential revenue.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-on-background mb-1">What is working?</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {stats.jobs.failed === 0 ? 'All scheduled automation jobs are running successfully. ' : ''}
                {s?.activeStrategies ? `${s.activeStrategies} business strategies are actively executing.` : ''}
              </p>
            </div>

            {(stats.jobs.failed > 0 || stats.scheduler.overdueCount > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-error mb-1">What is not working?</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {stats.jobs.failed > 0 ? `There are ${stats.jobs.failed} failed background jobs requiring technical review. ` : ''}
                  {stats.scheduler.overdueCount > 0 ? `There are ${stats.scheduler.overdueCount} overdue scheduled tasks.` : ''}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-on-background mb-1">What will happen next?</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {stats.scheduler.upcoming.length > 0 
                  ? `The next scheduled event is "${stats.scheduler.upcoming[0].purpose}" at ${new Date(stats.scheduler.upcoming[0].nextRun).toLocaleTimeString()}.`
                  : 'No upcoming scheduled events.'}
              </p>
            </div>
          </div>
        </section>

        {/* Schedule & Tasks */}
        <div className="space-y-8">
          <section className="bg-surface-container border border-slate-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-lg text-xl font-bold text-on-background">Today's Automations</h2>
              <Link href="/dashboard/calendar" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            {stats.scheduler.upcoming.length > 0 ? (
              <ul className="space-y-3">
                {stats.scheduler.upcoming.map((task, i) => (
                  <li key={i} className="flex justify-between items-center py-2 border-b border-slate-border last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-on-background">{task.purpose || task.key}</span>
                      <span className="text-xs text-on-surface-variant"><TimeAgo date={task.nextRun} /></span>
                    </div>
                    <StatusDot status="healthy" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant py-4 text-center border border-dashed border-slate-border rounded-xl">No automations scheduled for today.</p>
            )}
          </section>

          <section className="bg-surface-container border border-slate-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-lg text-xl font-bold text-on-background">My Actions</h2>
              {pendingActionCount > 0 && <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-bold">{pendingActionCount} Pending</span>}
            </div>
            {stats.approvals.length > 0 ? (
              <ul className="space-y-3">
                {stats.approvals.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex flex-col gap-2 p-3 bg-surface-container-high rounded-lg border border-slate-border">
                    <div className="text-sm font-medium text-on-background">{a.proposedAction}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">{a.requestedPermission}</span>
                      <Link href={`/dashboard/actions?id=${a.id}`} className="text-xs text-primary hover:underline font-medium">Review</Link>
                    </div>
                  </li>
                ))}
                {stats.approvals.length > 3 && (
                   <li className="text-center pt-2">
                     <Link href="/dashboard/actions" className="text-xs text-on-surface-variant hover:text-primary">View all pending actions</Link>
                   </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant py-4 text-center border border-dashed border-slate-border rounded-xl flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                All caught up. No actions needed.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
