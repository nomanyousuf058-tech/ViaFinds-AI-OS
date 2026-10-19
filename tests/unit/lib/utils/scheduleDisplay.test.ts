import { describe, it, expect } from '@jest/globals'
import {
  getScheduleLabel,
  SCHEDULE_STATE_COLORS,
} from '@/lib/utils/scheduleDisplay'

/**
 * Regression tests for the Next Trigger display (Issue F).
 *
 * The old Today page showed a hardcoded "Every 6 Hours" string. The label
 * must now be derived from the persisted brain_schedules.next_run column,
 * must change as time passes, and must never fall back to a fixed interval.
 */

describe('getScheduleLabel', () => {
  it('shows a real countdown for a schedule due in 30 minutes', () => {
    const next = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const label = getScheduleLabel(next, true, null, new Date())
    expect(label.label).toMatch(/Runs in 30 minutes/)
    expect(label.state).toBe('countdown')
  })

  it('shows "Runs tomorrow at ..." across a day boundary', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const label = getScheduleLabel(tomorrow.toISOString(), true, null, new Date())
    expect(label.label).toMatch(/^Runs tomorrow at /)
  })

  it('changes as time passes (countdown decreases)', () => {
    const base = new Date('2026-10-18T12:00:00Z')
    const next = new Date(base.getTime() + 40 * 60 * 1000).toISOString()
    const earlier = getScheduleLabel(next, true, null, base)
    const later = getScheduleLabel(next, true, null, new Date(base.getTime() + 10 * 60 * 1000))
    expect(earlier.state).toBe('countdown')
    expect(later.state).toBe('countdown')
    // The remaining time is smaller 10 minutes later.
    const earlierMinutes = Number(earlier.label.match(/(\d+) minutes/)?.[1] ?? Infinity)
    const laterMinutes = Number(later.label.match(/(\d+) minutes/)?.[1] ?? Infinity)
    expect(laterMinutes).toBeLessThan(earlierMinutes)
  })

  it('shows Overdue when next_run is in the past', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const label = getScheduleLabel(past, true, null, new Date())
    expect(label.state).toBe('overdue')
    expect(label.label).toMatch(/Overdue/)
  })

  it('shows "Overdue — last run failed" when overdue and last run failed', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const label = getScheduleLabel(past, true, 'failed', new Date())
    expect(label.state).toBe('overdue-failed')
    expect(label.label).toMatch(/last run failed/)
  })

  it('shows Paused for a disabled schedule regardless of next_run', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const label = getScheduleLabel(future, false, null, new Date())
    expect(label.state).toBe('paused')
    expect(label.label).toBe('Paused')
  })

  it('shows "Not scheduled" when next_run is null on an enabled schedule', () => {
    const label = getScheduleLabel(null, true, null, new Date())
    expect(label.state).toBe('not-scheduled')
    expect(label.label).toBe('Not scheduled')
  })

  it('shows "Running now" when the last run is still running', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const label = getScheduleLabel(future, true, 'running', new Date())
    expect(label.state).toBe('running')
    expect(label.label).toBe('Running now')
  })

  it('does not invent a fixed 5-hour interval for any input', () => {
    // Use a fixed reference time so the test is deterministic regardless of
    // the wall clock. A 5-hour offset from 09:00 lands at 14:00 on the same
    // day, which the helper must express in terms of the real next_run
    // value — never as a hardcoded "5 hours" interval.
    const base = new Date('2026-10-18T09:00:00Z')
    const next = new Date(base.getTime() + 5 * 60 * 60 * 1000)
    const label = getScheduleLabel(next.toISOString(), true, null, base)
    expect(label.label).not.toBe('5 hours')
    expect(label.label).toMatch(/Runs (today|in) at|Runs in \d+ (minutes|hours)/)
    expect(label.state).toBe('countdown')
  })

  it('returns an unknown state for an unparseable next_run', () => {
    const label = getScheduleLabel('not-a-date', true, null, new Date())
    expect(label.state).toBe('unknown')
    expect(label.label).toBe('Schedule unavailable')
  })

  it('provides a stable color class for every state', () => {
    for (const state of Object.keys(SCHEDULE_STATE_COLORS) as Array<keyof typeof SCHEDULE_STATE_COLORS>) {
      expect(typeof SCHEDULE_STATE_COLORS[state]).toBe('string')
      expect(SCHEDULE_STATE_COLORS[state].length).toBeGreaterThan(0)
    }
  })
})