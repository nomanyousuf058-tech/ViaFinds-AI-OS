'use client'

import React, { useEffect, useState, useCallback } from 'react'

interface Approval {
  id: string
  taskId: string
  strategyId: string
  executionPlanId: string
  proposedAction: string
  requestedPermission: string
  requiredPermission: string
  evidence: string
  status: string
  decision: string | null
  decidedBy: string | null
  createdAt: string
  decidedAt: string | null
}

type Category = 'all' | 'action_required' | 'important' | 'information' | 'completed'

function categorize(a: Approval): Category {
  if (a.status === 'pending') return 'action_required'
  if (a.status === 'approved' || a.status === 'rejected') return 'completed'
  if (a.requestedPermission?.includes('strategy') || a.requestedPermission?.includes('publish')) return 'important'
  return 'information'
}

export default function AttentionPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Category>('all')
  const [deciding, setDeciding] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/brain/activity?type=approvals&limit=50')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setApprovals(json.data.map((a: Record<string, unknown>) => ({
          id: String(a.id || ''),
          taskId: String(a.task_id || a.taskId || ''),
          strategyId: String(a.strategy_id || a.strategyId || ''),
          executionPlanId: String(a.execution_plan_id || a.executionPlanId || ''),
          proposedAction: String(a.proposed_action || a.proposedAction || ''),
          requestedPermission: String(a.requested_permission || a.requestedPermission || ''),
          requiredPermission: String(a.required_permission || a.requiredPermission || ''),
          evidence: typeof a.evidence === 'object' && a.evidence !== null ? JSON.stringify(a.evidence, null, 2) : String(a.evidence || ''),
          status: String(a.status || 'pending'),
          decision: (a.decision as string) || null,
          decidedBy: (a.decided_by as string) || null,
          createdAt: String(a.created_at || a.createdAt || ''),
          decidedAt: (a.decided_at as string) || null,
        })))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setDeciding(id)
    try {
      const res = await fetch(`/api/brain/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: 'Decided via Attention Center' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Decision failed')
      await fetchApprovals()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed')
    } finally {
      setDeciding(null)
    }
  }

  const filtered = filter === 'all' ? approvals : approvals.filter(a => categorize(a) === filter)

  const counts = {
    action_required: approvals.filter(a => categorize(a) === 'action_required').length,
    important: approvals.filter(a => categorize(a) === 'important').length,
    information: approvals.filter(a => categorize(a) === 'information').length,
    completed: approvals.filter(a => categorize(a) === 'completed').length,
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Attention</h1>
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-16 bg-surface-container rounded" />
          <div className="h-32 bg-surface-container rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Attention</h1>
      <p className="font-ui-body text-ui-body text-on-surface-variant mb-6">
        Unified owner action queue. Items requiring your decision are listed here.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">{error}</div>
      )}

      {/* Category filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'action_required', 'important', 'information', 'completed'] as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-primary text-deep-navy'
                : 'border border-slate-border text-on-surface-variant hover:text-on-background'
            }`}
          >
            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
            {cat !== 'all' && counts[cat as keyof typeof counts] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{counts[cat as keyof typeof counts]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Approval list */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 block">check_circle</span>
          <p className="text-on-surface-variant">No items in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-obsidian-deep border border-slate-border rounded p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-on-background font-medium text-sm">{a.proposedAction || a.requestedPermission}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {a.requiredPermission || a.requestedPermission} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  a.status === 'pending' ? 'bg-yellow-900 text-yellow-300'
                  : a.status === 'approved' ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
                }`}>
                  {a.status}
                </span>
              </div>

              {a.evidence && (
                <p className="text-xs text-on-surface-variant mb-3 line-clamp-2">{a.evidence}</p>
              )}

              {a.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => decide(a.id, 'approved')}
                    disabled={deciding === a.id}
                    className="px-3 py-1.5 bg-green-800 text-green-200 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {deciding === a.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => decide(a.id, 'rejected')}
                    disabled={deciding === a.id}
                    className="px-3 py-1.5 bg-red-800 text-red-200 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {a.decision && a.decidedBy && (
                <p className="text-xs text-on-surface-variant mt-2">
                  Decided by {a.decidedBy} {a.decidedAt ? `at ${new Date(a.decidedAt).toLocaleString()}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
