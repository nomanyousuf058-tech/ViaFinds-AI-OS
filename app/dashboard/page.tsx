'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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

interface TodayData {
  brainStatus: BrainStatus | null
  articles: { total: number; published: number; draft: number }
  jobs: { total: number; queued: number; failed: number }
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
  recommendations: Array<{
    recommendation: string
    evidence: string
    confidence: string
    requiredAction: string
  }>
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [brainRes, statsRes] = await Promise.all([
        fetch('/api/brain/status'),
        fetch('/api/dashboard/stats'),
      ])

      const brainJson = await brainRes.json()
      const statsJson = await statsRes.json()

      let opportunities: TodayData['opportunities'] = []
      let approvals: TodayData['approvals'] = []
      let recommendations: TodayData['recommendations'] = []

      if (brainJson.success) {
        const status = brainJson.status
        const opportunitiesRes = await fetch('/api/brain/activity?type=opportunities&limit=10')
        const approvalsRes = await fetch('/api/brain/activity?type=approvals&limit=10')
        const [oppJson, apprJson] = await Promise.all([opportunitiesRes.json(), approvalsRes.json()])

        if (oppJson.success && Array.isArray(oppJson.data)) {
          opportunities = oppJson.data.map((o: Record<string, unknown>) => ({
            id: String(o.id || ''),
            title: String(o.title || ''),
            category: String(o.category || o.type || ''),
            status: String(o.status || ''),
            confidence: String(o.confidence || 'Medium'),
            potentialImpact: String(o.potential_impact || o.potentialImpact || 'Medium'),
          }))
        }
        if (apprJson.success && Array.isArray(apprJson.data)) {
          approvals = apprJson.data.map((a: Record<string, unknown>) => {
            const fmt = (val: unknown): string => {
              if (typeof val === 'string') return val;
              if (typeof val === 'object' && val !== null) {
                const o = val as Record<string, unknown>;
                return String(o.title || o.description || o.action || o.type || o.name || JSON.stringify(val));
              }
              return String(val || '');
            };
            const pa = a.proposed_action || a.proposedAction || '';
            const rp = a.requested_permission || a.requestedPermission || '';
            return {
              id: String(a.id || ''),
              proposedAction: fmt(pa),
              requestedPermission: fmt(rp),
              status: String(a.status || 'pending'),
              createdAt: String(a.created_at || a.createdAt || ''),
            };
          })
        }
      }

      setData({
        brainStatus: brainJson.success ? brainJson.status : null,
        articles: statsJson.articles || { total: 0, published: 0, draft: 0 },
        jobs: statsJson.jobs || { total: 0, queued: 0, failed: 0 },
        opportunities,
        approvals,
        recommendations: [],
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

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-headline-xl text-headline-xl text-on-background">Today</h1>
        {s && <StatusBadge state={s.brainState} />}
      </div>
      <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">
        What does your business need from you today?
      </p>

      {/* A. Brain Status */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Brain Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">State</p>
            <p className="text-on-background font-medium">{s?.brainState || 'Unknown'}</p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Current Strategy</p>
            <p className="text-on-background font-medium text-sm">{s?.currentStrategy || 'No strategy set'}</p>
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Last Brain Cycle</p>
            <p className="text-on-background font-medium text-sm">
              {s?.lastRun ? `${s.lastRun.runType} (${s.lastRun.status})` : 'No runs yet'}
            </p>
            {s?.lastRun && <TimeAgo date={s.lastRun.completedAt || s.lastRun.startedAt} />}
          </div>
          <div className="bg-obsidian-deep border border-slate-border rounded p-4">
            <p className="text-xs text-on-surface-variant mb-1">Providers</p>
            <p className="text-on-background font-medium text-sm">
              {s ? `${s.providersConfigured} configured` : 'Unknown'}
            </p>
          </div>
        </div>
      </section>

      {/* B. Today's Activities */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Today's Activities</h2>
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
            {data.opportunities.slice(0, 5).map((o) => (
              <div key={o.id} className="bg-obsidian-deep border border-slate-border rounded p-3">
                <div className="flex items-center justify-between">
                  <p className="text-on-background text-sm font-medium">{o.title}</p>
                  <span className="text-xs text-on-surface-variant">{o.confidence} confidence</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{o.category} · {o.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm">No verified opportunities detected yet.</p>
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
