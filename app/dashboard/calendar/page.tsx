'use client'

import React, { useEffect, useState, useCallback } from 'react'

interface BrainRun {
  id: string
  runType: string
  trigger: string
  status: string
  startedAt: string
  completedAt: string | null
  observations: unknown[]
  results: unknown
}

interface Activity {
  id: string
  type: string
  title: string
  status: string
  createdAt: string
  completedAt: string | null
  linkedEntity: string | null
  result: string | null
}

interface Schedule {
  id: string
  key: string
  purpose: string
  nextRun: string | null
  lastRun: string | null
  status: string
  cronExpression: string
}

export default function CalendarPage() {
  const [runs, setRuns] = useState<BrainRun[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [runsRes, activityRes, schedulesRes] = await Promise.all([
        fetch('/api/brain/activity?type=runs&limit=30'),
        fetch('/api/brain/activity?type=activities&limit=30'),
        fetch('/api/brain/schedules'),
      ])
      const [runsJson, actJson, schedJson] = await Promise.all([runsRes.json(), activityRes.json(), schedulesRes.json()])

      if (runsJson.success && Array.isArray(runsJson.data)) {
        setRuns(runsJson.data.map((r: Record<string, unknown>) => ({
          id: String(r.id || ''),
          runType: String(r.run_type || r.runType || 'cycle'),
          trigger: String(r.trigger || ''),
          status: String(r.status || ''),
          startedAt: String(r.started_at || r.startedAt || ''),
          completedAt: (r.completed_at as string) || (r.completedAt as string) || null,
          observations: (r.observations as unknown[]) || [],
          results: r.results || null,
        })))
      }

      if (actJson.success && Array.isArray(actJson.data)) {
        setActivities(actJson.data.map((a: Record<string, unknown>) => ({
          id: String(a.id || ''),
          type: String(a.type || a.category || ''),
          title: String(a.title || ''),
          status: String(a.status || ''),
          createdAt: String(a.created_at || a.createdAt || ''),
          completedAt: (a.completed_at as string) || (a.completedAt as string) || null,
          linkedEntity: (a.linked_entity as string) || null,
          result: (a.result as string) || null,
        })))
      }

      if (schedJson.success && Array.isArray(schedJson.data)) {
        setSchedules(schedJson.data.map((s: Record<string, unknown>) => ({
          id: String(s.id || ''),
          key: String(s.key || ''),
          purpose: String(s.purpose || ''),
          nextRun: (s.next_run as string) || null,
          lastRun: (s.last_run as string) || null,
          status: String(s.status || ''),
          cronExpression: String(s.cron_expression || ''),
        })))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Calendar</h1>
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-16 bg-surface-container rounded" />
          <div className="h-48 bg-surface-container rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Calendar</h1>
      <p className="font-ui-body text-ui-body text-on-surface-variant mb-6">
        Unified Brain activity timeline. Shows all Brain runs, tasks, and scheduled activities.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">{error}</div>
      )}

      {/* Brain Runs */}
      <section className="mb-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Brain Runs</h2>
        {runs.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No Brain runs recorded yet. Run a Wake Up or Brain cycle to start.</p>
        ) : (
          <div className="space-y-2">
            {runs.map(r => (
              <div key={r.id} className="bg-obsidian-deep border border-slate-border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      r.status === 'completed' ? 'bg-green-500'
                      : r.status === 'running' ? 'bg-blue-500 animate-pulse'
                      : r.status === 'failed' ? 'bg-red-500'
                      : 'bg-gray-500'
                    }`} />
                    <span className="text-on-background text-sm font-medium">{r.runType}</span>
                    <span className="text-xs text-on-surface-variant">({r.trigger})</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.status === 'completed' ? 'bg-green-900 text-green-300'
                    : r.status === 'running' ? 'bg-blue-900 text-blue-300'
                    : r.status === 'failed' ? 'bg-red-900 text-red-300'
                    : 'bg-gray-800 text-gray-300'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-on-surface-variant">
                  <span>Started: {r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</span>
                  <span>Completed: {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activities */}
      <section>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Activities</h2>
        {activities.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No activities recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="bg-obsidian-deep border border-slate-border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-on-background text-sm font-medium">{a.title || a.type}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {a.type} · {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === 'completed' ? 'bg-green-900 text-green-300'
                    : a.status === 'failed' ? 'bg-red-900 text-red-300'
                    : 'bg-blue-900 text-blue-300'
                  }`}>
                    {a.status}
                  </span>
                </div>
                {a.linkedEntity && (
                  <p className="text-xs text-on-surface-variant mt-1">Linked: {a.linkedEntity}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scheduled Activities (Brain Schedules) */}
      <section className="mt-8">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Scheduled Activities</h2>
        {schedules.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No schedules configured. Add schedules via Brain settings.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map(s => (
              <div key={s.id} className="bg-obsidian-deep border border-slate-border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-on-background text-sm font-medium">{s.purpose}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Key: {s.key} · Cron: {s.cronExpression || '—'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === 'enabled' ? 'bg-green-900 text-green-300'
                    : s.status === 'disabled' ? 'bg-gray-800 text-gray-300'
                    : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-on-surface-variant">
                  <span>Next Run: {s.nextRun ? new Date(s.nextRun).toLocaleString() : 'Not scheduled'}</span>
                  <span>Last Run: {s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Never'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
