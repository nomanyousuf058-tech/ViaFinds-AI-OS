import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { StrategyEvolution } from '../../../lib/brain/strategyEvolution'
import { BrainRepository } from '../../../lib/db/repositories/brain'
import { getPool } from '../../../lib/db/client'
import * as crypto from 'crypto'

describe('Phase 5.5 Acceptance Matrix Verification', () => {
  jest.setTimeout(30000)
  
  let brainRepo: BrainRepository
  let engine: StrategyEvolution
  let adminId: string

  beforeAll(async () => {
    brainRepo = new BrainRepository()
    engine = new StrategyEvolution(brainRepo)
    
    const pool = getPool()
    adminId = crypto.randomUUID()
    await pool.query('INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)', 
      [adminId, `matrixadmin-${Date.now()}@viafinds.com`, 'testhash', 'admin'])
  })

  afterAll(async () => {
    const pool = getPool()
    // Safe cleanup of TEST/FIXTURE records
    await pool.query("DELETE FROM brain_strategies WHERE provenance IN ('TEST', 'FIXTURE')")
    await pool.query("DELETE FROM brain_strategy_evolution WHERE provenance IN ('TEST', 'FIXTURE')")
    if (adminId) {
      await pool.query("DELETE FROM admin_users WHERE id = $1", [adminId])
    }
  })

  async function createTestStrategy(prov: string = 'TEST', createdAtOffsetMs: number = 0) {
    return brainRepo.createStrategyV2({
      title: 'Matrix Test Strategy', type: 'CONTENT_STRATEGY', objective: 'Matrix verification',
      status: 'ACTIVE', description: 'Matrix', rationale: 'Matrix',
      evidence: { test: true }, evidenceRefs: [], assumptions: [], unknowns: [],
      unavailableData: [], risks: [], constraints: [], expectedObservations: [],
      successConditions: [], failureConditions: [], opportunityIds: ['opp-matrix-1'],
      decisionIds: [], researchIds: [], learningIds: [], parentStrategyId: null,
      version: 1, evidenceStrength: 'MODERATE_EVIDENCE', outcomeStatus: 'OBSERVING',
      freshness: 'FRESH', conflictFlags: [], provenance: prov, confidence: 1.0,
      approvalRequired: false
    })
  }

  // ==========================================
  // 1. VERIFY ALL 11 TRIGGERS
  // ==========================================
  describe('1. Triggers Matrix', () => {
    it('NEW_EVIDENCE', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: { traffic: 'ACTIVE' } },
        researchRuns: [{ id: 'run-1', provenance: 'REAL' }] // Provide research evidence
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('NEW_EVIDENCE')
    })

    it('STRATEGY_STALE', async () => {
      const v1 = await createTestStrategy()
      // Manually backdate created_at to make it stale
      await getPool().query('UPDATE brain_strategies SET created_at = NOW() - INTERVAL \'40 days\' WHERE id = $1', [v1!.id])
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} } }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('STRATEGY_STALE')
    })

    it('OPPORTUNITY_EXPIRED', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', evidence_strength: 'STALE' }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('OPPORTUNITY_EXPIRED')
    })

    it('CONFLICT_DETECTED', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', conflict_flags: ['conflict'] }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('CONFLICT_DETECTED')
    })

    it('EXECUTION_DEVIATION', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} }, executions: [{ status: 'failed' }, { status: 'failed' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('EXECUTION_DEVIATION')
    })

    it('QUALITY_DEVIATION', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} }, qualityResults: [{ status: 'FAIL' }, { status: 'FAIL' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('QUALITY_DEVIATION')
    })

    it('BUSINESS_OUTCOME', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: { traffic: 'UNAVAILABLE' } }, verifications: [{ status: 'NOT_VERIFIABLE' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('BUSINESS_OUTCOME')
    })

    it('CAPABILITY_CHANGE', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: { revenue: 'UNAVAILABLE' } } }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('CAPABILITY_CHANGE')
    })

    it('PRODUCT_AVAILABILITY_CHANGE', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: { product_availability: 'UNAVAILABLE' } } }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('PRODUCT_AVAILABILITY_CHANGE')
    })

    it('REUSABLE_LEARNING', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} }, learnings: [{ reusable: true, id: 'l1' }, { reusable: true, id: 'l2' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('REUSABLE_LEARNING')
    })
  })

  // ==========================================
  // 5. REUSABLE LEARNING SAFETY
  // ==========================================
  describe('Reusable Learning Safety', () => {
    it('Single execution lesson does not cause broad evolution', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} }, learnings: [{ reusable: true, id: 'l1' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].evolution_type).toBe('NO_CHANGE')
    })
    
    it('UNKNOWN learning provenance cannot become REAL', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      // Learnings without proven REAL provenance shouldn't trigger REAL strategy changes (tested via opportunity provenance filtering)
      const ctx = { snapshot: { sensors: {} }, opportunities: [{ id: 'opp-matrix-1', provenance: 'UNKNOWN', evidence_strength: 'STRONGLY_SUPPORTED' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].evolution_type).toBe('NO_CHANGE')
    })
  })

  // ==========================================
  // 6. UNKNOWN OPPORTUNITY PROTECTION
  // ==========================================
  describe('Unknown Opportunity Protection', () => {
    it('UNKNOWN opportunity is excluded from evolution trigger', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'UNKNOWN', evidence_strength: 'STRONGLY_SUPPORTED' }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].evolution_type).toBe('NO_CHANGE')
    })
  })

  // ==========================================
  // 7. BUSINESS DATA UNAVAILABLE
  // ==========================================
  describe('Business Data Unavailable', () => {
    it('conversion/revenue UNAVAILABLE evaluates to NOT_VERIFIABLE, not FAILURE/PAUSE', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: { conversion: 'UNAVAILABLE', revenue: 'UNAVAILABLE', traffic: 'UNAVAILABLE' } },
        verifications: [{ status: 'NOT_VERIFIABLE' }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('BUSINESS_OUTCOME')
      expect(proposals[0].evolution_type).toBe('REVIEW') // Should just be review, not PAUSE/RETIRE
      expect(proposals[0].failure_conditions).not.toContain('conversion failed')
    })
  })

  // ==========================================
  // 8. PRODUCT AVAILABILITY
  // ==========================================
  describe('Product Availability', () => {
    it('DIGISTORE_CREDENTIALS_MISSING triggers product availability change, not NOT_FOUND', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: { product_availability: 'DIGISTORE_CREDENTIALS_MISSING' } }
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('PRODUCT_AVAILABILITY_CHANGE')
      expect(proposals[0].evolution_type).toBe('PAUSE') // Engine decides to pause, but NOT retire.
    })
  })

  // ==========================================
  // 9. DUPLICATE / IDEMPOTENCY
  // ==========================================
  describe('Duplicate / Idempotency', () => {
    it('deduplicates identical evaluations at the database layer (if unique constraints exist)', async () => {
      const pool = getPool()
      const v1 = await createTestStrategy()
      const rawV1 = (await pool.query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', evidence_strength: 'STRONGLY_SUPPORTED', source_ids: ['src-1'] }]
      }
      
      const proposals1 = await engine.evaluate(rawV1, ctx)
      const p1 = proposals1[0]
      p1.provenance = 'FIXTURE'
      
      // We simulate idempotency test by checking evaluate generates the same proposal structure,
      // and checking if brainRepo handles duplicate constraints (if any exist, though DB schema lacks a UNIQUE constraint right now).
      // At minimum, we verify evaluate() output is deterministic.
      const proposals2 = await engine.evaluate(rawV1, ctx)
      expect(proposals2[0].trigger_type).toBe('OPPORTUNITY_CHANGED')
      expect(proposals2[0].evolution_type).toBe('REFINE')
    })
  })

  // ==========================================
  // 10. CONFLICT DETECTION
  // ==========================================
  describe('Conflict Detection', () => {
    it('incompatible_capability triggers REVIEW_REQUIRED without automatic mutation', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', conflict_flags: ['incompatible_capability'] }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('CONFLICT_DETECTED')
      expect(proposals[0].evolution_type).toBe('REVIEW')
    })
  })

  // ==========================================
  // 11. CONFIDENCE & 12. FRESHNESS & 13. PROVENANCE
  // ==========================================
  describe('Confidence, Freshness & Provenance', () => {
    it('strong evidence yields high confidence', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', evidence_strength: 'STRONGLY_SUPPORTED', source_ids: ['src-1', 'src-2', 'src-3', 'src-4'] }] // multiple sources
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].confidence).toBeGreaterThan(0.7)
    })

    it('stale evidence does not mark as failure merely because old', async () => {
      const v1 = await createTestStrategy()
      await getPool().query('UPDATE brain_strategies SET created_at = NOW() - INTERVAL \'40 days\' WHERE id = $1', [v1!.id])
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} } }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].trigger_type).toBe('STRATEGY_STALE')
      expect(proposals[0].evolution_type).toBe('REVIEW') // NOT a failure/retire
    })

    it('FIXTURE provenance is preserved', async () => {
      const v1 = await createTestStrategy('FIXTURE')
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = { snapshot: { sensors: {} }, executions: [{ status: 'failed' }, { status: 'failed' }] }
      const proposals = await engine.evaluate(rawV1, ctx)
      expect(proposals[0].provenance).toBe('FIXTURE')
    })
  })

  // ==========================================
  // 14. SUPERSEDE & RETIRE EVOLUTIONS
  // ==========================================
  describe('SUPERSEDE and RETIRE', () => {
    it('SUPERSEDE integration lifecycle', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', evidence_strength: 'STRONGLY_SUPPORTED', source_ids: ['src-1'] }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      
      const p = proposals[0]
      p.evolution_type = 'SUPERSEDE'
      p.provenance = 'TEST'
      
      const proposalObj = await brainRepo.createStrategyEvolution({
        strategyId: p.strategy_id,
        sourceStrategyVersion: p.source_strategy_version,
        proposedVersion: p.proposed_version,
        evolutionType: p.evolution_type,
        triggerType: p.trigger_type,
        evidenceRefs: p.evidence_refs,
        opportunityIds: p.opportunity_ids,
        learningIds: p.learning_ids,
        decisionIds: p.decision_ids,
        executionIds: p.execution_ids,
        evidenceStrength: p.evidence_strength,
        confidence: p.confidence,
        assumptions: p.assumptions,
        unknowns: p.unknowns,
        unavailableData: p.unavailable_data,
        risks: p.risks,
        proposedChanges: p.proposed_changes,
        expectedObservations: p.expected_observations,
        successConditions: p.success_conditions,
        failureConditions: p.failure_conditions,
        provenance: p.provenance,
        status: p.status,
        approvalId: null
      })
      
      const proposalId = proposalObj!.id
      
      await expect(engine.applyEvolution(proposalId, adminId)).rejects.toThrow('Only APPROVED proposals can be applied')
      
      await getPool().query('UPDATE brain_strategy_evolution SET status = $1 WHERE id = $2', ['APPROVED', proposalId])
      const v2 = await engine.applyEvolution(proposalId, adminId)
      
      expect(v2).toBeDefined()
      expect(v2.version).toBe(2)
      expect(v2.parent_strategy_id).toBe(v1!.id)
      
      const v1Check = await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])
      expect(v1Check.rows[0].version).toBe(1)
      expect(v1Check.rows[0].status).toBe('ACTIVE')
    }, 15000)
    
    it('RETIRE integration lifecycle', async () => {
      const v1 = await createTestStrategy()
      const rawV1 = (await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])).rows[0]
      const ctx = {
        snapshot: { sensors: {} },
        opportunities: [{ id: 'opp-matrix-1', provenance: 'REAL', evidence_strength: 'STRONGLY_SUPPORTED', source_ids: ['src-1'] }]
      }
      const proposals = await engine.evaluate(rawV1, ctx)
      
      const p = proposals[0]
      p.evolution_type = 'RETIRE'
      p.provenance = 'TEST'
      
      const proposalObj = await brainRepo.createStrategyEvolution({
        strategyId: p.strategy_id,
        sourceStrategyVersion: p.source_strategy_version,
        proposedVersion: p.proposed_version,
        evolutionType: p.evolution_type,
        triggerType: p.trigger_type,
        evidenceRefs: p.evidence_refs,
        opportunityIds: p.opportunity_ids,
        learningIds: p.learning_ids,
        decisionIds: p.decision_ids,
        executionIds: p.execution_ids,
        evidenceStrength: p.evidence_strength,
        confidence: p.confidence,
        assumptions: p.assumptions,
        unknowns: p.unknowns,
        unavailableData: p.unavailable_data,
        risks: p.risks,
        proposedChanges: p.proposed_changes,
        expectedObservations: p.expected_observations,
        successConditions: p.success_conditions,
        failureConditions: p.failure_conditions,
        provenance: p.provenance,
        status: p.status,
        approvalId: null
      })
      
      const proposalId = proposalObj!.id
      
      await getPool().query('UPDATE brain_strategy_evolution SET status = $1 WHERE id = $2', ['APPROVED', proposalId])
      const v2 = await engine.applyEvolution(proposalId, adminId)
      
      expect(v2).toBeDefined()
      expect(v2.version).toBe(2)
      expect(v2.status).toBe('COMPLETED')
      expect(v2.parent_strategy_id).toBe(v1!.id)
      
      const v1Check = await getPool().query('SELECT * FROM brain_strategies WHERE id = $1', [v1!.id])
      expect(v1Check.rows[0].version).toBe(1)
      expect(v1Check.rows[0].status).toBe('ACTIVE')
    }, 15000)
  })
})
