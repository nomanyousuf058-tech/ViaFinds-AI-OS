'use client'

import { useEffect, useState } from 'react'

/**
 * DB Health widget for the dashboard sidebar.
 *
 * The previous implementation was static: it rendered an emerald "Healthy"
 * badge and a fake "17 MB" usage bar regardless of what the database was
 * actually doing. This component performs a real probe against the existing
 * /api/health endpoint (which itself runs checkDatabaseHealth against the
 * live pool) and renders one of four honest states.
 *
 *   healthy      - DB answered and the articles table is readable.
 *   degraded     - DB answered but a dependent table is missing/unreadable.
 *   unavailable - DB unreachable, credentials rejected, timed out, or
 *                 unconfigured.
 *   unknown      - the probe has not run yet (initial render) or errored
 *                 before a state could be determined.
 *
 * No secrets or connection details are rendered.
 */
type HealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown'

type HealthPayload = {
  database?: {
    state?: HealthState
    code?: string | null
    message?: string
    latencyMs?: number | null
    checkedAt?: string
  }
}

const STATE_CONFIG: Record<
  HealthState,
  { label: string; dot: string; text: string; bar: string }
> = {
  healthy: { label: 'Healthy', dot: 'bg-emerald-500', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  degraded: { label: 'Degraded', dot: 'bg-amber-500', text: 'text-amber-400', bar: 'bg-amber-500' },
  unavailable: { label: 'Unavailable', dot: 'bg-rose-500', text: 'text-rose-400', bar: 'bg-rose-500' },
  unknown: { label: 'Unknown', dot: 'bg-slate-500', text: 'text-slate-400', bar: 'bg-slate-500' },
}

export default function DbHealthWidget() {
  const [payload, setPayload] = useState<HealthPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function probe() {
      try {
        const res = await fetch('/api/health', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (cancelled) return
        if (!res.ok) {
          setError(`Health endpoint returned ${res.status}`)
          setPayload(null)
          return
        }
        const data = (await res.json()) as HealthPayload
        if (cancelled) return
        setPayload(data)
        setError(null)
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError('Health probe failed')
        setPayload(null)
      }
    }

    probe()
    // Re-probe periodically; do not poll faster than the DB timeout allows.
    const interval = setInterval(probe, 30000)
    return () => {
      cancelled = true
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  const state: HealthState = payload?.database?.state || 'unknown'
  const cfg = STATE_CONFIG[state]
  const db = payload?.database
  const latency = db?.latencyMs != null ? `${db.latencyMs}ms` : null
  const checkedAt = db?.checkedAt ? new Date(db.checkedAt).toLocaleTimeString() : null

  return (
    <div className="bg-surface-container/60 border border-slate-border/50 rounded p-3 text-xs">
      <div className="flex items-center justify-between text-on-surface-variant mb-1.5">
        <span className="flex items-center gap-1.5 font-medium text-on-background">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${state === 'healthy' ? 'animate-pulse' : ''}`} />
          DB Health
        </span>
        <span className={`font-mono-data text-[11px] ${cfg.text} font-semibold`}>
          {cfg.label}
        </span>
      </div>

      {state === 'healthy' ? (
        <div className="w-full bg-surface-container rounded-full h-1.5 mb-2 overflow-hidden">
          <div className={`${cfg.bar} h-1.5 rounded-full`} style={{ width: '100%' }} />
        </div>
      ) : (
        <div className="w-full bg-surface-container rounded-full h-1.5 mb-2 overflow-hidden">
          <div className={`${cfg.bar} h-1.5 rounded-full`} style={{ width: state === 'degraded' ? '50%' : '100%' }} />
        </div>
      )}

      <div className="text-[11px] text-on-surface-variant leading-snug">
        <span className="block truncate">{db?.message || (error ? error : 'Probing database...')}</span>
        <span className="flex items-center justify-between mt-1">
          <span>Supabase Postgres</span>
          <span className="font-mono-data">
            {[latency, checkedAt].filter(Boolean).join(' · ') || 'PKT (UTC+5)'}
          </span>
        </span>
        {db?.code && (
          <span className="block mt-1 font-mono-data text-[10px] text-on-surface-variant/70">
            code: {db.code}
          </span>
        )}
      </div>
    </div>
  )
}