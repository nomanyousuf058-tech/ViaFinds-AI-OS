import { StrategyEvolution, EvolutionTrigger } from '../../../lib/brain/strategyEvolution'

describe('StrategyEvolution Rules Engine', () => {
  let engine: StrategyEvolution
  let mockContext: any
  let baseStrategy: any

  beforeEach(() => {
    engine = new StrategyEvolution()
    baseStrategy = {
      id: 'strat-123',
      version: 1,
      evidence_strength: 'MODERATE_EVIDENCE',
      provenance: 'REAL',
      opportunity_ids: ['opp-1'],
      created_at: new Date().toISOString()
    }

    mockContext = {
      snapshot: { sensors: { traffic: 'ACTIVE', affiliateConversions: 'ACTIVE', revenue: 'ACTIVE' } },
      opportunities: [],
      learnings: [],
      qualityResults: [],
      executions: [],
      verifications: [],
      researchRuns: []
    }
  })

  // ==================================================
  // 4. TEST ALL 11 TRIGGERS
  // ==================================================
  describe('Triggers', () => {
    it('NEW_EVIDENCE trigger', async () => {
      mockContext.researchRuns = [{ id: 'run-1' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].trigger_type).toBe('NEW_EVIDENCE')
    })

    it('STRATEGY_STALE trigger', async () => {
      baseStrategy.created_at = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('STRATEGY_STALE')
    })

    it('OPPORTUNITY_CHANGED trigger', async () => {
      mockContext.opportunities = [{ id: 'opp-1', provenance: 'REAL', evidence_strength: 'STRONGLY_SUPPORTED' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('OPPORTUNITY_CHANGED')
    })

    it('OPPORTUNITY_EXPIRED trigger', async () => {
      mockContext.opportunities = [{ id: 'opp-1', provenance: 'REAL', evidence_strength: 'STALE' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('OPPORTUNITY_EXPIRED')
    })

    it('CONFLICT_DETECTED trigger', async () => {
      mockContext.opportunities = [{ id: 'opp-1', provenance: 'REAL', conflict_flags: ['conflict'] }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('CONFLICT_DETECTED')
    })

    it('EXECUTION_DEVIATION trigger', async () => {
      mockContext.executions = [{ status: 'failed' }, { status: 'failed' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('EXECUTION_DEVIATION')
    })

    it('QUALITY_DEVIATION trigger', async () => {
      mockContext.qualityResults = [{ status: 'FAIL' }, { status: 'FAIL' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('QUALITY_DEVIATION')
    })

    it('BUSINESS_OUTCOME trigger', async () => {
      mockContext.verifications = [{ status: 'NOT_VERIFIABLE' }]
      mockContext.snapshot.sensors.traffic = 'UNAVAILABLE'
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('BUSINESS_OUTCOME')
    })

    it('CAPABILITY_CHANGE trigger', async () => {
      mockContext.snapshot.sensors.revenue = 'UNAVAILABLE'
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('CAPABILITY_CHANGE')
    })

    it('PRODUCT_AVAILABILITY_CHANGE trigger', async () => {
      mockContext.snapshot.sensors.product_availability = 'UNAVAILABLE'
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('PRODUCT_AVAILABILITY_CHANGE')
    })

    it('REUSABLE_LEARNING trigger', async () => {
      mockContext.learnings = [{ reusable: true, id: 'l1' }, { reusable: true, id: 'l2' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].proposed_changes.trigger).toBe('REUSABLE_LEARNING')
    })
  })

  // ==================================================
  // 5. EVOLUTION TYPE TESTS
  // ==================================================
  describe('Evolution Types', () => {
    it('NO_CHANGE when no triggers present', async () => {
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].evolution_type).toBe('NO_CHANGE')
    })

    it('REVIEW for STALE', async () => {
      baseStrategy.created_at = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].evolution_type).toBe('REVIEW')
    })

    it('REFINE for OPPORTUNITY_CHANGED', async () => {
      mockContext.opportunities = [{ id: 'opp-1', provenance: 'REAL', evidence_strength: 'STRONGLY_SUPPORTED' }]
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].evolution_type).toBe('REFINE')
    })

    it('PAUSE for CAPABILITY_CHANGE', async () => {
      mockContext.snapshot.sensors.traffic = 'UNAVAILABLE'
      const proposals = await engine.evaluate(baseStrategy, mockContext)
      expect(proposals[0].evolution_type).toBe('PAUSE')
    })
    
    // Note: SUPERSEDE and RETIRE require approval process which is tested in integration tests
  })

  // ==================================================
  // 6. SINGLE OBSERVATION TEST
  // ==================================================
  it('does not evolve strategy on a single quality deviation', async () => {
    mockContext.qualityResults = [{ status: 'FAIL' }] // only 1
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].evolution_type).toBe('NO_CHANGE')
  })

  // ==================================================
  // 7. REUSABLE LEARNING SEMANTICS
  // ==================================================
  it('does not evolve for less than 2 reusable learnings', async () => {
    mockContext.learnings = [{ reusable: true, id: 'l1' }]
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].evolution_type).toBe('NO_CHANGE')
  })

  // ==================================================
  // 8. UNKNOWN OPPORTUNITY TEST
  // ==================================================
  it('UNKNOWN opportunity is excluded from evolution trigger', async () => {
    mockContext.opportunities = [{ id: 'opp-1', provenance: 'UNKNOWN', evidence_strength: 'STRONGLY_SUPPORTED' }]
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].evolution_type).toBe('NO_CHANGE')
  })

  // ==================================================
  // 9. UNAVAILABLE BUSINESS DATA
  // ==================================================
  it('UNAVAILABLE data does not become business failure', async () => {
    mockContext.snapshot.sensors.conversion = 'UNAVAILABLE'
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].unavailable_data).toBeDefined()
    expect(proposals[0].failure_conditions).not.toContain('conversion failed')
  })

  // ==================================================
  // 10. PRODUCT CREDENTIAL TEST
  // ==================================================
  it('DIGISTORE_CREDENTIALS_MISSING triggers product availability change, not NOT_FOUND', async () => {
    mockContext.snapshot.sensors.product_availability = 'DIGISTORE_CREDENTIALS_MISSING'
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].trigger_type).toBe('PRODUCT_AVAILABILITY_CHANGE')
  })

  // ==================================================
  // 13. CONFLICT TESTS
  // ==================================================
  it('CONFLICT_DETECTED does not choose a winner automatically, requests REVIEW', async () => {
    mockContext.opportunities = [{ id: 'opp-1', provenance: 'REAL', conflict_flags: ['conflict'] }]
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].evolution_type).toBe('REVIEW')
    expect(proposals[0].status).toBe('PROPOSED') // Requires approval
  })

  // ==================================================
  // 15. CONFIDENCE TEST
  // ==================================================
  it('weak evidence produces lower confidence', async () => {
    mockContext.researchRuns = [{ id: 'run-1' }]
    mockContext.opportunities = [{ id: 'opp-1', provenance: 'REAL', source_ids: ['src-1'] }]
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].confidence).toBeLessThan(0.7) // One source is weak
  })

  // ==================================================
  // 17. FRESHNESS TEST
  // ==================================================
  it('STALE triggers REVIEW, not FAIL', async () => {
    baseStrategy.created_at = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].evolution_type).toBe('REVIEW')
    expect(proposals[0].trigger_type).toBe('STRATEGY_STALE')
  })

  // ==================================================
  // 18. PROVENANCE TEST
  // ==================================================
  it('UNKNOWN evidence does not affect confidence or trigger REAL evolution', async () => {
    mockContext.opportunities = [{ id: 'opp-1', provenance: 'UNKNOWN', evidence_strength: 'STRONGLY_SUPPORTED', source_ids: ['src-1', 'src-2', 'src-3'] }]
    const proposals = await engine.evaluate(baseStrategy, mockContext)
    expect(proposals[0].evolution_type).toBe('NO_CHANGE') // Excluded because UNKNOWN
  })
})