import { BrainRepository } from '../db/repositories/brain'
import { getPool } from '../db/client'
import { createHash, randomUUID } from 'crypto'
import { BusinessHealthSnapshot } from './businessIntelligence'
import { BrainOpportunity } from './types'

export type DecisionType = 
  | 'INVESTIGATE'
  | 'RESEARCH'
  | 'CREATE_CONTENT'
  | 'IMPROVE_CONTENT'
  | 'TEST'
  | 'TRACKING'
  | 'PRODUCT_RESEARCH'
  | 'STRATEGY_CHANGE'
  | 'IMPLEMENTATION_REQUEST'
  | 'DEFER'
  | 'REJECT'

export type DecisionStatus = 
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'FAILED'
  | 'DEFERRED'
  | 'NOT_VERIFIABLE'

export interface BrainDecision {
  id?: string
  type: DecisionType
  title: string
  rationale: string
  evidence: Record<string, unknown>
  provenance: string
  confidence: number
  expectedImpact: string
  risks: string[]
  prerequisites: string[]
  requiredPermissions: string[]
  status: DecisionStatus
  createdAt?: string
  updatedAt?: string
  fingerprint?: string
}

export class DecisionCenter {
  private brainRepo: BrainRepository

  constructor(brainRepo?: BrainRepository) {
    this.brainRepo = brainRepo || new BrainRepository()
  }

  /**
   * Deterministic fingerprint to deduplicate decisions based on context and evidence
   */
  private generateFingerprint(type: DecisionType, title: string, evidenceHash: string): string {
    return createHash('sha256').update(`${type}:${title}:${evidenceHash}`).digest('hex')
  }

  /**
   * Translates BI snapshots and opportunities into formal PROPOSED decisions
   */
  async evaluateBusinessSnapshot(snapshot: BusinessHealthSnapshot, opportunities: BrainOpportunity[]): Promise<BrainDecision[]> {
    const decisions: BrainDecision[] = []

    // 1. Evaluate Traffic & Clicks Funnel
    if (snapshot.sensors.affiliateClicks === 'ACTIVE' && snapshot.affiliate.totalClicks.state === 'OBSERVED_ZERO') {
      if (snapshot.sensors.affiliateConversions === 'UNAVAILABLE') {
        decisions.push({
          type: 'INVESTIGATE',
          title: 'Investigate affiliate click generation',
          rationale: 'No affiliate clicks are currently observed. Conversion measurement is unavailable, so conversion performance cannot yet be evaluated.',
          evidence: {
            clicks: snapshot.affiliate.totalClicks,
            conversionSensor: snapshot.sensors.affiliateConversions
          },
          provenance: 'REAL',
          confidence: 0.9,
          expectedImpact: 'Identify funnel drop-off before conversion layer',
          risks: ['May require content layout changes'],
          prerequisites: [],
          requiredPermissions: ['read:analytics'],
          status: 'PROPOSED'
        })
      }
    }

    // 2. Evaluate Measurement Gaps
    if (snapshot.sensors.affiliateConversions === 'UNAVAILABLE' || snapshot.sensors.revenue === 'UNAVAILABLE') {
      decisions.push({
        type: 'TRACKING',
        title: 'Configure revenue and conversion measurement',
        rationale: 'Configure revenue and conversion measurement before evaluating monetization performance.',
        evidence: {
          conversionSensor: snapshot.sensors.affiliateConversions,
          revenueSensor: snapshot.sensors.revenue
        },
        provenance: 'REAL',
        confidence: 1.0,
        expectedImpact: 'Enable full-funnel ROI intelligence',
        risks: ['Requires 3rd-party API credentials (e.g. Digistore24)'],
        prerequisites: [],
        requiredPermissions: ['admin:settings'],
        status: 'PROPOSED'
      })
    }

    // 3. Evaluate Real Opportunities
    const realOpportunities = opportunities.filter(o => o.provenance === 'REAL')
    for (const opp of realOpportunities) {
      const sourceCount = opp.structuredObservation?.sourceMetadata ? 1 : (opp.source ? 1 : 0)
      decisions.push({
        type: 'CREATE_CONTENT',
        title: `Create a strategy for opportunity: ${opp.title}`,
        rationale: `A provenanced opportunity exists based on real evidence from ${sourceCount} source(s).`,
        evidence: { opportunityId: opp.id, sources: sourceCount },
        provenance: 'REAL',
        confidence: 0.8,
        expectedImpact: 'Expand content inventory with data-backed topic',
        risks: ['Execution cost'],
        prerequisites: [],
        requiredPermissions: ['execute:strategy'],
        status: 'PROPOSED'
      })
    }

    // 4. Reject UNKNOWN Opportunities
    const unknownOpportunities = opportunities.filter(o => o.provenance === 'UNKNOWN')
    for (const opp of unknownOpportunities) {
      decisions.push({
        type: 'REJECT',
        title: 'Revalidate UNKNOWN opportunity',
        rationale: 'This opportunity lacks verifiable provenance and cannot be executed.',
        evidence: { opportunityId: opp.id },
        provenance: 'UNKNOWN',
        confidence: 1.0,
        expectedImpact: 'Prevent synthetic or unverified actions from wasting execution budget',
        risks: [],
        prerequisites: [],
        requiredPermissions: [],
        status: 'REJECTED' // Starts rejected because we don't want to execute unknown things
      })
    }

    return await this.persistDecisions(decisions)
  }

