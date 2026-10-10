'use client'

import React, { useEffect, useState, useCallback } from 'react'

interface Schedule {
  id: string
  key: string
  purpose: string
  nextRun: string | null
  lastRun: string | null
  status: string
  cronExpression: string
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const schedulesRes = await fetch('/api/brain/schedules')
      const schedJson = await schedulesRes.json()

      if (schedJson.success && Array.isArray(schedJson.data)) {
        setSchedules(schedJson.data.map((s: Record<string, unknown>) => ({
          id: String(s.id || ''),
          key: String(s.key || ''),
          purpose: String(s.purpose || ''),
          nextRun: (s.next_run as string) || (s.nextRun as string) || null,
          lastRun: (s.last_run as string) || (s.lastRun as string) || null,
          status: String(s.status || ''),
          cronExpression: String(s.cron_expression || ''),
        })))
      }
    } catch (e) {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-12 w-64 bg-surface-container animate-pulse rounded" />
        <div className="h-96 bg-surface-container animate-pulse rounded-xl" />
      </div>
    )
  }

  const formatPKT = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled'
    const d = new Date(dateString)
    return d.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) + ' PKT'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">Schedule</h1>
        <p className="font-ui-body text-on-surface-variant text-lg mt-1">
          Automation schedules and runs.
        </p>
      </header>

      {/* Scheduled Activities (Brain Schedules) */}
      <section className="bg-surface-container border border-slate-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-border pb-4">
          <span className="material-symbols-outlined text-primary text-2xl">event</span>
          <h2 className="font-headline-lg text-xl font-bold text-on-background">Configured Automations</h2>
        </div>

        {schedules.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-border rounded-xl">
            <span className="material-symbols-outlined text-4xl text-outline mb-4">event_busy</span>
            <p className="text-on-surface-variant font-medium">No schedules configured.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-border text-on-surface-variant">
                  <th className="py-3 px-4 font-medium uppercase tracking-wider text-xs">Automation</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider text-xs">Schedule</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider text-xs">Next Run (PKT)</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider text-xs">Last Run</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider text-xs text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.id} className="border-b border-slate-border/50 hover:bg-surface-container-high/50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-medium text-on-background">{s.key}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{s.purpose}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-2 bg-surface-container-high px-2 py-1 rounded border border-slate-border">
                        <span className="material-symbols-outlined text-[14px] text-outline">schedule</span>
                        <code className="text-xs text-on-background">{s.cronExpression || 'One-time'}</code>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-mono-data text-sm text-on-background">{formatPKT(s.nextRun)}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-mono-data text-xs text-on-surface-variant">{s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Never'}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${
                        s.status === 'enabled' ? 'bg-brand-green/20 text-brand-green border-brand-green/30'
                        : s.status === 'disabled' ? 'bg-surface-variant text-on-surface border-slate-border'
                        : 'bg-secondary/20 text-secondary border-secondary/30'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
