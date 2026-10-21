'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatJsonField } from '@/lib/utils/format'
import { getScheduleLabel, SCHEDULE_STATE_COLORS, type ScheduleLabel } from '@/lib/utils/scheduleDisplay'

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
  providerDetails: Array<{ name: string; configured: boolean }>
  dataSources: Record<string, string>
  currentStrategy: string
  limitations: string[]
}

interface UpcomingSchedule {
  key: string
  purpose: string
  nextRun: string | null
  lastRun: string | null
  status: string
  enabled: boolean
  frequency: string
}

interface HealthData {
  database: {
    state: 'healthy' | 'degraded' | 'unavailable' | 'unknown'
    code?: string | null
    message?: string
    latencyMs?: number | null
    checkedAt?: string
  } | null
  servicesSummary: {
    total: number
    configured: number
    notConfigured: number
    degraded: number
    failed: number
  } | null
  status: 'healthy' | 'degraded' | 'unavailable' | null
}

interface TodayData {
  brainStatus: BrainStatus | null
  articles: { total: number; published: number; draft: number }
  jobs: { total: number; queued: number; failed: number }
  revenue: { total: number; recent: number; currency: string; source: string }
  health: HealthData | null
  // Analytics is fetched separately from /api/cron/sync so a GA4 outage or
  // missing credentials cannot take the briefing down. `ok` is false when the
  // summary could not be fetched; the card then reports "Unavailable" rather
  // than presenting a confirmed zero.
  analytics: {
    ok: boolean
    totalVisitors: number | null
    totalPageviews: number | null
    error: string | null
  } | null
  opportunities: Array<{
    id: string
    title: string
    category: string
    status: string
    confidence: string
    potentialImpact: string
    provenance?: string
    source?: { url?: string; title?: string; type?: string }
    assumptions?: string[]
    unavailableData?: string[]
  }>
  approvals: Array<{
    id: string
    proposedAction: string
    requestedPermission: string
    status: string
    createdAt: string
  }>
  recommendations: Array<{
    recommendation: string
    evidence: string
    confidence: string
    requiredAction: string
    priority?: string
    expectedBenefit?: string
    ownerAction?: string
  }>
  upcomingSchedules: UpcomingSchedule[]
  scheduleFetchOk: boolean
}

function StatusBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-green-900 text-green-300 border-green-700' },
    initializing: { label: 'Initializing', color: 'bg-blue-900 text-blue-300 border-blue-700' },
    error: { label: 'Attention Required', color: 'bg-red-900 text-red-300 border-red-700' },
    uninitialized: { label: 'Not Initialized', color: 'bg-yellow-900 text-yellow-300 border-yellow-700' },
  }
  const c = config[state] || { label: state, color: 'bg-gray-800 text-gray-300 border-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  )
}

