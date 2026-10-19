'use client'

import React, { useEffect, useState, useCallback } from 'react'
import SchedulePage, { type ScheduleRow } from '@/components/SchedulePage'

interface BrainRun {
  id: string
  runType: string
  trigger: string
  status: string
  startedAt: string
  completedAt: string | null
}

export default function CalendarPageClient() {
  const [runs, setRuns] = useState<BrainRun[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [runsRes, schedulesRes] = await Promise.all([
        fetch('/api/brain/activity?type=runs&limit=30'),
        fetch('/api/brain/schedules'),
      ])
      const [runsJson, schedJson] = await Promise.all([runsRes.json(), schedulesRes.json()])

      if (runsJson.success && Array.isArray(runsJson.data)) {
        setRuns(runsJson.data.map((r: Record<string, unknown>) => ({
          id: String(r.id || ''),
          runType: String(r.run_type || r.runType || 'cycle'),
          trigger: String(r.trigger || ''),
          status: String(r.status || ''),
          startedAt: String(r.started_at || r.startedAt || ''),
          completedAt: (r.completed_at as string) || (r.completedAt as string) || null,
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
          enabled: s.enabled !== false,
          frequency: String(s.frequency || ''),
          handler: String(s.handler || ''),
          lastError: (s.last_error as string) || (s.lastError as string) || null,
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
      <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Schedule</h1>
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-16 bg-surface-container rounded" />
          <div className="h-48 bg-surface-container rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Schedule</h1>
        <div className="mt-8 p-4 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      </div>
    )
  }

  return <SchedulePage schedules={schedules} runs={runs} />
}