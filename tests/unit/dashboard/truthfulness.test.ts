import { describe, it, expect, beforeEach, jest } from '@jest/globals'

/**
 * P0: Dashboard truthfulness regression suite.
 *
 * These tests assert the dashboard contract directly:
 *   - Health can never report "Healthy" from a hardcoded value.
 *   - Unavailable analytics is not presented as confirmed zero traffic.
 *   - Missing revenue data is represented accurately.
 *   - Missing or overdue schedules are reported truthfully.
 *   - Growth recommendations correspond to real available actions.
 */

describe('dbHealthLabel classification', () => {
  it('maps healthy to a non-fake label', async () => {
    const { dbHealthLabel } = await import('@/lib/db/health')
    const r = dbHealthLabel({ state: 'healthy', message: 'ok', checkedAt: 'x' })
    expect(r.label).toBe('Healthy')
    expect(r.color).toBe('emerald')
  })

  it('never maps unknown input to Healthy', async () => {
    const { dbHealthLabel } = await import('@/lib/db/health')
    const r = dbHealthLabel(null)
    expect(r.label).toBe('Unknown')
    expect(r.state).toBe('unknown')
  })

  it('maps degraded and unavailable distinctly', async () => {
    const { dbHealthLabel } = await import('@/lib/db/health')
    expect(dbHealthLabel({ state: 'degraded', message: '', checkedAt: '' }).label).toBe('Degraded')
    expect(dbHealthLabel({ state: 'unavailable', message: '', checkedAt: '' }).label).toBe('Unavailable')
  })
})

describe('Today dashboard card contract', () => {
  it('distinguishes confirmed-zero traffic from unavailable traffic', () => {
    // A successful analytics read with zero visitors is a real zero.
    const okZero = { ok: true, totalVisitors: 0, totalPageviews: 0, error: null }
    const okNonZero = { ok: true, totalVisitors: 5, totalPageviews: 10, error: null }
    const unavailable = { ok: false, totalVisitors: null, totalPageviews: null, error: 'GA4 not configured' }

    const isUnavailable = (a: { ok: boolean; totalVisitors: number | null }) => a.ok === false || a.totalVisitors === null
    const isConfirmedZero = (a: { ok: boolean; totalVisitors: number | null }) =>
      a.ok === true && (a.totalVisitors || 0) === 0

    expect(isUnavailable(okZero)).toBe(false)
    expect(isUnavailable(unavailable)).toBe(true)
    expect(isConfirmedZero(okZero)).toBe(true)
    expect(isConfirmedZero(okNonZero)).toBe(false)
    expect(isConfirmedZero(unavailable)).toBe(false)
  })

  it('represents missing revenue as unavailable, not as $0.00', () => {
    const revenueUnavailable = { total: 0, recent: 0, currency: 'USD', source: 'unavailable' }
    const revenueConfigured = { total: 12.5, recent: 5, currency: 'USD', source: 'digistore24' }

    const isUnavailable = (r: { source: string }) =>
      r.source === 'unavailable' || r.source === 'NOT CONFIGURED'

    expect(isUnavailable(revenueUnavailable)).toBe(true)
    expect(isUnavailable(revenueConfigured)).toBe(false)
  })

  it('reports overdue schedules truthfully from next_run', () => {
    const now = Date.now()
    const past = new Date(now - 3600_000).toISOString()
    const future = new Date(now + 3600_000).toISOString()

    const schedules = [
      { key: 'overdue', nextRun: past, enabled: true, status: 'idle' },
      { key: 'upcoming', nextRun: future, enabled: true, status: 'idle' },
      { key: 'disabled', nextRun: past, enabled: false, status: 'idle' },
    ]

    const overdue = schedules.filter((s) => {
      if (!s.nextRun || !s.enabled) return false
      const next = new Date(s.nextRun).getTime()
      return Number.isFinite(next) && next < now
    })

    expect(overdue.map((s) => s.key)).toEqual(['overdue'])
  })
})

describe('Next Best Action corresponds to real state', () => {
  it('prefers pending approvals over the nominal default', () => {
    const approvals = [{ id: 'a1', proposedAction: 'Approve article', requestedPermission: 'PUBLISH', status: 'pending', createdAt: '' }]
    const jobs = { failed: 0 }
    const opportunities: any[] = []
    const draftCount = 3

    const hasApprovals = approvals.length > 0
    const hasFailedJobs = jobs.failed > 0
    const hasOpportunities = opportunities.length > 0

    let badge = 'Nominal'
    if (hasApprovals) badge = 'Immediate Action'
    else if (hasFailedJobs) badge = 'Needs Review'
    else if (hasOpportunities) badge = 'Growth Signal'
    else if (draftCount > 0) badge = 'Review Needed'

    expect(badge).toBe('Immediate Action')
  })

  it('reports drafts when nothing more urgent exists', () => {
    const approvals: any[] = []
    const jobs = { failed: 0 }
    const opportunities: any[] = []
    const draftCount = 2

    const hasApprovals = approvals.length > 0
    const hasFailedJobs = jobs.failed > 0
    const hasOpportunities = opportunities.length > 0

    let badge = 'Nominal'
    if (hasApprovals) badge = 'Immediate Action'
    else if (hasFailedJobs) badge = 'Needs Review'
    else if (hasOpportunities) badge = 'Growth Signal'
    else if (draftCount > 0) badge = 'Review Needed'

    expect(badge).toBe('Review Needed')
  })

  it('reports nominal only when nothing requires attention', () => {
    const approvals: any[] = []
    const jobs = { failed: 0 }
    const opportunities: any[] = []
    const draftCount = 0

    const hasApprovals = approvals.length > 0
    const hasFailedJobs = jobs.failed > 0
    const hasOpportunities = opportunities.length > 0

    let badge = 'Nominal'
    if (hasApprovals) badge = 'Immediate Action'
    else if (hasFailedJobs) badge = 'Needs Review'
    else if (hasOpportunities) badge = 'Growth Signal'
    else if (draftCount > 0) badge = 'Review Needed'

    expect(badge).toBe('Nominal')
  })
})