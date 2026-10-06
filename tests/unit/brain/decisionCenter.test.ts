import { DecisionCenter, DecisionStatus } from '../../../lib/brain/decisionCenter'
import { BusinessHealthSnapshot } from '../../../lib/brain/businessIntelligence'
import { BrainOpportunity } from '../../../lib/brain/types'
import { getPool } from '../../../lib/db/client'

jest.mock('../../../lib/db/client', () => ({
  getPool: jest.fn()
}))

describe('DecisionCenter', () => {
  let decisionCenter: DecisionCenter
  let mockQuery: jest.Mock

  const mockSnapshot: BusinessHealthSnapshot = {
    generatedAt: '2026-09-30T00:00:00Z',
    dataWindow: { start: '2026-08-30T00:00:00Z', end: '2026-09-30T00:00:00Z' },
    sensors: {
      traffic: 'UNAVAILABLE',
      affiliateClicks: 'ACTIVE',
      affiliateConversions: 'UNAVAILABLE',
      revenue: 'UNAVAILABLE'
    },
    content: {
      totalArticles: { value: 10, state: 'REAL', provenance: 'db', observedAt: '2026', source: 'db' },
      publishedThisMonth: { value: 2, state: 'REAL', provenance: 'db', observedAt: '2026', source: 'db' }
    },
    traffic: {
      totalPageViews: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' },
      uniqueVisitors: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' }
    },
    affiliate: {
      totalClicks: { value: 0, state: 'OBSERVED_ZERO', provenance: 'db', observedAt: '2026', source: 'db' },
      activeLinks: { value: 5, state: 'REAL', provenance: 'db', observedAt: '2026', source: 'db' }
    },
    conversions: {
      totalConversions: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' },
      conversionRate: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' }
    },
    revenue: {
      totalRevenue: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' },
      pendingCommissions: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' }
    },
    opportunities: {
      pipelineSize: { value: 1, state: 'REAL', provenance: 'db', observedAt: '2026', source: 'db' },
      unprovenancedSize: { value: 1, state: 'UNKNOWN', provenance: 'db', observedAt: '2026', source: 'db' }
    },
    automation: {
      jobsCompleted: { value: 5, state: 'REAL', provenance: 'db', observedAt: '2026', source: 'db' },
      successRate: { value: 1, state: 'REAL', provenance: 'db', observedAt: '2026', source: 'db' }
    },
    quality: {
      averageGateScore: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: '2026', source: 'none' }
    },
    bottlenecks: [],
    measurementGaps: [],
    evidence: [],
    confidence: 0.9,
    provenance: 'REAL'
  }

  const mockOpportunities: BrainOpportunity[] = [
    {
      id: 'opp-1',
      opportunity_category: 'content',
      description: 'Real opportunity',
      confidence: 0.8,
      status: 'detected',
      created_at: '2026-09-30T00:00:00Z',
      updated_at: '2026-09-30T00:00:00Z',
      sources: ['src-1'],
      provenance: 'REAL',
      title: 'Real Opp'
    },
    {
      id: 'opp-2',
      opportunity_category: 'content',
      description: 'Unknown opportunity',
      confidence: 0.8,
      status: 'detected',
      created_at: '2026-09-30T00:00:00Z',
      updated_at: '2026-09-30T00:00:00Z',
      sources: [],
      provenance: 'UNKNOWN',
      title: 'Unknown Opp'
    }
  ]

  let mockClientQuery: jest.Mock
  let mockRelease: jest.Mock

  beforeEach(() => {
    mockQuery = jest.fn()
    mockClientQuery = jest.fn()
    mockRelease = jest.fn()
    ;(getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
      connect: jest.fn().mockResolvedValue({
        query: mockClientQuery,
        release: mockRelease
      })
    })
    decisionCenter = new DecisionCenter()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('generates decisions based on UNAVAILABLE and OBSERVED_ZERO handling', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT INTO brain_decisions')) {
        // ON CONFLICT upsert returns the row with status
        const status = params && params[10] ? params[10] : 'PROPOSED'
        return Promise.resolve({ rows: [{ id: 'dec-1', status, created_at: 'now', updated_at: 'now' }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const decisions = await decisionCenter.evaluateBusinessSnapshot(mockSnapshot, mockOpportunities)

    // Should generate:
    // 1. INVESTIGATE: No clicks (OBSERVED_ZERO) and conversions UNAVAILABLE
    // 2. TRACKING: Measurement gap for conversions/revenue (UNAVAILABLE)
    // 3. CREATE_CONTENT: 1 REAL opportunity
    // 4. REJECT: 1 UNKNOWN opportunity
    
    expect(decisions.length).toBe(4)

    const investigate = decisions.find(d => d.type === 'INVESTIGATE')
    expect(investigate?.title).toBe('Investigate affiliate click generation')
    expect(investigate?.rationale).toContain('conversion performance cannot yet be evaluated')

    const tracking = decisions.find(d => d.type === 'TRACKING')
    expect(tracking?.title).toBe('Configure revenue and conversion measurement')

    const create = decisions.find(d => d.type === 'CREATE_CONTENT')
    expect(create?.provenance).toBe('REAL')

    const reject = decisions.find(d => d.type === 'REJECT')
    expect(reject?.status).toBe('REJECTED')
    expect(reject?.provenance).toBe('UNKNOWN')
    expect(reject?.rationale).toContain('lacks verifiable provenance')
  })

  it('deduplicates decisions based on fingerprint', async () => {
    // Mock the DB to return existing decision via ON CONFLICT DO UPDATE
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO brain_decisions')) {
        // ON CONFLICT returns the existing row
        return Promise.resolve({ rows: [{ id: 'existing-id', status: 'PROPOSED', created_at: 'now', updated_at: 'now' }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const decisions = await decisionCenter.evaluateBusinessSnapshot(mockSnapshot, [])
    
    // ON CONFLICT upsert always goes through INSERT, but returns existing row
    expect(decisions[0].id).toBe('existing-id')
  })

  it('validates status transitions securely', async () => {
    // BEGIN
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())
    // Admin check passes
    mockClientQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ role: 'admin' }] }))
    // SELECT ... FOR UPDATE - Current status is PROPOSED
    mockClientQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ status: 'PROPOSED' }] }))
    // UPDATE
    mockClientQuery.mockImplementationOnce(() => Promise.resolve({ rowCount: 1 }))
    // COMMIT
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())

    const result = await decisionCenter.transitionDecision('dec-1', 'APPROVED', 'admin-1')
    expect(result).toBe(true)
    expect(mockClientQuery).toHaveBeenCalledTimes(5)
    expect(mockRelease).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid transitions', async () => {
    // BEGIN
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())
    // Admin check passes
    mockClientQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ role: 'admin' }] }))
    // SELECT ... FOR UPDATE - Current status is PROPOSED
    mockClientQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ status: 'PROPOSED' }] }))
    // ROLLBACK (called in throw path)
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())
    // ROLLBACK (called in catch)
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())

    // PROPOSED to COMPLETED is invalid
    await expect(decisionCenter.transitionDecision('dec-1', 'COMPLETED', 'admin-1')).rejects.toThrow('Invalid transition')
    expect(mockRelease).toHaveBeenCalledTimes(1)
  })

  it('rejects transitions from non-admins', async () => {
    // BEGIN
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())
    // User is NOT admin
    mockClientQuery.mockImplementationOnce(() => Promise.resolve({ rows: [{ role: 'user' }] }))
    // ROLLBACK (called in catch)
    mockClientQuery.mockImplementationOnce(() => Promise.resolve())

    await expect(decisionCenter.transitionDecision('dec-1', 'APPROVED', 'user-1')).rejects.toThrow('Unauthorized transition attempt')
    expect(mockRelease).toHaveBeenCalledTimes(1)
  })

  // ─── processExperimentEvidence tests ───────────────────────────────

  describe('processExperimentEvidence', () => {
    const completedExperimentRow = {
      exp_id: 'exp-100',
      hypothesis: 'Listicle format increases click-through rate vs review format',
      status: 'COMPLETED',
      result_id: 'res-100',
      conclusion: 'SIGNIFICANT_WIN',
      p_value: 0.023,
      relative_difference: 0.15,
      sample_adequacy: 'ADEQUATE',
      control_sample_size: 350,
      treatment_sample_size: 340
    }

    it('generates STRATEGY_CHANGE for SIGNIFICANT_WIN', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [completedExperimentRow] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')

      expect(decision.type).toBe('STRATEGY_CHANGE')
      expect(decision.provenance).toBe('EXPERIMENT')
      expect(decision.status).toBe('PROPOSED')
      expect(decision.rationale).toContain('proved the hypothesis')
      expect(decision.rationale).toContain('0.023')
      expect(decision.evidence.experimentId).toBe('exp-100')
      expect(decision.evidence.resultId).toBe('res-100')
      expect(decision.evidence.decisionRuleVersion).toBe('1.0')
      expect(decision.evidence.aiModel).toBe('NONE (Deterministic)')
      expect(decision.evidence.statistics.conclusion).toBe('SIGNIFICANT_WIN')
      expect(decision.evidence.statistics.pValue).toBe(0.023)
    })

    it('generates STRATEGY_CHANGE for SIGNIFICANT_LOSS', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [{ ...completedExperimentRow, conclusion: 'SIGNIFICANT_LOSS' }] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')
      expect(decision.type).toBe('STRATEGY_CHANGE')
      expect(decision.rationale).toContain('disproved the hypothesis')
      expect(decision.expectedImpact).toContain('avoid the treatment')
    })

    it('generates DEFER for NO_SIGNIFICANCE', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [{ ...completedExperimentRow, status: 'INCONCLUSIVE', conclusion: 'NO_SIGNIFICANCE' }] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')
      expect(decision.type).toBe('DEFER')
      expect(decision.confidence).toBe(0.5) // INCONCLUSIVE = lower confidence
      expect(decision.rationale).toContain('does not justify a strategy change')
    })

    it('generates DEFER for INSUFFICIENT_SAMPLE', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [{ ...completedExperimentRow, status: 'INCONCLUSIVE', conclusion: 'INSUFFICIENT_SAMPLE' }] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')
      expect(decision.type).toBe('DEFER')
    })

    it('generates INVESTIGATE for unknown/error conclusion', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [{ ...completedExperimentRow, conclusion: 'ERROR' }] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')
      expect(decision.type).toBe('INVESTIGATE')
      expect(decision.rationale).toContain('Manual review required')
    })

    it('rejects experiment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      await expect(decisionCenter.processExperimentEvidence('exp-missing')).rejects.toThrow('not found')
    })

    it('rejects non-terminal experiment (RUNNING)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...completedExperimentRow, status: 'RUNNING' }] })
      await expect(decisionCenter.processExperimentEvidence('exp-100')).rejects.toThrow('Cannot process evidence for experiment in state: RUNNING')
    })

    it('rejects non-terminal experiment (PROPOSED)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...completedExperimentRow, status: 'PROPOSED' }] })
      await expect(decisionCenter.processExperimentEvidence('exp-100')).rejects.toThrow('Cannot process evidence for experiment in state: PROPOSED')
    })

    it('rejects experiment with no result attached', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...completedExperimentRow, result_id: null }] })
      await expect(decisionCenter.processExperimentEvidence('exp-100')).rejects.toThrow('has no statistical result attached')
    })

    it('idempotently returns existing decision on duplicate generation', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [completedExperimentRow] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          // ON CONFLICT returns existing row with its current status
          return Promise.resolve({ rows: [{ id: 'existing-dec', status: 'APPROVED', created_at: 'earlier', updated_at: 'later' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')
      expect(decision.id).toBe('existing-dec')
      expect(decision.status).toBe('APPROVED') // Should preserve the existing DB status, not re-propose
    })

    it('preserves provenance traceability in evidence object', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [completedExperimentRow] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')

      // Provenance traceability: can trace back to experiment + result + rule version
      expect(decision.evidence.experimentId).toBe('exp-100')
      expect(decision.evidence.resultId).toBe('res-100')
      expect(decision.evidence.decisionRuleVersion).toBe('1.0')
      expect(decision.evidence.generatedAt).toBeDefined()
      expect(decision.evidence.aiModel).toBe('NONE (Deterministic)')
      
      // Statistics reference authoritative values, not recalculated
      expect(decision.evidence.statistics.pValue).toBe(0.023)
      expect(decision.evidence.statistics.relativeDifference).toBe(0.15)
      expect(decision.evidence.statistics.sampleAdequacy).toBe('ADEQUATE')
    })

    it('does not recalculate any statistics independently', async () => {
      // The key proof: no Fisher, Wilson, or conversion rate math exists in decisionCenter.
      // processExperimentEvidence reads values directly from the DB result row.
      // This test verifies the p_value in the decision comes straight from the DB, not from re-calculation.
      const customRow = { ...completedExperimentRow, p_value: 0.0499, relative_difference: 0.321 }
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [customRow] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const decision = await decisionCenter.processExperimentEvidence('exp-100')
      expect(decision.evidence.statistics.pValue).toBe(0.0499)
      expect(decision.evidence.statistics.relativeDifference).toBe(0.321)
    })

    it('sets confidence based on experiment terminal status', async () => {
      // COMPLETED = 0.95
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [completedExperimentRow] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const completed = await decisionCenter.processExperimentEvidence('exp-100')
      expect(completed.confidence).toBe(0.95)

      // INCONCLUSIVE = 0.5
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM brain_experiments e')) {
          return Promise.resolve({ rows: [{ ...completedExperimentRow, status: 'INCONCLUSIVE', conclusion: 'NO_SIGNIFICANCE' }] })
        }
        if (sql.includes('INSERT INTO brain_decisions')) {
          const status = params && params[10] ? params[10] : 'PROPOSED'
          return Promise.resolve({ rows: [{ id: 'dec-new2', status, created_at: 'now', updated_at: 'now' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const inconclusive = await decisionCenter.processExperimentEvidence('exp-100')
      expect(inconclusive.confidence).toBe(0.5)
    })
  })
})
