import { NextResponse } from 'next/server'
import { brainCycle } from '@/lib/brain/brainCycle'
import { brainRepository } from '@/lib/db/repositories/brain'

/**
 * Vercel Cron Route: Brain Continuous Operating Cycle
 *
 * This is what makes the Brain operate continuously after ONE human Wake Up:
 * the external scheduler (Vercel Cron) periodically asks "is anything due?"
 * and the Brain runs its operating loop when a schedule is due.
 *
 * Security: Vercel injects CRON_SECRET as the Authorization bearer token.
 * We verify it here to prevent unauthorized triggering.
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

export async function GET(request: Request) {
  // --- Security Check ---
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized brain cron attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // --- Run the full operating cycle ---
    const result = await brainCycle.run('cron')

    // If no run record was created (DB failure or a race lost to the
    // singleton index), leave schedules untouched so the next tick retries.
    if (!result.runId) {
      return NextResponse.json({
        success: false,
        executed: 0,
        reason: 'cycle run record could not be created; schedules left for next tick',
        failures: result.failures,
      })
    }

    // --- Record schedule execution and compute next runs ---
    const executed: string[] = []
    for (const s of auto) {
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

    return NextResponse.json({
      success: result.status !== 'failed',
      executed: executed.length,
      schedules: executed,
      awaitingApproval: awaitingApproval.map((s) => s.key as string),
      cycle: {
        runId: result.runId,
        status: result.status,
        failures: result.failures,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brain cron failed'
    console.error('Brain cron error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
