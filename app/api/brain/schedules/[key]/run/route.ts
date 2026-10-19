import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { brainRepository } from '@/lib/db/repositories/brain'
import { brainCycle } from '@/lib/brain/brainCycle'
import { logger } from '@/lib/logger'

/**
 * Run Now for a single Brain schedule.
 *
 * This is NOT a new scheduler. It invokes the existing authorized execution
 * path for one schedule:
 *   1. Atomically claim the schedule (enabled, not already running).
 *   2. Run the phase mapped to the schedule's handler via brainCycle.
 *   3. Persist last_run / next_run from the schedule's own frequency.
 *   4. Release the claim.
 *
 * A rejected or disabled schedule returns 409 with a plain-language reason.
 * Concurrent Run Now calls are serialized by the claim: the loser gets a
 * "already running" response instead of launching a duplicate.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { key } = await params

  try {
    const schedule = await brainRepository.getSchedule(key)
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: `Schedule "${key}" does not exist.`, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (schedule.enabled !== true) {
      return NextResponse.json(
        {
          success: false,
          error: `"${key}" is paused. It will not run until it is enabled.`,
          code: 'PAUSED',
          schedule: {
            key: schedule.key,
            purpose: schedule.purpose,
            enabled: schedule.enabled,
            status: schedule.status,
            nextRun: schedule.next_run,
            lastRun: schedule.last_run,
          },
        },
        { status: 409 }
      )
    }

    const claimed = await brainRepository.claimScheduleForRun(key)
    if (!claimed) {
      return NextResponse.json(
        {
          success: false,
          error: `"${key}" is already running. Please wait for it to finish before running it again.`,
          code: 'ALREADY_RUNNING',
          schedule: {
            key: schedule.key,
            purpose: schedule.purpose,
            status: schedule.status,
          },
        },
        { status: 409 }
      )
    }

    const handler = String(claimed.handler || '')
    const phaseMap: Record<string, string> = {
      'brain_cycle:health': 'health',
      'brain_cycle:revenue': 'revenue',
      'brain_cycle:opportunities': 'opportunities',
      'brain_cycle:partners': 'partners',
      'brain_cycle:research': 'research',
      'brain_cycle:strategy_review': 'strategy_review',
      'brain_cycle:learning': 'learning',
      'brain_cycle:schedules': 'schedules',
    }
    const phase = phaseMap[handler]
    if (!phase) {
      await brainRepository.releaseScheduleClaim(key)
      return NextResponse.json(
        {
          success: false,
          error: `Schedule "${key}" has no mappable execution phase (handler: ${handler || 'none'}).`,
          code: 'NO_PHASE',
        },
        { status: 422 }
      )
    }

    let result: Awaited<ReturnType<typeof brainCycle.runPhaseByName>>
    let executionError: string | null = null
    try {
      result = await brainCycle.runPhaseByName(phase, 'manual')
    } catch (e) {
      executionError = e instanceof Error ? e.message : String(e)
      result = {
        runId: '',
        correlationId: '',
        status: 'failed',
        observations: [],
        actions: [],
        failures: [executionError],
        results: {},
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
    }

    const outcome: 'completed' | 'failed' | 'partial' =
      result.status === 'failed' ? 'failed' : result.status === 'partial' ? 'partial' : 'completed'

    const recorded = await brainRepository.recordScheduleRun(key, outcome)
    if (!recorded) {
      logger.warn(`Run Now: failed to record execution result for schedule ${key}`)
    }

    // Release the claim on every exit path. A schedule left in status='running'
    // would block every future Run Now call with ALREADY_RUNNING, so the
    // release must happen even when recording failed.
    await brainRepository.releaseScheduleClaim(key)

    return NextResponse.json({
      success: outcome !== 'failed',
      schedule: {
        key: schedule.key,
        purpose: schedule.purpose,
        phase,
        handler,
      },
      execution: {
        runId: result.runId,
        status: result.status,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        observations: result.observations,
        failures: result.failures,
        results: result.results,
      },
      nextRun: claimed.next_run,
      recorded,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Run Now failed', error instanceof Error ? error : new Error(message))
    return NextResponse.json(
      { success: false, error: `Run Now failed: ${message}`, code: 'INTERNAL' },
      { status: 500 }
    )
  }
}