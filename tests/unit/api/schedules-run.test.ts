import { describe, it, expect, jest, beforeEach } from '@jest/globals'

/**
 * Regression tests for the Run Now schedule execution path (Issue B).
 *
 * POST /api/brain/schedules/[key]/run must:
 *   - refuse when the schedule does not exist (404)
 *   - refuse when the schedule is disabled (409, PAUSED)
 *   - refuse when the schedule is already running (409, ALREADY_RUNNING)
 *   - claim the schedule, run the mapped phase, and persist the result
 *   - never fabricate a successful completion when the phase failed
 */

jest.mock('@/lib/auth', () => ({
  verifyAdminToken: jest.fn(),
}))

jest.mock('@/lib/db/repositories/brain', () => ({
  brainRepository: {
    getSchedule: jest.fn(),
    claimScheduleForRun: jest.fn(),
    recordScheduleRun: jest.fn(),
    releaseScheduleClaim: jest.fn(),
  },
}))

jest.mock('@/lib/brain/brainCycle', () => ({
  brainCycle: {
    runPhaseByName: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { POST } from '@/app/api/brain/schedules/[key]/run/route'
import { brainRepository } from '@/lib/db/repositories/brain'
import { brainCycle } from '@/lib/brain/brainCycle'
import { verifyAdminToken } from '@/lib/auth'

const adminToken = () =>
  (verifyAdminToken as jest.Mock).mockResolvedValue({ sub: 'admin-1', role: 'admin' })

const baseSchedule = {
  key: 'daily_health',
  purpose: 'Daily Brain health and business assessment',
  frequency: 'daily',
  enabled: true,
  status: 'idle',
  handler: 'brain_cycle:health',
  next_run: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  last_run: null,
}

describe('POST /api/brain/schedules/[key]/run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    adminToken()
    ;(brainRepository.getSchedule as jest.Mock).mockResolvedValue(baseSchedule)
  })

  it('returns 404 when the schedule does not exist', async () => {
    ;(brainRepository.getSchedule as jest.Mock).mockResolvedValue(null)

    const res = await POST(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ key: 'missing' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.code).toBe('NOT_FOUND')
    expect(brainRepository.claimScheduleForRun).not.toHaveBeenCalled()
  })

  it('returns 409 when the schedule is disabled', async () => {
    ;(brainRepository.getSchedule as jest.Mock).mockResolvedValue({
      ...baseSchedule,
      enabled: false,
    })

    const res = await POST(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ key: 'daily_health' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('PAUSED')
    expect(body.error).toMatch(/paused/)
    expect(brainRepository.claimScheduleForRun).not.toHaveBeenCalled()
  })

  it('returns 409 when the schedule is already running', async () => {
    ;(brainRepository.claimScheduleForRun as jest.Mock).mockResolvedValue(null)

    const res = await POST(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ key: 'daily_health' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('ALREADY_RUNNING')
    expect(body.error).toMatch(/already running/)
    expect(brainCycle.runPhaseByName).not.toHaveBeenCalled()
  })

  it('runs the mapped phase and persists the result when claimed', async () => {
    ;(brainRepository.claimScheduleForRun as jest.Mock).mockResolvedValue({
      ...baseSchedule,
      status: 'running',
    })
    ;(brainCycle.runPhaseByName as jest.Mock).mockResolvedValue({
      runId: 'run-1',
      correlationId: 'corr-1',
      status: 'completed',
      observations: ['health: completed in 120ms'],
      actions: [],
      failures: [],
      results: { health: { articles: 0, jobs: 0 } },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    ;(brainRepository.recordScheduleRun as jest.Mock).mockResolvedValue(true)

    const res = await POST(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ key: 'daily_health' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.execution.runId).toBe('run-1')
    expect(body.execution.status).toBe('completed')
    expect(body.schedule.phase).toBe('health')
    expect(brainCycle.runPhaseByName).toHaveBeenCalledWith('health', 'manual')
    expect(brainRepository.recordScheduleRun).toHaveBeenCalledWith(
      'daily_health',
      'completed'
    )
  })

  it('does not pretend a failed phase succeeded', async () => {
    ;(brainRepository.claimScheduleForRun as jest.Mock).mockResolvedValue({
      ...baseSchedule,
      status: 'running',
    })
    ;(brainCycle.runPhaseByName as jest.Mock).mockResolvedValue({
      runId: 'run-2',
      correlationId: 'corr-2',
      status: 'failed',
      observations: [],
      actions: [],
      failures: ['health: provider unavailable'],
      results: {},
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    ;(brainRepository.recordScheduleRun as jest.Mock).mockResolvedValue(true)

    const res = await POST(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ key: 'daily_health' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.execution.status).toBe('failed')
    expect(body.execution.failures).toContain('health: provider unavailable')
    expect(brainRepository.recordScheduleRun).toHaveBeenCalledWith(
      'daily_health',
      'failed'
    )
  })

  it('returns 401 when the caller is not an admin', async () => {
    ;(verifyAdminToken as jest.Mock).mockResolvedValue(null)

    const res = await POST(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ key: 'daily_health' }) }
    )
    expect(res.status).toBe(401)
    expect(brainRepository.getSchedule).not.toHaveBeenCalled()
  })
})