  private async persistDecisions(decisions: BrainDecision[]): Promise<BrainDecision[]> {
    const pool = getPool()
    const persisted: BrainDecision[] = []

    for (const decision of decisions) {
      const evidenceStr = JSON.stringify(decision.evidence)
      const fingerprint = this.generateFingerprint(decision.type, decision.title, evidenceStr)
      decision.fingerprint = fingerprint

      // Idempotent upsert relying on the unique database constraint
      const result = await pool.query(`
        INSERT INTO brain_decisions (
          type, title, rationale, evidence, provenance, confidence,
          expected_impact, risks, prerequisites, required_permissions, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (type, title, rationale) DO UPDATE SET
          updated_at = NOW()
        RETURNING *
      `, [
        decision.type,
        decision.title,
        decision.rationale,
        evidenceStr,
        decision.provenance,
        decision.confidence,
        decision.expectedImpact,
        JSON.stringify(decision.risks),
        JSON.stringify(decision.prerequisites),
        JSON.stringify(decision.requiredPermissions),
        decision.status
      ])

      const row = result.rows[0]
      persisted.push({
        ...decision,
        id: row.id,
        status: row.status as DecisionStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })
    }

    return persisted
  }

  async transitionDecision(decisionId: string, newStatus: DecisionStatus, adminUserId: string): Promise<boolean> {
    const pool = getPool()
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Verify admin exists
      const adminCheck = await client.query('SELECT role FROM admin_users WHERE id = $1', [adminUserId])
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        throw new Error('Unauthorized transition attempt')
      }

      // Lock row to prevent concurrent modification
      const current = await client.query('SELECT status FROM brain_decisions WHERE id = $1 FOR UPDATE', [decisionId])
      if (current.rows.length === 0) {
        await client.query('ROLLBACK')
        return false
      }

