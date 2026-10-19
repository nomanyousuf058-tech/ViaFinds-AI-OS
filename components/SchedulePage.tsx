import React, { useEffect, useState } from 'react'
import { getScheduleLabel, SCHEDULE_STATE_COLORS } from '@/lib/utils/scheduleDisplay'
import RunNowButton from '@/components/RunNowButton'

interface ScheduleRow {
  id: string
  key: string
  purpose: string
  nextRun: string | null
  lastRun: string | null
  status: string
  enabled: boolean
  frequency: string
  handler: string
  lastError: string | null
}

interface BrainRun {
  id: string
  runType: string
  trigger: string
  status: string
  startedAt: string
  completedAt: string | null
}

export type { ScheduleRow, BrainRun }

function formatWhen(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
}

function runStatusDot(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500'
    case 'running': return 'bg-blue-500 animate-pulse'
    case 'failed': return 'bg-red-500'
    default: return 'bg-slate-600'
  }
}

export default function SchedulePage({
  schedules,
  runs,
}: {
  schedules: ScheduleRow[]
  runs: BrainRun[]
}) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className='max-w-6xl space-y-8'>
      <div>
        <h1 className='font-headline-xl text-headline-xl text-on-background mb-2'>Schedule</h1>
        <p className='font-ui-body text-ui-body text-on-surface-variant'>
          What ViaFinds is scheduled to do, when it will run, and what happened last time.
        </p>
      </div>

      <section>
        <h2 className='font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4'>Scheduled Work</h2>
        {schedules.length === 0 ? (
          <div className='p-8 text-center bg-obsidian-deep border border-dashed border-slate-border rounded-lg text-on-surface-variant text-sm'>
            No schedules configured.
          </div>
        ) : (
          <div className='space-y-3'>
            {schedules.map((s) => {
              const label = getScheduleLabel(
                s.nextRun,
                s.enabled,
                s.status === 'failed' ? 'failed' : s.status === 'running' ? 'running' : null,
                now,
                'Asia/Karachi'
              )
              return (
                <div key={s.id} className='bg-obsidian-deep border border-slate-border rounded-lg p-4'>
                  <div className='flex items-start justify-between gap-4 flex-wrap'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <p className='text-on-background font-medium text-sm truncate'>{s.purpose}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono-data ${SCHEDULE_STATE_COLORS[label.state]}`}>
                          {label.label}
                        </span>
                      </div>
                      <p className='text-[11px] text-on-surface-variant mt-1 font-mono-data'>
                        {s.key} · {s.frequency} · handler {s.handler}
                      </p>
                    </div>
                    <RunNowButton scheduleKey={s.key} schedulePurpose={s.purpose} disabled={!s.enabled} />
                  </div>

                  <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs'>
                    <div>
                      <p className='text-on-surface-variant uppercase tracking-wider mb-1'>Next run</p>
                      <p className='text-on-background font-mono-data'>
                        {s.nextRun ? formatWhen(s.nextRun) : 'Not scheduled'}
                      </p>
                    </div>
                    <div>
                      <p className='text-on-surface-variant uppercase tracking-wider mb-1'>Last run</p>
                      <p className='text-on-background font-mono-data'>{formatWhen(s.lastRun)}</p>
                    </div>
                    <div>
                      <p className='text-on-surface-variant uppercase tracking-wider mb-1'>State</p>
                      <p className='text-on-background font-mono-data capitalize'>{s.status}</p>
                    </div>
                    <div>
                      <p className='text-on-surface-variant uppercase tracking-wider mb-1'>Enabled</p>
                      <p className='text-on-background font-mono-data'>{s.enabled ? 'Yes' : 'No — paused'}</p>
                    </div>
                  </div>

                  {s.lastError && (
                    <div className='mt-3 p-2 bg-red-950/30 border border-red-500/30 rounded text-xs text-red-300'>
                      Last error: {s.lastError}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className='font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4'>Recent Brain Runs</h2>
        {runs.length === 0 ? (
          <div className='p-8 text-center bg-obsidian-deep border border-dashed border-slate-border rounded-lg text-on-surface-variant text-sm'>
            No Brain runs recorded yet.
          </div>
        ) : (
          <div className='space-y-2'>
            {runs.map((r) => (
              <div key={r.id} className='bg-obsidian-deep border border-slate-border rounded p-3 flex items-center justify-between gap-3'>
                <div className='flex items-center gap-2 min-w-0'>
                  <span className={`w-2 h-2 rounded-full ${runStatusDot(r.status)}`} />
                  <span className='text-on-background text-sm font-medium truncate'>
                    {r.runType} ({r.trigger})
                  </span>
                </div>
                <div className='text-xs text-on-surface-variant font-mono-data text-right'>
                  <div>Started {formatWhen(r.startedAt)}</div>
                  {r.completedAt && <div>Completed {formatWhen(r.completedAt)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

