import { describe, it, expect, beforeEach } from '@jest/globals'
import { StrategyEvolution } from '@/lib/brain/strategyEvolution'

describe('StrategyEvolutionTriggers', () => {
  let engine: StrategyEvolution

  beforeEach(() => {
    engine = new StrategyEvolution()
  })

  const baseStrategy = (overrides: any = {}) => ({
    id: 'strat-test', version: 1, evidence_strength: 'SUPPORTED',
    provenance: 'REAL', created_at: new Date().toISOString(),
    opportunity_ids: ['opp-1'], ...overrides,
  })

  const baseContext = (overrides: any = {}) => ({
    snapshot: { sensors: { traffic: 'UNAVAILABLE', affiliateConversions: 'UNAVAILABLE', revenue: 'UNAVAILABLE' } },
    opportunities: [{
      id: 'opp-1', provenance: 'REAL', source_ids: ['src-1'],
      evidence_strength: 'SUPPORTED', created_at: new Date().toISOString(),
      validation_status: 'VALIDATED',
    }],
    learnings: [], decisions: [], executions: [], qualityResults: [], verifications: [],
    researchRuns: [], ...overrides,
  })

  it('trigger 1: NEW_EVIDENCE fires when research runs present', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      researchRuns: [{ id: 'r1', query: 'test', sources: [{ source_id: 'src-1' }], created_at: new Date().toISOString() }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('NEW_EVIDENCE')
  })

  it('trigger 2: STRATEGY_STALE fires when strategy is >30 days old', async () => {
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    const result = await engine.evaluate(baseStrategy({ created_at: oldDate }), baseContext())
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('STRATEGY_STALE')
  })

  it('trigger 3: OPPORTUNITY_CHANGED fires when evidence strength differs', async () => {
    const result = await engine.evaluate(baseStrategy({ evidence_strength: 'SUPPORTED' }), baseContext({
      opportunities: [{ id: 'opp-1', provenance: 'REAL', source_ids: ['src-1'], evidence_strength: 'STRONGLY_SUPPORTED', created_at: new Date().toISOString(), validation_status: 'VALIDATED' }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('OPPORTUNITY_CHANGED')
  })

  it('trigger 4: OPPORTUNITY_EXPIRED fires when opportunity is stale', async () => {
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    const result = await engine.evaluate(baseStrategy(), baseContext({
      opportunities: [{ id: 'opp-1', provenance: 'REAL', source_ids: ['src-1'], evidence_strength: 'STALE', created_at: oldDate, validation_status: 'VALIDATED' }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('OPPORTUNITY_EXPIRED')
  })

  it('trigger 5: CONFLICT_DETECTED fires when opportunity has conflict flags', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      opportunities: [{ id: 'opp-1', provenance: 'REAL', source_ids: ['src-1'], evidence_strength: 'SUPPORTED', created_at: new Date().toISOString(), validation_status: 'CONFLICT_DETECTED', conflict_flags: [{ type: 'test' }] }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('CONFLICT_DETECTED')
  })

  it('trigger 6: EXECUTION_DEVIATION fires when >=2 executions failed', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      executions: [{ id: 'e1', status: 'failed' }, { id: 'e2', status: 'failed' }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('EXECUTION_DEVIATION')
  })

  it('trigger 7: QUALITY_DEVIATION fires when >=2 quality results failed', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      qualityResults: [{ id: 'q1', status: 'FAIL' }, { id: 'q2', status: 'FAIL' }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('QUALITY_DEVIATION')
  })

  it('trigger 8: BUSINESS_OUTCOME fires when verification is NOT_VERIFIABLE and sensors unavailable', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      verifications: [{ id: 'v1', status: 'NOT_VERIFIABLE' }],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('BUSINESS_OUTCOME')
  })

  it('trigger 9: CAPABILITY_CHANGE fires when sensors are unavailable', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext())
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('CAPABILITY_CHANGE')
  })

  it('trigger 10: PRODUCT_AVAILABILITY_CHANGE fires when product state is unavailable', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      snapshot: { sensors: { traffic: 'UNAVAILABLE', affiliateConversions: 'UNAVAILABLE', revenue: 'UNAVAILABLE', product_availability: 'DIGISTORE_CREDENTIALS_MISSING' } },
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('PRODUCT_AVAILABILITY_CHANGE')
  })

  it('trigger 11: REUSABLE_LEARNING fires when >=2 reusable learnings exist', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      learnings: [
        { id: 'l1', reusability: 'high', provenance: 'REAL' },
        { id: 'l2', reusability: 'high', provenance: 'REAL' },
      ],
    }))
    const types = result.map(r => r.trigger_type)
    expect(types).toContain('REUSABLE_LEARNING')
  })

  it('BUSINESS_OUTCOME does not falsely claim conversion failure', async () => {
    const result = await engine.evaluate(baseStrategy(), baseContext({
      verifications: [{ id: 'v1', status: 'NOT_VERIFIABLE' }],
    }))
    const serialized = JSON.stringify(result).toLowerCase()
    expect(serialized).not.toContain('conversion failure')
    expect(serialized).not.toContain('revenue failure')
    expect(serialized).not.toContain('traffic decline')
    for (const r of result) {
      expect(r.unavailable_data.length).toBeGreaterThan(0)
    }
  })
})