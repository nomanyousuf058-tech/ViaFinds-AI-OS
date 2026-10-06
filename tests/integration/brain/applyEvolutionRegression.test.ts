import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { StrategyEvolution } from '../../../lib/brain/strategyEvolution'
import { BrainRepository } from '../../../lib/db/repositories/brain'
import { getPool } from '../../../lib/db/client'
import * as crypto from 'crypto'

/**
 * Regression test for the applyEvolution v1.type bug.
 *
 * Prior to the fix, applyEvolution() referenced `v1.type` on line 290 of
 * strategyEvolution.ts, but brain_strategies has no `type` column — the
 * canonical field is `strategy_type`. The existing unit tests passed because
 * they only tested the evaluate() path (no DB write). This test reaches the
 * exact code path: createStrategyV2() called from applyEvolution() with a
 * real persisted V1 strategy.
 */
describe('applyEvolution regression (v1.type → v1.strategy_type)', () => {
  let brainRepo: BrainRepository
  let engine: StrategyEvolution
  let pool: any
  let testStrategyId: string
  let testProposalId: string
  let adminId: string

  beforeAll(async () => {
    brainRepo = new BrainRepository()
    engine = new StrategyEvolution(brainRepo)
    pool = getPool()
    adminId = crypto.randomUUID()
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [adminId, `testadmin-${Date.now()}@viafinds.com`, 'testhash', 'admin']
    )
  })

  afterAll(async () => {
    if (testProposalId) {
      await pool.query("DELETE FROM brain_strategy_evolution WHERE id = $1", [testProposalId])
    }
    if (testStrategyId) {
      await pool.query("DELETE FROM brain_strategies WHERE id = $1", [testStrategyId])
    }
    if (adminId) {
      await pool.query("DELETE FROM admin_users WHERE id = $1", [adminId])
    }
    await pool.end()
  })

  it('creates V2 via applyEvolution using strategy_type (not type)', async () => {
    // 1. Create a real V1 strategy with strategy_type set
    const v1Res = await brainRepo.createStrategyV2({
      title: 'REGRESSION Test V1',
      type: 'CONTENT_STRATEGY',
      objective: 'Test applyEvolution regression',
      status: 'ACTIVE',
      description: 'Initial state',
      rationale: 'Testing',
      evidence: { test: true },
      evidenceRefs: [],
      assumptions: [],
      unknowns: [],
      unavailableData: [],
      risks: [],
      constraints: [],
      expectedObservations: [],
      successConditions: [],
      failureConditions: [],
      requiredPermissions: [],
      opportunityIds: ['opp-reg-1'],
      decisionIds: [],
      researchIds: [],
      learningIds: [],
      parentStrategyId: null,
      version: 1,
      evidenceStrength: 'MODERATE_EVIDENCE',
      outcomeStatus: 'OBSERVING',
      freshness: 'FRESH',
      conflictFlags: [],
      provenance: 'TEST',
      confidence: 1.0,
      approvalRequired: false,
    })
    testStrategyId = v1Res!.id

    // 2. Create an APPROVED evolution proposal
    const propRes = await brainRepo.createStrategyEvolution({
      strategyId: testStrategyId,
      sourceStrategyVersion: 1,
      proposedVersion: 2,
      evolutionType: 'REFINE',
      triggerType: 'OPPORTUNITY_CHANGED',
      evidenceRefs: [],
      opportunityIds: ['opp-reg-1'],
      learningIds: [],
      decisionIds: [],
      executionIds: [],
      evidenceStrength: 'STRONGLY_SUPPORTED',
      confidence: 0.9,
      assumptions: [],
      unknowns: [],
      unavailableData: [],
      risks: [],
      proposedChanges: { trigger: 'OPPORTUNITY_CHANGED', refinement: true },
      expectedObservations: [],
      successConditions: [],
      failureConditions: [],
      provenance: 'TEST',
      status: 'APPROVED',
      approvalId: null,
    })
    testProposalId = propRes!.id

    // 3. Call applyEvolution — this is the exact code path that previously
    //    referenced v1.type (undefined) and would fail at createStrategyV2().
    const v2 = await engine.applyEvolution(testProposalId, adminId)

    // 4. Verify V2 was created
    expect(v2).toBeDefined()
    expect(v2.version).toBe(2)
    expect(v2.parent_strategy_id).toBe(testStrategyId)
    expect(v2.provenance).toBe('TEST')

    // 5. Verify V1 remains unchanged (immutability)
    const v1Check = await pool.query(
      'SELECT * FROM brain_strategies WHERE id = $1',
      [testStrategyId]
    )
    expect(v1Check.rows[0].version).toBe(1)
    expect(v1Check.rows[0].strategy_type).toBe('CONTENT_STRATEGY')
    expect(v1Check.rows[0].status).toBe('ACTIVE')

    // 6. Verify the proposal was marked APPLIED
    const propCheck = await pool.query(
      'SELECT status FROM brain_strategy_evolution WHERE id = $1',
      [testProposalId]
    )
    expect(propCheck.rows[0].status).toBe('APPLIED')
  })

  it('rejects applyEvolution when proposal is not APPROVED', async () => {
    // Create a PROPOSED proposal
    const v1Res = await brainRepo.createStrategyV2({
      title: 'REGRESSION Test V1b',
      type: 'CONTENT_STRATEGY',
      objective: 'Test rejection',
      status: 'ACTIVE',
      description: 'Initial',
      rationale: 'Testing',
      evidence: {},
      evidenceRefs: [],
      assumptions: [],
      unknowns: [],
      unavailableData: [],
      risks: [],
      constraints: [],
      expectedObservations: [],
      successConditions: [],
      failureConditions: [],
      requiredPermissions: [],
      opportunityIds: [],
      decisionIds: [],
      researchIds: [],
      learningIds: [],
      parentStrategyId: null,
      version: 1,
      evidenceStrength: 'MODERATE_EVIDENCE',
      outcomeStatus: 'OBSERVING',
      freshness: 'FRESH',
      conflictFlags: [],
      provenance: 'TEST',
      confidence: 1.0,
      approvalRequired: false,
    })
    const stratId = v1Res!.id

    const propRes = await brainRepo.createStrategyEvolution({
      strategyId: stratId,
      sourceStrategyVersion: 1,
      proposedVersion: 2,
      evolutionType: 'REFINE',
      triggerType: 'OPPORTUNITY_CHANGED',
      evidenceRefs: [],
      opportunityIds: [],
      learningIds: [],
      decisionIds: [],
      executionIds: [],
      evidenceStrength: 'STRONGLY_SUPPORTED',
      confidence: 0.9,
      assumptions: [],
      unknowns: [],
      unavailableData: [],
      risks: [],
      proposedChanges: {},
      expectedObservations: [],
      successConditions: [],
      failureConditions: [],
      provenance: 'TEST',
      status: 'PROPOSED',
      approvalId: null,
    })
    const propId = propRes!.id

    await expect(engine.applyEvolution(propId, adminId)).rejects.toThrow(
      'Only APPROVED proposals can be applied'
    )

    // Cleanup
    await pool.query('DELETE FROM brain_strategy_evolution WHERE id = $1', [propId])
    await pool.query('DELETE FROM brain_strategies WHERE id = $1', [stratId])
  })
})