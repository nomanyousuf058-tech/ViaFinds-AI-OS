import React, { useState } from 'react'

/**
 * Run Now button for a single Brain schedule.
 *
 * Invokes /api/brain/schedules/[key]/run, which atomically claims the
 * schedule, runs the mapped Brain phase through the existing brainCycle
 * path, and persists last_run / next_run. It refuses to launch when the
 * schedule is disabled or already running, and it never pretends an
 * accepted job has completed.
 */
interface RunNowButtonProps {
  scheduleKey: string
  schedulePurpose: string
  disabled?: boolean
  onRunComplete?: (result: {
    success: boolean
    status?: string
    error?: string
    nextRun?: string | null
  }) => void
}

export function RunNowButton({ scheduleKey, schedulePurpose, disabled, onRunComplete }: RunNowButtonProps) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | {
    success: boolean
    status?: string
    error?: string
    nextRun?: string | null
  }>(null)

  const handleRun = async () => {
    if (running || disabled) return
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch(`/api/brain/schedules/${scheduleKey}/run`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      const next = {
        success: !!json.success,
        status: json.execution?.status,
        error: json.error,
        nextRun: json.nextRun,
      }
      setResult(next)
      onRunComplete?.(next)
    } catch (e) {
      const next = { success: false, error: e instanceof Error ? e.message : 'Network error' }
      setResult(next)
      onRunComplete?.(next)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={running || disabled}
        title={`Run "${schedulePurpose}" now`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-data font-bold uppercase tracking-wider rounded transition-colors ${
          running
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : disabled
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-primary text-deep-navy hover:bg-primary/90'
        }`}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          {running ? 'progress_activity' : 'play_arrow'}
        </span>
        {running ? 'Running' : 'Run Now'}
      </button>
      {result && (
        <span
          className={`text-xs font-mono-data ${
            result.success ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {result.success ? `Done${result.status ? ` (${result.status})` : ''}` : result.error || 'Failed'}
        </span>
      )}
    </div>
  )
}

export default RunNowButton