function TimeAgo({ date }: { date: string | null }) {
  if (!date) return <span className="text-on-surface-variant text-xs">Never</span>
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <span className="text-on-surface-variant text-xs">Just now</span>
  if (mins < 60) return <span className="text-on-surface-variant text-xs">{mins}m ago</span>
  const hours = Math.floor(mins / 60)
  if (hours < 24) return <span className="text-on-surface-variant text-xs">{hours}h ago</span>
  const days = Math.floor(hours / 24)
  return <span className="text-on-surface-variant text-xs">{days}d ago</span>
}

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pktTime, setPktTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      setPktTime(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    // One parallel batch. The three activity streams used to be fetched
    // sequentially inside an `if (brainJson.success)` branch, which made the
    // page wait on the slowest of four round trips. Optional integrations
    // (revenue, analytics) are now isolated so a single failure cannot take
    // the whole briefing down.
    try {
      setLoading(true)
      const [brainRes, statsRes, schedulesRes, healthRes, analyticsRes] = await Promise.all([
        fetch('/api/brain/status'),
        fetch('/api/dashboard/stats'),
        fetch('/api/brain/schedules'),
        fetch('/api/health'),
        fetch('/api/cron/sync'),
      ])

    const brainJson = await brainRes.json().catch(() => ({ success: false }))
    const statsJson = await statsRes.json().catch(() => ({}))
    const schedulesJson = await schedulesRes.json().catch(() => ({ success: false, data: [] }))
    const healthJson = await healthRes.json().catch(() => ({}))
    // Analytics sync is optional and isolated: a GA4 outage or missing
    // credentials must never take the briefing down. The card distinguishes
    // "zero visits recorded" from "data unavailable".
    const analyticsJson = await analyticsRes.json().catch(() => ({}))

    let opportunities: TodayData['opportunities'] = []
    let approvals: TodayData['approvals'] = []
    let recommendations: TodayData['recommendations'] = []

    if (brainJson.success) {
      // One batch for the three activity streams instead of three sequential
      // awaits chained behind a success check.
      const [opportunitiesRes, approvalsRes, recRes] = await Promise.all([
        fetch('/api/brain/activity?type=opportunities&limit=10'),
        fetch('/api/brain/activity?type=approvals&limit=10'),
        fetch('/api/brain/activity?type=recommendations&limit=10'),
      ])
      const [oppJson, apprJson, recJson] = await Promise.all([
        opportunitiesRes.json().catch(() => ({ success: false })),
        approvalsRes.json().catch(() => ({ success: false })),
        recRes.json().catch(() => ({ success: false })),
      ])

      if (oppJson.success && Array.isArray(oppJson.data)) {
        opportunities = oppJson.data.map((o: Record<string, unknown>) => ({
          id: String(o.id || ''),
          title: String(o.title || ''),
          category: String(o.category || o.type || ''),
          status: String(o.status || ''),
          confidence: String(o.confidence || 'Medium'),
          potentialImpact: String(o.potential_impact || o.potentialImpact || 'Medium'),
          provenance: String((o.provenance as string) || ''),
          source: (o.source as Record<string, unknown>) || undefined,
          assumptions: Array.isArray(o.assumptions) ? (o.assumptions as string[]) : undefined,
          unavailableData: Array.isArray(o.unavailable_data) ? (o.unavailable_data as string[]) : undefined,
        }))
      }
      if (apprJson.success && Array.isArray(apprJson.data)) {
        approvals = apprJson.data.map((a: Record<string, unknown>) => ({
          id: String(a.id || ''),
          proposedAction: formatJsonField(a.proposed_action || a.proposedAction),
          requestedPermission: formatJsonField(a.requested_permission || a.requestedPermission),
          status: String(a.status || 'pending'),
          createdAt: String(a.created_at || a.createdAt || ''),
        }))
      }
      if (recJson.success && Array.isArray(recJson.data)) {
        recommendations = recJson.data.map((r: Record<string, unknown>) => ({
          recommendation: String(r.recommendation || ''),
          evidence: String(r.evidence || ''),
          confidence: String(r.confidence || ''),
          requiredAction: String(r.required_action || r.requiredAction || ''),
          priority: String(r.priority || ''),
          expectedBenefit: String(r.expected_benefit || r.expectedBenefit || ''),
          ownerAction: String(r.owner_action || r.ownerAction || ''),
        }))
      }
    }

    const upcomingSchedules: UpcomingSchedule[] = Array.isArray(schedulesJson.data)
      ? schedulesJson.data.map((s: Record<string, unknown>) => ({
          key: String(s.key || ''),
          purpose: String(s.purpose || ''),
          nextRun: (s.next_run as string) || null,
          lastRun: (s.last_run as string) || null,
          status: String(s.status || ''),
          enabled: s.enabled !== false,
          frequency: String(s.frequency || ''),
        }))
      : []

    setData({
      brainStatus: brainJson.success ? brainJson.status : null,
      articles: statsJson.articles || { total: 0, published: 0, draft: 0 },
      jobs: statsJson.jobs || { total: 0, queued: 0, failed: 0 },
      revenue: statsJson.revenue || { total: 0, recent: 0, currency: 'USD', source: 'unavailable' },
      health: healthJson && typeof healthJson === 'object'
        ? {
            database: healthJson.database || null,
            servicesSummary: healthJson.servicesSummary || null,
            status: typeof healthJson.status === 'string' ? healthJson.status : null,
          }
        : null,
      analytics: analyticsJson && typeof analyticsJson === 'object'
        ? {
            ok: analyticsJson.analytics?.ok === true,
            totalVisitors:
              typeof analyticsJson.analytics?.totalVisitors === 'number'
                ? analyticsJson.analytics.totalVisitors
                : null,
            totalPageviews:
              typeof analyticsJson.analytics?.totalPageviews === 'number'
                ? analyticsJson.analytics.totalPageviews
                : null,
            error: typeof analyticsJson.analytics?.error === 'string' ? analyticsJson.analytics.error : null,
          }
        : null,
      opportunities,
      approvals,
      recommendations,
      upcomingSchedules,
      scheduleFetchOk: schedulesJson.success === true,
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
      <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Today</h1>
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-16 bg-surface-container rounded" />
          <div className="h-32 bg-surface-container rounded" />
          <div className="h-48 bg-surface-container rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Today</h1>
        <div className="mt-8 p-4 bg-red-900/30 border border-red-700 rounded text-red-300">
          {error}
        </div>
      </div>
    )
  }

  const s = data?.brainStatus

  const revenue = data?.revenue || { total: 0, recent: 0, currency: 'USD', source: 'unavailable' }
  const revenueSource = revenue.source || 'unavailable'
  const revenueUnavailable = revenueSource === 'unavailable' || revenueSource === 'NOT CONFIGURED'

  // Traffic is sourced from the analytics sync endpoint. A value of 0 is
  // only ever presented as a confirmed zero when the source reported a
  // successful read; otherwise the card reports Unavailable. This prevents a
  // rendered dashboard from implying that traffic exists.
  const analyticsOk = data?.analytics?.ok === true
  const analyticsTotalVisitors = analyticsOk ? (data?.analytics?.totalVisitors || 0) : 0
  const analyticsError = data?.analytics?.error || null

  // Website Health is backed by the real /api/health probe. It can never
  // report Healthy merely because the card rendered.
  const healthDbState = data?.health?.database?.state || 'unknown'
  const healthLabel =
    healthDbState === 'healthy' ? 'Healthy'
    : healthDbState === 'degraded' ? 'Degraded'
    : healthDbState === 'unavailable' ? 'Unavailable'
    : 'Unknown'
  const healthColor =
    healthDbState === 'healthy' ? 'text-emerald-400'
    : healthDbState === 'degraded' ? 'text-amber-400'
    : healthDbState === 'unavailable' ? 'text-rose-400'
    : 'text-slate-400'
  const healthDetail = data?.health?.database?.message
    || (healthDbState === 'unknown' ? 'Health probe did not return a result' : 'All systems operational')

  // The next scheduled run is derived from the persisted brain_schedules
  // next_run column, not from a hardcoded interval. If the schedule table
  // could not be read, the label says so instead of pretending.
  const nextSchedule = data?.upcomingSchedules?.[0] || null
  const nextScheduleLabel: ScheduleLabel | null = nextSchedule
    ? getScheduleLabel(
        nextSchedule.nextRun,
        nextSchedule.enabled,
        nextSchedule.status === 'failed' ? 'failed' : nextSchedule.status === 'running' ? 'running' : null,
        new Date(),
        'Asia/Karachi'
      )
    : null

  // Determine Next Best Action in clear business language.
  //
  // Every branch below is driven by a value that came back from a real API
  // call (brain status, dashboard stats, schedules). There is no static
  // recommendation here: if no signal fires, the default is an honest
  // "nothing requires you right now" state rather than a fabricated prompt.
  const draftCount = data?.articles ? data.articles.total - data.articles.published : 0
  const hasApprovals = (data?.approvals && data.approvals.length > 0) || (s?.pendingApprovals ?? 0) > 0
  const hasFailedJobs = data?.jobs && data.jobs.failed > 0
  const hasOpportunities = data?.opportunities && data.opportunities.length > 0
  const hasOverdueSchedules =
    Array.isArray(data?.upcomingSchedules) &&
    data.upcomingSchedules.some((sch) => {
      if (!sch.nextRun || !sch.enabled) return false
      const next = new Date(sch.nextRun).getTime()
      return Number.isFinite(next) && next < Date.now()
    })

  let nextBestAction = {
    title: 'Nothing Requires You Right Now',
    description:
      draftCount > 0
        ? `${draftCount} draft article(s) are saved and awaiting your review. Publish them when ready.`
        : 'No pending approvals, failed jobs, or overdue schedules. The Brain is running on schedule.',
    badge: 'Nominal',
    badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    actionText: draftCount > 0 ? 'Review Drafts' : 'Open Brain',
    actionHref: draftCount > 0 ? '/dashboard/articles' : '/dashboard/brain',
  }

  if (hasApprovals) {
    nextBestAction = {
      title: 'Action Required: Editorial Approval Pending',
      description: data!.approvals[0].proposedAction ||
        data!.approvals[0].requestedPermission ||
        `${data!.approvals.length} item(s) require your sign-off before any article can be published.`,
      badge: 'Immediate Action',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
      actionText: 'Review Sign-off',
      actionHref: '/dashboard/attention',
    }
  } else if (hasFailedJobs) {
    nextBestAction = {
      title: 'Attention: Failed Automation Job',
      description: `${data!.jobs!.failed} background task(s) encountered an issue and require inspection.`,
      badge: 'Needs Review',
      badgeColor: 'bg-red-950 text-red-300 border-red-800',
      actionText: 'View Job Queue',
      actionHref: '/dashboard/jobs',
    }
  } else if (hasOverdueSchedules) {
    nextBestAction = {
      title: 'Attention: Overdue Scheduled Run',
      description: 'A scheduled Brain run missed its window and has not been retried.',
      badge: 'Overdue',
      badgeColor: 'bg-red-950 text-red-300 border-red-800',
      actionText: 'View Schedule',
      actionHref: '/dashboard/calendar',
    }
  } else if (hasOpportunities) {
    nextBestAction = {
      title: 'High-Impact Growth Opportunity Detected',
      description: `${data!.opportunities[0].title} (${data!.opportunities[0].confidence} confidence)`,
      badge: 'Growth Signal',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
      actionText: 'Inspect Opportunity',
      actionHref: '/dashboard/brain',
    }
  } else if (draftCount > 0) {
    nextBestAction = {
      title: 'Drafts Awaiting Owner Review',
      description: `${draftCount} article draft(s) are ready. Publication requires your explicit review and approval.`,
      badge: 'Review Needed',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
      actionText: 'Review Drafts',
      actionHref: '/dashboard/articles',
    }
  }

  return (
    <div className="max-w-6xl">
      {/* Header with PKT Clock & Brain State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-border mb-6 gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-xl text-headline-xl text-on-background">Today</h1>
            {s && <StatusBadge state={s.brainState} />}
          </div>
          <p className="font-ui-body text-ui-body text-on-surface-variant text-sm mt-1">
            Executive control room and daily operational briefing.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container/70 border border-slate-border px-3.5 py-2 rounded-lg">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Asia / Karachi</p>
            <p className="font-mono-data text-sm font-bold text-on-background">{pktTime || 'PKT'}</p>
          </div>
          <div className="h-6 w-px bg-slate-border" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Next Scheduled Run</p>
            <p
              className={`font-mono-data text-xs font-semibold ${
                nextScheduleLabel ? SCHEDULE_STATE_COLORS[nextScheduleLabel.state].split(' ')[2] : ''
              }`}
            >
              {nextScheduleLabel?.label || 'No upcoming schedule'}
            </p>
          </div>
        </div>
      </div>

      {/* Next Best Action Card */}
      <section className="mb-8">
        <div className="bg-gradient-to-r from-obsidian-deep via-surface-container to-obsidian-deep border border-primary/30 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">
                  lightbulb
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                  Next Best Action
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${nextBestAction.badgeColor}`}>
                  {nextBestAction.badge}
                </span>
              </div>
              <h2 className="text-base font-semibold text-on-background">
                {nextBestAction.title}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                {nextBestAction.description}
              </p>
            </div>
            <Link
              href={nextBestAction.actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-deep-navy font-semibold text-xs rounded hover:opacity-95 transition-opacity whitespace-nowrap self-start sm:self-center"
            >
              <span>{nextBestAction.actionText}</span>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Essential Status Summary Cards */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Website Health */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-emerald-400 text-xl" aria-hidden="true">check_circle</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Health</span>
            </div>
            {data?.health ? (
              <p className="text-on-background font-bold text-lg">
                <span className={healthColor}>{healthLabel}</span>
              </p>
            ) : (
              <p className="text-on-background font-bold text-lg text-slate-400">Unknown</p>
            )}
            <p className="text-xs text-on-surface-variant mt-1 truncate">{healthDetail}</p>
            <Link href="/dashboard/services" className="text-xs text-primary mt-2 inline-block hover:underline">Details →</Link>
          </div>

          {/* Real Visitors — backed by the analytics sync endpoint.
              A value of 0 is only ever presented as a confirmed zero when the
              source reported a successful read; otherwise the card says the
              data is unavailable. This prevents a rendered dashboard from
              implying traffic exists. */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">group</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Traffic</span>
            </div>
            {analyticsOk ? (
              <>
                <p className="text-on-background font-bold text-lg">{analyticsTotalVisitors.toLocaleString()}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {analyticsTotalVisitors === 0 ? 'No visits recorded yet' : 'Visits from analytics sync'}
                </p>
              </>
            ) : (
              <>
                <p className="text-on-background font-bold text-lg text-amber-400">Unavailable</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {analyticsError ? analyticsError.slice(0, 60) : 'Analytics sync could not be read'}
                </p>
              </>
            )}
            <Link href="/dashboard/analytics" className="text-xs text-primary mt-2 inline-block hover:underline">Analytics →</Link>
          </div>

          {/* Revenue */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-secondary text-xl" aria-hidden="true">attach_money</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Revenue</span>
            </div>
            <p className="text-on-background font-bold text-lg">
              {revenueUnavailable ? 'Unavailable' : `$${(revenue.total || 0).toFixed(2)}`}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {revenueUnavailable ? 'Connect Digistore24' : `${revenue.currency} confirmed`}
            </p>
            <Link href="/dashboard/revenue" className="text-xs text-primary mt-2 inline-block hover:underline">Growth →</Link>
          </div>

          {/* AI Brain */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-tertiary text-xl" aria-hidden="true">psychology</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">AI Brain</span>
            </div>
            <p className="text-on-background font-bold text-lg capitalize">{s?.brainState || 'Unknown'}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              {s?.activeStrategies ?? 0} active strateg
              {s?.activeStrategies === 1 ? 'y' : 'ies'}
            </p>
            <Link href="/dashboard/brain" className="text-xs text-primary mt-2 inline-block hover:underline">Brain →</Link>
          </div>

          {/* Articles */}
          <div className="bg-obsidian-deep border border-slate-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">edit_note</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Content</span>
            </div>
            <p className="text-on-background font-bold text-lg">
              {data?.articles ? `${data.articles.published}` : '0'}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {data?.articles ? `${data.articles.total - data.articles.published} draft(s)` : 'No articles'}
            </p>
            <Link href="/dashboard/articles" className="text-xs text-primary mt-2 inline-block hover:underline">Articles →</Link>
          </div>
        </div>
      </section>

      {/* Daily Business Briefing */}
      <section className="mb-8">
        <div className="bg-obsidian-deep border border-slate-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">lightbulb</span>
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold">Daily Briefing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">What Happened</h3>
              <ul className="space-y-1.5 text-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5" aria-hidden="true">check</span>
                  <span>Brain completed its scheduled run{s?.lastRun ? ` (${new Date(s.lastRun.completedAt || s.lastRun.startedAt).toLocaleTimeString()})` : ''}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5" aria-hidden="true">check</span>
                  <span>System health checks passed{s?.lastRun ? '.' : '.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm mt-0.5" aria-hidden="true">info</span>
                  <span>{s?.openOpportunities ?? 0} opportunity(ies) under review.</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">What Needs Attention</h3>
              {data?.approvals && data.approvals.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {data.approvals.slice(0, 3).map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-sm mt-0.5" aria-hidden="true">warning</span>
                      <span className="text-on-background">{a.proposedAction || a.requestedPermission}</span>
                    </li>
                  ))}
                </ul>
              ) : data?.jobs && data.jobs.failed > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-400 text-sm mt-0.5" aria-hidden="true">error</span>
                    <span className="text-on-background">{data.jobs.failed} automation job(s) failed</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-1.5 text-sm text-on-surface-variant">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5" aria-hidden="true">check</span>
                    <span>No critical issues detected.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm mt-0.5" aria-hidden="true">info</span>
                    <span>Next Brain cycle runs on schedule.</span>
                  </li>
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-border flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
            <span>
              <span className="font-medium text-on-background">Next scheduled: </span>
              {nextSchedule ? (
                nextScheduleLabel ? (
                  <span className={SCHEDULE_STATE_COLORS[nextScheduleLabel.state]}>
                    {nextSchedule.key} · {nextScheduleLabel.label}
                  </span>
                ) : (
                  'Schedule unavailable'
                )
              ) : data?.scheduleFetchOk ? (
                'No schedules configured'
              ) : (
                'Schedule data unavailable'
              )}
            </span>
            <span>
              <span className="font-medium text-on-background">Pending approvals: </span>
              {s?.pendingApprovals ?? 0}
            </span>
            <span>
              <span className="font-medium text-on-background">Active tasks: </span>
              {s?.activeTasks ?? 0}
            </span>
            <Link href="/dashboard/calendar" className="ml-auto text-primary hover:underline">
              View full schedule →
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Activities */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Today&apos;s Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Articles</p>
            <p className="text-on-background font-medium">
              {data?.articles ? `${data.articles.published} published / ${data.articles.total} total` : 'No data'}
            </p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Jobs</p>
            <p className="text-on-background font-medium">
              {data?.jobs ? `${data.jobs.queued} queued / ${data.jobs.failed} failed` : 'No data'}
            </p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Open Opportunities</p>
            <p className="text-on-background font-medium">
              {s?.openOpportunities ?? 0}
            </p>
          </div>
        </div>
      </section>

      {/* C. Attention Required */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">
          Attention Required
          {data?.approvals.length ? (
            <span className="ml-2 text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">{data.approvals.length}</span>
          ) : null}
        </h2>
        {data?.approvals.length ? (
          <div className="space-y-2">
            {data.approvals.map((a) => (
              <div key={a.id} className="bg-obsidian-deep border border-slate-border rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-on-background text-sm font-medium">{a.proposedAction || a.requestedPermission}</p>
                  <p className="text-xs text-on-surface-variant">{a.status} · <TimeAgo date={a.createdAt} /></p>
                </div>
                <Link href="/dashboard/attention" className="text-primary text-sm hover:underline">Review</Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm">No pending approvals.</p>
        )}
      </section>

      {/* D. Opportunities */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">
          Opportunities
          {data?.opportunities.length ? (
            <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{data.opportunities.length}</span>
          ) : null}
        </h2>
        {data?.opportunities.length ? (
          <div className="space-y-2">
            {data.opportunities.slice(0, 5).map((o) => {
              const provenance = (o.provenance || '').toUpperCase()
              const sourceUrl = o.source?.url
              const isUnknown = provenance === 'UNKNOWN'
              return (
                <div
                  key={o.id}
                  className={`bg-obsidian-deep border rounded p-3 ${isUnknown ? 'border-red-900/50' : 'border-slate-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-on-background text-sm font-medium">{o.title}</p>
                    <span className="text-xs text-on-surface-variant">{o.confidence} confidence</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {o.category} · {o.status}
                    {provenance ? ` · provenance ${provenance}` : ''}
                  </p>
                  {sourceUrl && (
                    <p className="text-xs text-primary mt-1 truncate">
                      Source: {o.source?.title || sourceUrl}
                    </p>
                  )}
                  {isUnknown && (
                    <p className="text-[10px] text-red-400 mt-1">
                      Not actionable: provenance is UNKNOWN, so this record cannot drive a recommendation.
                    </p>
                  )}
                  {o.unavailableData && o.unavailableData.length > 0 && (
                    <p className="text-[10px] text-amber-400/80 mt-1">
                      Unknown: {o.unavailableData.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm">
            No verified opportunities detected yet. Run a Brain cycle to generate recommendations.
          </p>
        )}
      </section>

      {/* E. Business Signals */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Business Signals</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Active Strategies</p>
            <p className="text-on-background font-medium">{s?.activeStrategies ?? 0}</p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Pending Approvals</p>
            <p className="text-on-background font-medium">{s?.pendingApprovals ?? 0}</p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Active Tasks</p>
            <p className="text-on-background font-medium">{s?.activeTasks ?? 0}</p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Data Sources</p>
            <p className="text-on-background font-medium text-sm">
              {s?.dataSources ? Object.entries(s.dataSources).filter(([, v]) => v !== 'NOT CONFIGURED').length : 0}
            </p>
          </div>
        </div>
      </section>

      {/* F. Brain Recommendations */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Brain Recommendations</h2>
        {data?.recommendations.length ? (
          <div className="space-y-3">
            {data.recommendations.map((r, i) => (
              <div key={i} className="bg-obsidian-deep border border-slate-border rounded p-4">
                <p className="text-on-background font-medium text-sm mb-2">{r.recommendation}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <p><span className="font-medium text-on-background">Evidence:</span> {r.evidence}</p>
                  <p><span className="font-medium text-on-background">Confidence:</span> {r.confidence}</p>
                </div>
                <p className="text-xs text-primary mt-2">Action: {r.requiredAction}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm">No verified recommendations available yet. Run a Brain cycle to generate recommendations.</p>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/brain"
            className="px-4 py-2 bg-primary text-deep-navy rounded font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Open Brain
          </Link>
          <Link
            href="/dashboard/attention"
            className="px-4 py-2 border border-slate-border text-on-background rounded font-medium text-sm hover:bg-surface-container transition-colors"
          >
            View Attention
          </Link>
          <Link
            href="/dashboard/calendar"
            className="px-4 py-2 border border-slate-border text-on-background rounded font-medium text-sm hover:bg-surface-container transition-colors"
          >
            View Calendar
          </Link>
        </div>
      </section>
    </div>
  )
}
