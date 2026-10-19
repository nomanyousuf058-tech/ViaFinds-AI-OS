/**
 * Shared schedule display helpers.
 *
 * brain_schedules.next_run is the canonical source of truth for when a
 * schedule is next expected to fire. This module turns that timestamp into
 * plain-language labels without inventing a fixed interval or deriving a
 * countdown from "now" merely to display a convenient value.
 *
 * A disabled schedule is "Paused". A schedule with no next_run is
 * "Not scheduled". An overdue schedule whose last run failed is "Overdue".
 * Anything else is "Runs in <n> <unit>" or "Runs <day> at <time>".
 */

export type ScheduleDisplayState =
  | 'paused'
  | 'not-scheduled'
  | 'overdue-failed'
  | 'overdue'
  | 'running'
  | 'countdown'
  | 'unknown'

export interface ScheduleLabel {
  label: string
  state: ScheduleDisplayState
  nextRun: Date | null
  isStale: boolean
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatTime(d: Date, timeZone?: string): string {
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
}

/**
 * Compute the display label for a schedule row.
 *
 * @param nextRun     The persisted next_run timestamp (or null).
 * @param enabled     Whether the schedule is enabled.
 * @param lastStatus  The persisted status of the most recent run, if known.
 * @param now         Reference "now" timestamp. Defaults to real now so the
 *                    same helper works for server renders and client updates.
 * @param timeZone    Optional IANA timezone for time formatting.
 */
export function getScheduleLabel(
  nextRun: string | null | undefined,
  enabled: boolean,
  lastStatus?: string | null,
  now: Date = new Date(),
  timeZone?: string
): ScheduleLabel {
  if (!enabled) {
    return { label: 'Paused', state: 'paused', nextRun: null, isStale: false }
  }

  if (!nextRun) {
    return { label: 'Not scheduled', state: 'not-scheduled', nextRun: null, isStale: false }
  }

  const next = new Date(nextRun)
  if (Number.isNaN(next.getTime())) {
    return { label: 'Schedule unavailable', state: 'unknown', nextRun: null, isStale: true }
  }

  if (lastStatus === 'running') {
    return { label: 'Running now', state: 'running', nextRun: next, isStale: false }
  }

  const diff = next.getTime() - now.getTime()

  if (diff < 0) {
    if (lastStatus === 'failed') {
      return { label: 'Overdue — last run failed', state: 'overdue-failed', nextRun: next, isStale: true }
    }
    return { label: 'Overdue', state: 'overdue', nextRun: next, isStale: true }
  }

  if (diff < 2 * MINUTE) {
    return { label: `Runs in ${Math.max(1, Math.round(diff / 1000))} second${diff >= 2000 ? 's' : ''}`, state: 'countdown', nextRun: next, isStale: false }
  }
  if (diff < HOUR) {
    return { label: `Runs in ${Math.round(diff / MINUTE)} minutes`, state: 'countdown', nextRun: next, isStale: false }
  }

  const today = startOfDay(now)
  const nextDay = startOfDay(next)
  const daysAway = Math.round((nextDay.getTime() - today.getTime()) / DAY)

  if (daysAway === 0) {
    return { label: `Runs today at ${formatTime(next, timeZone)}`, state: 'countdown', nextRun: next, isStale: false }
  }
  if (daysAway === 1) {
    return { label: `Runs tomorrow at ${formatTime(next, timeZone)}`, state: 'countdown', nextRun: next, isStale: false }
  }
  if (daysAway <= 7) {
    return { label: `Runs in ${daysAway} days`, state: 'countdown', nextRun: next, isStale: false }
  }

  return { label: `Runs ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${formatTime(next, timeZone)}`, state: 'countdown', nextRun: next, isStale: false }
}

/** Stable color classes for each display state. */
export const SCHEDULE_STATE_COLORS: Record<ScheduleDisplayState, string> = {
  paused: 'bg-slate-800 text-slate-400 border-slate-700',
  'not-scheduled': 'bg-slate-800 text-slate-400 border-slate-700',
  'overdue-failed': 'bg-red-900 text-red-300 border-red-700',
  overdue: 'bg-amber-900 text-amber-300 border-amber-700',
  running: 'bg-blue-900 text-blue-300 border-blue-700',
  countdown: 'bg-emerald-900 text-emerald-300 border-emerald-700',
  unknown: 'bg-yellow-900 text-yellow-300 border-yellow-700',
}