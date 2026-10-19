import { describe, it, expect, jest, beforeEach } from '@jest/globals'

/**
 * Regression tests for recordScheduleRun (Verification Finding 4).
 *
 * next_run must be recalculated from the schedule's own frequency, and the
 * helper must be safe for every value the DB CHECK allows plus legacy or
 * unknown values. A null next_run would leave the schedule permanently
 * "not scheduled"; an unrecognised frequency must not produce a runaway
 * timestamp.
 */

jest.mock('@/lib/db/client', () => ({
  getPool: jest.fn(),
}))

import { BrainRepository } from '@/lib/db/repositories/brain'
import { getPool } from '@/lib/db/client'

const poolQuery = (getPool as jest.Mock).mockReturnValue({ query: jest.fn() })

function makeRepo(): BrainRepository {
  return new BrainRepository()
}

function mockSelect(row: Record<string, unknown>) {
  poolQuery().query.mockResolvedValueOnce({ rows: [row] })
}

describe('BrainRepository.recordScheduleRun', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets next_run ~1 day for a daily schedule', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'daily' })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    const before = Date.now()
    const ok = await repo.recordScheduleRun('daily_health', 'completed')
    const after = Date.now()

    expect(ok).toBe(true)
    const sql = poolQuery().query.mock.calls[1][0] as string
    expect(sql).toContain('UPDATE brain_schedules')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    const nextRun = new Date(params[1] as string).getTime()
    expect(nextRun).toBeGreaterThanOrEqual(before + 23 * 60 * 60 * 1000)
    expect(nextRun).toBeLessThanOrEqual(after + 25 * 60 * 60 * 1000)
  })

  it('sets next_run ~7 days for a weekly schedule', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'weekly' })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    const before = Date.now()
    await repo.recordScheduleRun('weekly_research', 'completed')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    const nextRun = new Date(params[1] as string).getTime()
    expect(nextRun).toBeGreaterThanOrEqual(before + 6 * 24 * 60 * 60 * 1000)
    expect(nextRun).toBeLessThanOrEqual(before + 8 * 24 * 60 * 60 * 1000)
  })

  it('sets next_run ~30 days for a monthly schedule', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'monthly' })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    const before = Date.now()
    await repo.recordScheduleRun('monthly_review', 'completed')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    const nextRun = new Date(params[1] as string).getTime()
    expect(nextRun).toBeGreaterThanOrEqual(before + 29 * 24 * 60 * 60 * 1000)
    expect(nextRun).toBeLessThanOrEqual(before + 31 * 24 * 60 * 60 * 1000)
  })

  it('sets next_run to null for an on_demand schedule', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'on_demand' })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    await repo.recordScheduleRun('manual_trigger', 'completed')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    expect(params[1]).toBeNull()
  })

  it('falls back to the daily interval for an unknown frequency', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'every_6_hours' })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    const before = Date.now()
    await repo.recordScheduleRun('legacy', 'completed')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    const nextRun = new Date(params[1] as string).getTime()
    expect(nextRun).toBeGreaterThanOrEqual(before + 23 * 60 * 60 * 1000)
    expect(nextRun).toBeLessThanOrEqual(before + 25 * 60 * 60 * 1000)
  })

  it('falls back to the daily interval when frequency is missing', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: null })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    const before = Date.now()
    await repo.recordScheduleRun('no_freq', 'completed')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    const nextRun = new Date(params[1] as string).getTime()
    expect(nextRun).toBeGreaterThanOrEqual(before + 23 * 60 * 60 * 1000)
    expect(nextRun).toBeLessThanOrEqual(before + 25 * 60 * 60 * 1000)
  })

  it('marks the schedule failed when outcome is failed', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'daily' })
    poolQuery().query.mockResolvedValueOnce({ rowCount: 1 })

    await repo.recordScheduleRun('daily_health', 'failed')
    const params = poolQuery().query.mock.calls[1][1] as unknown[]
    expect(params[0]).toBe('failed')
  })

  it('returns false when the schedule row does not exist', async () => {
    const repo = makeRepo()
    poolQuery().query.mockResolvedValueOnce({ rows: [] })

    const ok = await repo.recordScheduleRun('missing', 'completed')
    expect(ok).toBe(false)
  })

  it('returns false and does not throw when the query fails', async () => {
    const repo = makeRepo()
    mockSelect({ frequency: 'daily' })
    poolQuery().query.mockRejectedValueOnce(new Error('connection refused'))

    const ok = await repo.recordScheduleRun('daily_health', 'completed')
    expect(ok).toBe(false)
  })
})