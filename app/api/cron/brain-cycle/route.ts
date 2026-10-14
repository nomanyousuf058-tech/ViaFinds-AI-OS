import { NextResponse } from 'next/server'
import { brainCycle } from '@/lib/brain/brainCycle'
import { brainRepository } from '@/lib/db/repositories/brain'
import { logger } from '@/lib/logger'

/**
 * Vercel Cron Route: Brain Continuous Operating Cycle
 *
 * This is what makes the Brain operate continuously after ONE human Wake Up:
 * the external scheduler (Vercel Cron) periodically asks "is anything due?"
 * and the Brain runs the specific operating phases when a schedule is due.
 *
 * Security: Accepts Vercel cron header (x-vercel-cron: 1), Bearer CRON_SECRET,
 * or admin session to prevent unauthorized triggering.
 *
 * Safety properties:
 * - Idempotent: repeated calls with nothing due are no-ops.
 * - Concurrency-safe: a running cycle is detected and the call is skipped;
 *   the DB singleton index (idx_brain_runs_single_active_cycle) is the
 *   backstop if two calls race past the check.
 * - Retry-tolerant: if a cycle fails to create its run record, schedules
 *   are left untouched so the next tick retries.
 * - Approval-respecting: schedules with approval_required=true are never
 *   auto-executed; they are reported as awaiting approval.
 * - Recorded: every execution is a brain_runs row; schedule last/next run
 *   timestamps are updated after execution.
 */

export const maxDuration = 300

const FREQUENCY_INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
}

const HANDLER_TO_PHASE: Record<string, string> = {
  'brain_cycle:health': 'health',
  'brain_cycle:revenue': 'revenue',
  'brain_cycle:opportunities': 'opportunities',
  'brain_cycle:partners': 'partners',
  'brain_cycle:research': 'research',
  'brain_cycle:strategy_review': 'strategy_review',
  'brain_cycle:learning': 'learning',
  'brain_cycle:schedules': 'schedules',
}

export async function GET(request: Request) {
  // --- Security Check ---
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  // Vercel cron header takes precedence
  if (isVercelCron) {
    // Valid Vercel cron - proceed
  } else if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Valid Bearer token - proceed
  } else {
    // Fall back to admin session check
    try {
      const { adminOnly } = await import('@/lib/auth')
      await adminOnly()
    } catch {
      logger.warn('Unauthorized brain cron attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // --- Concurrency guard: never run two cycles at once ---
    const running = await brainRepository.getRunningCycleRun()
    if (running) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'cycle already running',
        runningRunId: running.id,
      })
    }

    // --- Which schedules are due? ---
    const now = Date.now()
    const schedules = await brainRepository.listSchedules(true)
    const due = schedules.filter((s) => {
      const nextRun = s.next_run ? new Date(s.next_run as string).getTime() : null
      return nextRun !== null && nextRun <= now
    })

    const awaitingApproval = due.filter((s) => s.approval_required === true)
    const auto = due.filter((s) => s.approval_required !== true)

    if (auto.length === 0) {
      return NextResponse.json({
        success: true,
        executed: 0,
        dueSchedules: due.map((s) => s.key as string),
        awaitingApproval: awaitingApproval.map((s) => s.key as string),
      })
    }

    // --- Run phases for each due schedule ---
    const executed: string[] = []
    const allObservations: string[] = []
    const allFailures: string[] = []
    const allResults: Record<string, unknown> = {}
    let overallStatus: 'completed' | 'partial' | 'failed' = 'completed'

    // Group by handler to avoid running the same phase multiple times
    const handlersToRun = new Set<string>()
    for (const s of auto) {
      const handler = s.handler as string
      const phase = HANDLER_TO_PHASE[handler]
      if (phase) {
        handlersToRun.add(phase)
      }
    }

    for (const phase of handlersToRun) {
      const result = await brainCycle.runPhaseByName(phase, 'cron')

      // Track overall status
      if (result.status === 'failed') {
        overallStatus = 'failed'
      } else if (result.status === 'partial' && overallStatus !== 'failed') {
        overallStatus = 'partial'
      }

      allObservations.push(...result.observations)
      allFailures.push(...result.failures)
      allResults[phase] = result.results[phase]

      // Update all schedules that use this handler
      for (const s of auto) {
        if (HANDLER_TO_PHASE[s.handler as string] === phase) {
          const frequency = s.frequency as string
          const interval = FREQUENCY_INTERVAL_MS[frequency] ?? FREQUENCY_INTERVAL_MS.daily
          const nextRun = frequency === 'on_demand' ? null : new Date(now + interval)
          const ok = await brainRepository.updateScheduleRun(s.id as string, {
            status: result.status === 'failed' ? 'failed' : 'completed',
            lastRun: true,
            nextRun,
          })
          if (ok) executed.push(s.key as string)
        }
      }
    }

    return NextResponse.json({
      success: overallStatus !== 'failed',
      executed: executed.length,
      schedules: executed,
      awaitingApproval: awaitingApproval.map((s) => s.key as string),
      cycle: {
        runId: allObservations.length > 0 ? 'multi-phase' : '',
        status: overallStatus,
        failures: allFailures,
        results: allResults,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brain cron failed'
    console.error('Brain cron error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
