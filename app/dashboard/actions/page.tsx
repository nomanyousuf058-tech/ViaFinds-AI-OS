'use client'

import React, { useEffect, useState, useCallback } from 'react'

interface Approval {
  id: string
  proposedAction: string
  requestedPermission: string
  requiredPermission: string
  evidence: string
  status: string
  createdAt: string
}

export default function MyActionsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/brain/activity?type=approvals&limit=50')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setApprovals(json.data.map((a: any) => ({
          id: String(a.id || ''),
          proposedAction: String(a.proposed_action || a.proposedAction || 'Action'),
          requestedPermission: String(a.requested_permission || a.requestedPermission || 'Permission'),
          requiredPermission: String(a.required_permission || a.requiredPermission || ''),
          evidence: typeof a.evidence === 'object' && a.evidence !== null ? JSON.stringify(a.evidence) : String(a.evidence || ''),
          status: String(a.status || 'pending'),
          createdAt: String(a.created_at || a.createdAt || ''),
        })))
      }
    } catch (e) {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setDeciding(id)
    try {
      await fetch(`/api/brain/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: 'Decided via Owner Inbox' }),
      })
      await fetchApprovals()
    } catch (e) {
      // Ignore
    } finally {
      setDeciding(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-12 w-64 bg-surface-container animate-pulse rounded" />
        <div className="h-48 bg-surface-container animate-pulse rounded-xl" />
      </div>
    )
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const completed = approvals.filter(a => a.status !== 'pending')

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">My Actions</h1>
        <p className="font-ui-body text-on-surface-variant text-lg mt-1">
          Owner inbox. Items that require your permission or manual review.
        </p>
      </header>

      {/* Action Inbox */}
      <section>
        <h2 className="font-headline-lg text-xl font-bold text-on-background mb-4">Requires Attention</h2>
        {pending.length === 0 ? (
          <div className="py-12 text-center bg-surface-container-high border border-dashed border-slate-border rounded-2xl">
            <span className="material-symbols-outlined text-5xl text-brand-green mb-4 block">check_circle</span>
            <p className="font-headline-lg text-lg text-on-background mb-1">You're all caught up!</p>
            <p className="text-on-surface-variant font-medium">No actions require your permission right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(a => {
              const isHighPriority = a.requestedPermission.toLowerCase().includes('strategy') || a.requestedPermission.toLowerCase().includes('publish')
              return (
                <div key={a.id} className="bg-surface-container border border-slate-border rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isHighPriority ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'}`}>
                        <span className="material-symbols-outlined">{isHighPriority ? 'warning' : 'rule'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-headline-lg text-lg text-on-background font-bold">{a.proposedAction}</h3>
                          {isHighPriority && <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-error/20 text-error border border-error/30 rounded-full">High Priority</span>}
                        </div>
                        <p className="text-sm text-on-surface-variant">
                          The Brain requires <strong className="text-on-background">{a.requestedPermission}</strong> permission to proceed.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {a.evidence && (
                    <div className="mb-6 p-4 bg-surface-container-high rounded-xl border border-slate-border">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Why is this needed?</p>
                      <p className="text-sm text-on-background">{a.evidence}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-border/50">
                    <button
                      onClick={() => decide(a.id, 'approved')}
                      disabled={deciding === a.id}
                      className="px-6 py-2.5 bg-brand-green text-deep-navy font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg hover:bg-brand-green/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {deciding === a.id ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">check</span>}
                      Approve Action
                    </button>
                    <button
                      onClick={() => decide(a.id, 'rejected')}
                      disabled={deciding === a.id}
                      className="px-6 py-2.5 bg-surface-container-high text-on-background border border-slate-border font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-surface-variant transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Completed Actions */}
      {completed.length > 0 && (
        <section className="mt-12">
          <h2 className="font-headline-lg text-lg font-bold text-on-background mb-4 text-on-surface-variant">Recent Decisions</h2>
          <div className="space-y-3 opacity-70">
            {completed.slice(0, 5).map(a => (
              <div key={a.id} className="bg-surface-container border border-slate-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-on-background font-medium">{a.proposedAction}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${
                  a.status === 'approved' ? 'bg-brand-green/20 text-brand-green border-brand-green/30'
                  : 'bg-error/20 text-error border-error/30'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