      const currentStatus = current.rows[0].status
      const allowedTransitions: Record<string, string[]> = {
        'PROPOSED': ['APPROVED', 'REJECTED', 'DEFERRED'],
        'APPROVED': ['EXECUTING', 'DEFERRED'],
        'EXECUTING': ['COMPLETED', 'FAILED'],
        'COMPLETED': ['VERIFIED', 'NOT_VERIFIABLE'],
        'DEFERRED': ['PROPOSED', 'APPROVED', 'REJECTED']
      }

      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        await client.query('ROLLBACK')
        throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`)
      }

      await client.query(
        'UPDATE brain_decisions SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, decisionId]
      )
      
      await client.query('COMMIT')
      return true
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  /**
   * Generates an authorized execution request from an APPROVED Decision.
   * Enforces atomic status transitions and idempotent job creation.
   */
  async executeDecision(decisionId: string, adminUserId: string): Promise<{ success: boolean; jobId?: string; error?: string }> {
    const pool = getPool()
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 1. Verify admin authorization
      const adminCheck = await client.query('SELECT role FROM admin_users WHERE id = $1', [adminUserId])
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        throw new Error('Unauthorized execution attempt')
      }

      // 2. Lock decision row atomically
      const decisionCheck = await client.query('SELECT * FROM brain_decisions WHERE id = $1 FOR UPDATE', [decisionId])
      if (decisionCheck.rows.length === 0) {
        throw new Error('Decision not found')
      }
      
      const decision = decisionCheck.rows[0]

      // 3. Status validation: Must be APPROVED
      if (decision.status !== 'APPROVED') {
        throw new Error(`Decision cannot be executed in state "${decision.status}". Must be APPROVED.`)
      }

      // 4. Job Creation with Idempotency
      // We map the Decision Type to a generic or specific Automation Job Type
      const jobType = 'brain_strategy_execution'
      const idempotencyKey = `decision_exec_${decisionId}`
      const jobId = randomUUID()

      // ON CONFLICT DO NOTHING ensures that if multiple concurrent execute calls occur
      // after the APPROVED check (if it was somehow bypassed), the DB enforces idempotency.
      const jobInsert = await client.query(`
        INSERT INTO automation_jobs (
          id, idempotency_key, type, stage, content_type, content_id, status, priority, provider, input, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `, [
        jobId,
        idempotencyKey,
        jobType,
        'init',
        'brain_decision',
        decisionId,
        'queued',
        10,
        'claude', // Assuming default provider for strategy
        decision.evidence || {}
      ])

      let activeJobId = jobId;
      if (jobInsert.rows.length === 0) {
        const existing = await client.query('SELECT id FROM automation_jobs WHERE idempotency_key = $1', [idempotencyKey])
        if (existing.rows.length > 0) activeJobId = existing.rows[0].id
      }

      // 5. Update decision status
      await client.query(
        'UPDATE brain_decisions SET status = $1, updated_at = NOW() WHERE id = $2',
        ['EXECUTING', decisionId]
      )

      await client.query('COMMIT')
      return { success: true, jobId: activeJobId }
    } catch (e) {
      await client.query('ROLLBACK')
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    } finally {
      client.release()
    }
  }

  /**
   * Consumes a completed experiment and translates it into a Decision Proposal.
   * - Enforces rule versioning and provenance
   * - Only operates on terminal states (COMPLETED, INCONCLUSIVE)
   * - Deterministic output prevents duplicate logic
   */
  async processExperimentEvidence(experimentId: string): Promise<BrainDecision> {
    const pool = getPool()

    // 1. Fetch experiment and result atomically to validate evidence exists
    const expResult = await pool.query(`
      SELECT 
        e.id as exp_id, e.hypothesis, e.status,
        r.id as result_id, r.conclusion, r.p_value, r.relative_difference, r.sample_adequacy,
        r.control_sample_size, r.treatment_sample_size
      FROM brain_experiments e
      LEFT JOIN brain_experiment_results r ON e.id = r.experiment_id
      WHERE e.id = $1
    `, [experimentId])

    if (expResult.rows.length === 0) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    const exp = expResult.rows[0]
    
    if (exp.status !== 'COMPLETED' && exp.status !== 'INCONCLUSIVE') {
      throw new Error(`Cannot process evidence for experiment in state: ${exp.status}`)
    }

    if (!exp.result_id) {
      throw new Error(`Experiment ${experimentId} has no statistical result attached.`)
    }

    // 2. Exact Rule Mapping (Version 1.0)
    const ruleVersion = '1.0'
    let decisionType: DecisionType
    let expectedImpact: string
    let rationale: string

    switch (exp.conclusion) {
      case 'SIGNIFICANT_WIN':
        decisionType = 'STRATEGY_CHANGE'
        expectedImpact = 'Scale the winning treatment variant to 100% of applicable traffic.'
        rationale = `Experiment proved the hypothesis. Treatment outperformed baseline with statistical significance (p=${exp.p_value}).`
        break
      case 'SIGNIFICANT_LOSS':
        decisionType = 'STRATEGY_CHANGE'
        expectedImpact = 'Explicitly avoid the treatment variant.'
        rationale = `Experiment disproved the hypothesis. Treatment performed worse than baseline with statistical significance (p=${exp.p_value}).`
        break
      case 'NO_SIGNIFICANCE':
      case 'INSUFFICIENT_SAMPLE':
        decisionType = 'DEFER'
        expectedImpact = 'Maintain baseline operations. No clear strategic shift warranted.'
        rationale = `Experiment reached ${exp.status} with conclusion ${exp.conclusion}. The evidence does not justify a strategy change.`
        break
      default:
        decisionType = 'INVESTIGATE'
        expectedImpact = 'Diagnose evaluation failure.'
        rationale = `Experiment yielded conclusion ${exp.conclusion}. Manual review required.`
    }

    // 3. Construct structured proposal
    const decision: BrainDecision = {
      type: decisionType,
      title: `Experiment Decision: ${exp.hypothesis.substring(0, 50)}...`,
      rationale,
      evidence: {
        experimentId: exp.exp_id,
        resultId: exp.result_id,
        decisionRuleVersion: ruleVersion,
        generatedAt: new Date().toISOString(),
        aiModel: 'NONE (Deterministic)',
        statistics: {
          conclusion: exp.conclusion,
          pValue: exp.p_value,
          relativeDifference: exp.relative_difference,
          sampleAdequacy: exp.sample_adequacy,
          controlSampleSize: exp.control_sample_size,
          treatmentSampleSize: exp.treatment_sample_size
        }
      },
      provenance: 'EXPERIMENT',
      confidence: exp.status === 'COMPLETED' ? 0.95 : 0.5,
      expectedImpact,
      risks: ['Review baseline implementation before executing change'],
      prerequisites: [`experiment:${exp.exp_id}:terminal`],
      requiredPermissions: ['execute:strategy'],
      status: 'PROPOSED'
    }

    // 4. Idempotently persist via the existing persistDecisions logic
    const persisted = await this.persistDecisions([decision])

    // 5. Feed experiment result into Brain Learning (EXPERIMENT → LEARNING → STRATEGY)
    try {
      const { LearningEngine } = await import('./learningEngine')
      const { generateCorrelationId } = await import('./types')
      const learningEngine = new LearningEngine(generateCorrelationId())

      const isSignificant = exp.conclusion === 'SIGNIFICANT_WIN' || exp.conclusion === 'SIGNIFICANT_LOSS'
      await learningEngine.learnFromOutcome(
        `Experiment hypothesis: ${exp.hypothesis}`,
        `Conclusion: ${exp.conclusion}, p=${exp.p_value}, relative diff=${exp.relative_difference}`,
        exp.conclusion === 'SIGNIFICANT_WIN',
        {
          entityType: 'experiment',
          entityId: exp.exp_id,
          experimentId: exp.exp_id,
          experimentConclusion: exp.conclusion,
          sampleSize: (exp.control_sample_size || 0) + (exp.treatment_sample_size || 0),
          evidence: {
            pValue: exp.p_value,
            relativeDifference: exp.relative_difference,
            sampleAdequacy: exp.sample_adequacy,
            controlSampleSize: exp.control_sample_size,
            treatmentSampleSize: exp.treatment_sample_size,
            decisionType: decision.type,
            decisionRuleVersion: ruleVersion,
          },
          failureReason: exp.conclusion === 'SIGNIFICANT_LOSS' ? 'Treatment performed significantly worse than baseline' : undefined,
        }
      )
    } catch (learningError) {
      // Learning failure must not block decision persistence
      console.warn('DecisionCenter: Failed to record experiment learning:', learningError instanceof Error ? learningError.message : String(learningError))
    }

    return persisted[0]
  }
}
