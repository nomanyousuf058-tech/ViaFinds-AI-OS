import { Pool } from 'pg'
import { getPool } from '../client'
import { BrainOpportunity, BrainStrategy } from '@/lib/brain/types'

export class BrainRepository {
  private pool: Pool | null = null

  private async getDb(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  /** Public accessor for callers (e.g. StrategyEvolution) that need direct pool access. */
  async getDbPool(): Promise<Pool> {
    return this.getDb()
  }

  /**
   * Retry a statement when the failure is a transient connection problem.
   * Never retries constraint or syntax errors — those are deterministic.
   */
  private async withConnectionRetry<T>(fn: (pool: Pool) => Promise<T>, attempts = 3): Promise<T> {
    const transient =
      /Connection terminated|connection timeout|Connection reset|ECONNRESET|EPIPE|ETIMEDOUT|Client has encountered a connection error|timeout exceeded when trying to connect|server closed the connection/i

    let lastError: unknown
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn(await this.getDb())
      } catch (e) {
        lastError = e
        const message = e instanceof Error ? e.message : String(e)
        if (!transient.test(message) || attempt === attempts) throw e
        console.warn(
          `BrainRepository: transient connection failure (${message.split('\n')[0].slice(0, 120)}), retry ${attempt}/${attempts - 1}`
        )
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
      }
    }
    throw lastError
  }

  // ───── brain_business_snapshots ─────

  async createBusinessSnapshot(snapshot: any): Promise<void> {
    try {
      const pool = await this.getDb()
      await pool.query(
        `INSERT INTO brain_business_snapshots (
          generated_at, data_window, sensors, content, traffic, affiliate, 
          conversions, revenue, opportunities, automation, quality, 
          bottlenecks, measurement_gaps, evidence, confidence, provenance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          snapshot.generatedAt,
          JSON.stringify(snapshot.dataWindow),
          JSON.stringify(snapshot.sensors),
          JSON.stringify(snapshot.content),
          JSON.stringify(snapshot.traffic),
          JSON.stringify(snapshot.affiliate),
          JSON.stringify(snapshot.conversions),
          JSON.stringify(snapshot.revenue),
          JSON.stringify(snapshot.opportunities),
          JSON.stringify(snapshot.automation),
          JSON.stringify(snapshot.quality),
          JSON.stringify(snapshot.bottlenecks),
          JSON.stringify(snapshot.measurementGaps),
          JSON.stringify(snapshot.evidence),
          snapshot.confidence,
          snapshot.provenance
        ]
      )
    } catch (e) {
      console.error('BrainRepository.createBusinessSnapshot:', e)
      throw e
    }
  }

  // ───── brain_reports ─────

  async createReport(): Promise<{ id: string; created_at: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_reports (status, started_at) VALUES ('generating', NOW()) RETURNING id, created_at`
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createReport:', e)
      return null
    }
  }

  async updateReport(id: string, data: {
    status: string;
    context?: unknown;
    observations?: unknown;
    opportunities?: unknown;
    recommendations?: unknown;
    error?: string;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      await pool.query(
        `UPDATE brain_reports SET status=$1, context=$2, observations=$3, opportunities=$4, recommendations=$5, error=$6, completed_at=NOW(), updated_at=NOW() WHERE id=$7`,
        [data.status, JSON.stringify(data.context || {}), JSON.stringify(data.observations || []), JSON.stringify(data.opportunities || []), JSON.stringify(data.recommendations || []), data.error || null, id]
      )
      return true
    } catch (e) {
      console.error('BrainRepository.updateReport:', e)
      return false
    }
  }

  async getLatestReport(): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_reports ORDER BY created_at DESC LIMIT 1`)
      return result.rows[0] || null
    } catch { return null }
  }

  async listReports(limit = 10): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_reports ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  // ───── brain_observations ─────

  async insertObservations(reportId: string, observations: Array<{
    type: string; fact: string; evidence: string; inference: string;
    recommendation: string; confidence: string; source: string;
  }>): Promise<void> {
    if (observations.length === 0) return
    try {
      const pool = await this.getDb()
      for (const o of observations) {
        await pool.query(
          `INSERT INTO brain_observations (report_id, type, fact, evidence, inference, recommendation, confidence, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [reportId, o.type, o.fact, o.evidence, o.inference, o.recommendation, o.confidence, o.source || 'Brain Analysis']
        )
      }
    } catch (e) {
      console.error('BrainRepository.insertObservations:', e)
    }
  }

  // ───── brain_memory ─────

  async listMemory(limit = 50): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_memory WHERE status='active' ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  // ───── brain_strategies ─────

  async createStrategy(data: {
    title: string; description: string; business_goal: string; reason: string;
    evidence: unknown; expected_impact: string; confidence: string; risks: string;
    status?: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_strategies (title, description, business_goal, reason, evidence, expected_impact, confidence, risks, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [data.title, data.description, data.business_goal, data.reason, JSON.stringify(data.evidence), data.expected_impact, data.confidence, data.risks, data.status || 'proposed']
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createStrategy:', e)
      return null
    }
  }

  async listStrategies(): Promise<BrainStrategy[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_strategies WHERE status != 'archived' ORDER BY created_at DESC`)
      return result.rows.map(row => this.mapStrategyRow(row))
    } catch { return [] }
  }

  async getStrategy(id: string): Promise<BrainStrategy | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_strategies WHERE id=$1`, [id])
      const row = result.rows[0]
      if (!row) return null
      return this.mapStrategyRow(row)
    } catch { return null }
  }

  async updateStrategyStatus(id: string, status: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      await pool.query(`UPDATE brain_strategies SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id])
      return true
    } catch { return false }
  }

  // ───── brain_opportunities ─────

  async createOpportunity(data: {
    title: string; type: string; description: string; evidence: unknown;
    source: string; confidence: string; potential_impact: string; effort: string;
    risk: string; recommended_action: string; status?: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_opportunities (title, type, description, evidence, source, confidence, potential_impact, effort, risk, recommended_action, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [data.title, data.type, data.description, JSON.stringify(data.evidence), data.source, data.confidence, data.potential_impact, data.effort, data.risk, data.recommended_action, data.status || 'new']
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createOpportunity:', e)
      return null
    }
  }

  async listOpportunities(limit = 50): Promise<BrainOpportunity[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_opportunities WHERE status != 'archived' ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows.map(row => this.mapOpportunityRow(row))
    } catch { return [] }
  }

  async getOpportunity(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_opportunities WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async updateOpportunityStatus(id: string, status: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      await pool.query(`UPDATE brain_opportunities SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id])
      return true
    } catch { return false }
  }

  // ───── brain_tasks ─────

  async createTask(data: {
    type: string; title: string; goal: string; priority: string;
    strategy_id?: string; opportunity_id?: string;
    inputs?: unknown; context?: unknown;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_tasks (type, title, goal, priority, strategy_id, opportunity_id, inputs, context, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'queued') RETURNING id`,
        [data.type, data.title, data.goal, data.priority, data.strategy_id || null, data.opportunity_id || null, JSON.stringify(data.inputs || {}), JSON.stringify(data.context || {})]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTask:', e)
      return null
    }
  }

  async listTasks(limit = 50): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_tasks WHERE status != 'archived' ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  async getTask(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_tasks WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async updateTask(id: string, data: {
    status?: string; evidence?: unknown; recommendation?: string;
    approval_state?: string; approval_id?: string | null;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      if (data.status) { sets.push(`status=$${idx++}`); vals.push(data.status) }
      if (data.evidence) { sets.push(`evidence=$${idx++}`); vals.push(JSON.stringify(data.evidence)) }
      if (data.recommendation) { sets.push(`recommendation=$${idx++}`); vals.push(data.recommendation) }
      if (data.approval_state) { sets.push(`approval_state=$${idx++}`); vals.push(data.approval_state) }
      if (data.approval_id !== undefined) { sets.push(`approval_id=$${idx++}`); vals.push(data.approval_id) }
      vals.push(id)
      await pool.query(`UPDATE brain_tasks SET ${sets.join(',')} WHERE id=$${idx}`, vals)
      return true
    } catch { return false }
  }

  // ───── brain_execution_plans ─────

  async createExecutionPlan(data: {
    task_id: string; strategy_id?: string; execution_type: string;
    target?: string; inputs?: unknown; expected_output?: string;
    quality_requirements?: unknown; rollback_plan?: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_execution_plans (task_id, strategy_id, execution_type, target, inputs, expected_output, quality_requirements, rollback_plan, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'planned') RETURNING id`,
        [data.task_id, data.strategy_id || null, data.execution_type, data.target || null, JSON.stringify(data.inputs || {}), data.expected_output || null, JSON.stringify(data.quality_requirements || []), data.rollback_plan || null]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createExecutionPlan:', e)
      return null
    }
  }

  async getExecutionPlan(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async getExecutionPlanByJobId(jobId: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans WHERE automation_job_id=$1`, [jobId])
      return result.rows[0] || null
    } catch { return null }
  }

  async storeMemory(context_type: string, data: Record<string, unknown>, importance: string, context_id: string = ''): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_memories (context_type, context_id, data, importance) VALUES ($1, $2, $3, $4) RETURNING *`,
        [context_type, context_id, JSON.stringify(data), importance]
      )
      return result.rows[0] || null
    } catch { return null }
  }

  async listExecutionPlans(limit = 50): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  async updateExecutionPlanStatus(id: string, status: string, automation_job_id?: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['status=$1', 'updated_at=NOW()']
      const vals: unknown[] = [status]
      if (automation_job_id) {
        sets.push('automation_job_id=$2')
        vals.push(automation_job_id)
      }
      vals.push(id)
      await pool.query(`UPDATE brain_execution_plans SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals)
      return true
    } catch { return false }
  }

  // ───── brain_quality_results ─────

  async createQualityResult(data: {
    execution_plan_id: string; target_id?: string; target_type?: string;
    overall_status: string; checks?: unknown; failure_reason?: string;
    recommended_fix?: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_quality_results (execution_plan_id, target_id, target_type, overall_status, checks, failure_reason, recommended_fix) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [data.execution_plan_id, data.target_id || null, data.target_type || null, data.overall_status, JSON.stringify(data.checks || []), data.failure_reason || null, data.recommended_fix || null]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createQualityResult:', e)
      return null
    }
  }

  // ───── brain_implementation_requests ─────

  async createImplementationRequest(data: {
    title: string; capability_gap: string; reason: string;
    specification: unknown; acceptance_criteria: string; priority: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_implementation_requests (title, capability_gap, reason, specification, acceptance_criteria, priority, status) VALUES ($1,$2,$3,$4,$5,$6,'proposed') RETURNING id`,
        [data.title, data.capability_gap, data.reason, JSON.stringify(data.specification), data.acceptance_criteria, data.priority]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createImplementationRequest:', e)
      return null
    }
  }

  async listImplementationRequests(): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_implementation_requests ORDER BY created_at DESC`)
      return result.rows
    } catch { return [] }
  }

  async updateImplementationRequestStatus(id: string, status: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      await pool.query(`UPDATE brain_implementation_requests SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id])
      return true
    } catch { return false }
  }

  // ───── System counts (READ-ONLY) ─────

  async countArticles(): Promise<{ total: number; published: number; draft: number }> {
    try {
      const pool = await this.getDb()
      const total = await pool.query(`SELECT COUNT(*) as count FROM articles`)
      const published = await pool.query(`SELECT COUNT(*) as count FROM articles WHERE status='published'`)
      return {
        total: parseInt(total.rows[0]?.count || '0'),
        published: parseInt(published.rows[0]?.count || '0'),
        draft: parseInt(total.rows[0]?.count || '0') - parseInt(published.rows[0]?.count || '0'),
      }
    } catch { return { total: 0, published: 0, draft: 0 } }
  }

  async countProducts(): Promise<number> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT COUNT(*) as count FROM products`)
      return parseInt(result.rows[0]?.count || '0')
    } catch { return 0 }
  }

  async countJobs(): Promise<{ total: number; queued: number; failed: number }> {
    try {
      const pool = await this.getDb()
      const total = await pool.query(`SELECT COUNT(*) as count FROM automation_jobs`)
      const queued = await pool.query(`SELECT COUNT(*) as count FROM automation_jobs WHERE status='queued'`)
      const failed = await pool.query(`SELECT COUNT(*) as count FROM automation_jobs WHERE status='failed'`)
      return {
        total: parseInt(total.rows[0]?.count || '0'),
        queued: parseInt(queued.rows[0]?.count || '0'),
        failed: parseInt(failed.rows[0]?.count || '0'),
      }
    } catch { return { total: 0, queued: 0, failed: 0 } }
  }

  async countServices(): Promise<{ total: number; configured: number }> {
    try {
      const pool = await this.getDb()
      const total = await pool.query(`SELECT COUNT(*) as count FROM service_connections`)
      const configured = await pool.query(`SELECT COUNT(*) as count FROM service_connections WHERE status='configured'`)
      return {
        total: parseInt(total.rows[0]?.count || '0'),
        configured: parseInt(configured.rows[0]?.count || '0'),
      }
    } catch { return { total: 0, configured: 0 } }
  }

  async getRecentArticles(limit = 5): Promise<Array<{ id: string; title: string; slug: string; status: string; category_id: string | null; published_at: string | null }>> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT id, title, slug, status, category_id, published_at FROM articles ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  async getRecentProducts(limit = 5): Promise<Array<{ id: string; title: string; slug: string; category: string | null; affiliate_network: string | null; status: string }>> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT id, title, slug, category, affiliate_network, status FROM products ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  // ───── Phase 4: brain_opportunities (enhanced) ─────

  async createOpportunityPhase4(data: {
    title: string; category: string; description: string;
    structuredObservation: any; evaluation: any; source: any;
    brainReasoning: string; status?: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_opportunities (title, category, description, structured_observation, evaluation, source, brain_reasoning, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [data.title, data.category, data.description, JSON.stringify(data.structuredObservation), JSON.stringify(data.evaluation), JSON.stringify(data.source), data.brainReasoning, data.status || 'detected']
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createOpportunityPhase4:', e)
      return null
    }
  }

  async getOpportunityById(id: string): Promise<BrainOpportunity | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_opportunities WHERE id=$1`, [id])
      const row = result.rows[0]
      if (!row) return null
      return this.mapOpportunityRow(row)
    } catch { return null }
  }

  private mapOpportunityRow(row: Record<string, unknown>): BrainOpportunity {
    return {
      id: row.id as string,
      title: row.title as string,
      category: ((row.category as string) || (row.type as string) || 'content') as BrainOpportunity['category'],
      description: row.description as string,
      structuredObservation: row.structured_observation as BrainOpportunity['structuredObservation'] || {
        observedFact: '',
        externalEvidence: '',
        brainInference: '',
        recommendation: '',
        confidence: 'Medium',
        source: row.source as string || ''
      },
      evaluation: row.evaluation as BrainOpportunity['evaluation'] || {
        impact: (row.potential_impact as 'High' | 'Medium' | 'Low') || 'Medium',
        effort: (row.effort as 'High' | 'Medium' | 'Low') || 'Medium',
        confidence: (row.confidence as 'High' | 'Medium' | 'Low') || 'Medium',
        evidence: [],
        dependencies: [],
        risks: [],
        expectedOutcome: row.recommended_action as string || ''
      },
      source: row.source as BrainOpportunity['source'] || {
        url: '',
        title: '',
        type: 'internal',
        retrievedAt: row.created_at as string
      },
      status: (row.status as BrainOpportunity['status']) || 'detected',
      strategyId: row.strategy_id as string,
      executionPlanId: row.execution_plan_id as string,
      brainReasoning: row.brain_reasoning as string || '',
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  async updateOpportunity(id: string, data: {
    status?: string; strategyId?: string; executionPlanId?: string;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      if (data.status) { sets.push(`status=$${idx++}`); vals.push(data.status) }
      if (data.strategyId) { sets.push(`strategy_id=$${idx++}`); vals.push(data.strategyId) }
      if (data.executionPlanId) { sets.push(`execution_plan_id=$${idx++}`); vals.push(data.executionPlanId) }
      vals.push(id)
      await pool.query(`UPDATE brain_opportunities SET ${sets.join(',')} WHERE id=$${idx}`, vals)
      return true
    } catch { return false }
  }

  // ───── Phase 4: brain_strategies (enhanced) ─────

  async createStrategyPhase4(data: {
    opportunityId: string; title: string; description: string; businessGoal: string; reason: string;
    evidence: any; targetAudience?: string; searchIntent?: string; proposedAction: string;
    requiredCapabilities: string[]; expectedResult: string; risks: string[]; dependencies: string[];
    approvalRequired?: boolean; status?: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_strategies (opportunity_id, title, description, business_goal, reason, evidence, target_audience, search_intent, proposed_action, required_capabilities, expected_result, risks, dependencies, approval_required, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [data.opportunityId, data.title, data.description, data.businessGoal, data.reason, JSON.stringify(data.evidence), data.targetAudience || null, data.searchIntent || null, data.proposedAction, JSON.stringify(data.requiredCapabilities), data.expectedResult, JSON.stringify(data.risks), JSON.stringify(data.dependencies), data.approvalRequired !== false, data.status || 'proposed']
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createStrategyPhase4:', e)
      return null
    }
  }

  async getStrategyById(id: string): Promise<BrainStrategy | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_strategies WHERE id=$1`, [id])
      const row = result.rows[0]
      if (!row) return null
      return this.mapStrategyRow(row)
    } catch { return null }
  }

  private mapStrategyRow(row: Record<string, unknown>): BrainStrategy {
    return {
      id: row.id as string,
      opportunityId: row.opportunity_id as string,
      title: row.title as string,
      description: row.description as string,
      businessGoal: row.business_goal as string,
      reason: row.reason as string,
      evidence: row.evidence as any,
      targetAudience: row.target_audience as string,
      searchIntent: row.search_intent as string,
      proposedAction: row.proposed_action as string,
      requiredCapabilities: (row.required_capabilities as string[]) || [],
      expectedResult: row.expected_result as string,
      risks: (row.risks as string[]) || [],
      dependencies: (row.dependencies as string[]) || [],
      approvalRequired: row.approval_required as boolean ?? true,
      status: (row.status as BrainStrategy['status']) || 'proposed',
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  async updateStrategy(id: string, data: {
    status?: string; approvalRequired?: boolean;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      if (data.status) { sets.push(`status=$${idx++}`); vals.push(data.status) }
      if (data.approvalRequired !== undefined) { sets.push(`approval_required=$${idx++}`); vals.push(data.approvalRequired) }
      vals.push(id)
      await pool.query(`UPDATE brain_strategies SET ${sets.join(',')} WHERE id=$${idx}`, vals)
      return true
    } catch { return false }
  }

  // ───── Phase 5.3: Strategy Engine V2 ─────

  async createStrategyV2(data: {
    title: string; type: string; objective: string; status: string;
    description: string; rationale: string; evidence: any; evidenceRefs: any[];
    assumptions: any[]; unknowns: any[]; unavailableData: any[];
    risks: string[]; constraints: any[]; expectedObservations: any[];
    successConditions: any[]; failureConditions: any[];
    requiredPermissions: string[]; opportunityIds: string[];
    decisionIds: string[]; researchIds: string[]; learningIds: string[];
    parentStrategyId?: string | null; version: number;
    evidenceStrength: string; outcomeStatus: string;
    freshness: any; conflictFlags: any[]; provenance?: string;
    confidence?: number; approvalRequired?: boolean;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_strategies (
          title, strategy_type, objective, status, description, reason, evidence, evidence_refs,
          assumptions, unknowns, unavailable_data, risks, constraints, expected_observations,
          success_conditions, failure_conditions, opportunity_ids,
          decision_ids, research_ids, learning_ids, parent_strategy_id, version,
          evidence_strength, outcome_status, freshness, conflict_flags, provenance, confidence
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
         RETURNING id`,
        [
          data.title, data.type, data.objective, data.status, data.description, data.rationale,
          JSON.stringify(data.evidence), JSON.stringify(data.evidenceRefs),
          JSON.stringify(data.assumptions), JSON.stringify(data.unknowns), JSON.stringify(data.unavailableData),
          JSON.stringify(data.risks), JSON.stringify(data.constraints), JSON.stringify(data.expectedObservations),
          JSON.stringify(data.successConditions), JSON.stringify(data.failureConditions),
          JSON.stringify(data.opportunityIds),
          JSON.stringify(data.decisionIds), JSON.stringify(data.researchIds), JSON.stringify(data.learningIds),
          data.parentStrategyId || null, data.version, data.evidenceStrength, data.outcomeStatus,
          JSON.stringify(data.freshness), JSON.stringify(data.conflictFlags), data.provenance || 'REAL',
          data.confidence || null
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createStrategyV2:', e)
      return null
    }
  }

  async listStrategiesV2(filters?: {
    status?: string; type?: string; evidenceStrength?: string;
    provenance?: string; limit?: number;
  }): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM brain_strategies WHERE 1=1'
      const vals: unknown[] = []
      let idx = 1
      if (filters?.status) { query += ` AND status=$${idx++}`; vals.push(filters.status) }
      if (filters?.type) { query += ` AND type=$${idx++}`; vals.push(filters.type) }
      if (filters?.evidenceStrength) { query += ` AND evidence_strength=$${idx++}`; vals.push(filters.evidenceStrength) }
      if (filters?.provenance) { query += ` AND provenance=$${idx++}`; vals.push(filters.provenance) }
      query += ' ORDER BY created_at DESC'
      if (filters?.limit) { query += ` LIMIT $${idx++}`; vals.push(filters.limit) }
      const result = await pool.query(query, vals)
      return result.rows
    } catch { return [] }
  }

  // ───── Phase 4: brain_execution_plans (enhanced) ─────

  async createExecutionPlanPhase4(data: {
    opportunityId: string; strategyId: string; objective: string;
    actions: any[]; requiredPermissions: string[]; evidence: any[];
    expectedOutcome: string; rollbackPlan: string; verificationPlan: string;
    correlationId: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_execution_plans (opportunity_id, strategy_id, objective, actions, required_permissions, evidence, expected_outcome, rollback_plan, verification_plan, correlation_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'planned') RETURNING id`,
        [data.opportunityId, data.strategyId, data.objective, JSON.stringify(data.actions), JSON.stringify(data.requiredPermissions), JSON.stringify(data.evidence), data.expectedOutcome, data.rollbackPlan, data.verificationPlan, data.correlationId]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createExecutionPlanPhase4:', e)
      return null
    }
  }

  async getExecutionPlanById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async getExecutionPlanByCorrelationId(correlationId: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans WHERE correlation_id=$1`, [correlationId])
      return result.rows[0] || null
    } catch { return null }
  }

  async updateExecutionPlan(id: string, data: {
    status?: string; startedAt?: string; completedAt?: string;
    automationJobId?: string;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      if (data.status) { sets.push(`status=$${idx++}`); vals.push(data.status) }
      if (data.startedAt) { sets.push(`started_at=$${idx++}`); vals.push(data.startedAt) }
      if (data.completedAt) { sets.push(`completed_at=$${idx++}`); vals.push(data.completedAt) }
      if (data.automationJobId) { sets.push(`automation_job_id=$${idx++}`); vals.push(data.automationJobId) }
      vals.push(id)
      await pool.query(`UPDATE brain_execution_plans SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch { return false }
  }

  // ───── Phase 4: brain_approvals ─────

  async createApproval(data: {
    taskId: string; strategyId: string; executionPlanId: string;
    proposedAction: any; requestedPermission: string; evidence: any;
    requestedBy: 'brain' | 'user';
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_approvals (task_id, strategy_id, execution_plan_id, proposed_action, requested_permission, evidence, requested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [data.taskId, data.strategyId, data.executionPlanId, JSON.stringify(data.proposedAction), data.requestedPermission, JSON.stringify(data.evidence), data.requestedBy]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createApproval:', e)
      return null
    }
  }

  async getApprovalById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_approvals WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async updateApproval(id: string, data: {
    decision: 'approved' | 'rejected'; decidedBy: string; reason?: string;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      await pool.query(
        `UPDATE brain_approvals SET decision=$1, decided_by=$2, decided_at=NOW(), reason=$3, updated_at=NOW() WHERE id=$4`,
        [data.decision, data.decidedBy, data.reason || null, id]
      )
      return true
    } catch { return false }
  }

  async listApprovalsByTask(taskId: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_approvals WHERE task_id=$1 ORDER BY created_at DESC`, [taskId])
      return result.rows
    } catch { return [] }
  }

  // ───── Phase 4: brain_learnings ─────

  async createLearning(data: {
    correlationId: string; taskId?: string; strategyId?: string; executionPlanId?: string;
    expected: string; actual: string; success: boolean; evidence: any;
    failureReason?: string; lesson: string; reusable: boolean; source: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_learnings (correlation_id, task_id, strategy_id, execution_plan_id, expected, actual, success, evidence, failure_reason, lesson, reusable, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [data.correlationId, data.taskId || null, data.strategyId || null, data.executionPlanId || null, data.expected, data.actual, data.success, JSON.stringify(data.evidence), data.failureReason || null, data.lesson, data.reusable, data.source]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createLearning:', e)
      return null
    }
  }

  async listLearningsByCorrelationId(correlationId: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_learnings WHERE correlation_id=$1 ORDER BY created_at DESC`, [correlationId])
      return result.rows
    } catch { return [] }
  }

  async listReusableLearnings(limit = 50): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_learnings WHERE reusable=true ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  // ───── Phase 4: brain_product_discoveries ─────

  async createProductDiscovery(data: {
    opportunityId: string; existingProducts: any[]; partnerAvailability: any[];
    alternativeNetworks?: string[]; manualFallbackNeeded: boolean; evaluation: any;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_product_discoveries (opportunity_id, existing_products, partner_availability, alternative_networks, manual_fallback_needed, evaluation)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [data.opportunityId, JSON.stringify(data.existingProducts), JSON.stringify(data.partnerAvailability), JSON.stringify(data.alternativeNetworks || []), data.manualFallbackNeeded, JSON.stringify(data.evaluation)]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createProductDiscovery:', e)
      return null
    }
  }

  async getProductDiscoveryByOpportunityId(opportunityId: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_product_discoveries WHERE opportunity_id=$1 ORDER BY created_at DESC LIMIT 1`, [opportunityId])
      return result.rows[0] || null
    } catch { return null }
  }

  // ───── Phase 4: brain_content_strategies ─────

  async createContentStrategy(data: {
    opportunityId: string; format: string; reasoning: string; evidence: string[];
    searchIntent: string; audience: string; trendAlignment: string;
    competitionLevel: string; productFit: string; freshness: string; evidenceAvailability: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_content_strategies (opportunity_id, format, reasoning, evidence, search_intent, audience, trend_alignment, competition_level, product_fit, freshness, evidence_availability)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [data.opportunityId, data.format, data.reasoning, JSON.stringify(data.evidence), data.searchIntent, data.audience, data.trendAlignment, data.competitionLevel, data.productFit, data.freshness, data.evidenceAvailability]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createContentStrategy:', e)
      return null
    }
  }

  async getContentStrategyByOpportunityId(opportunityId: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_content_strategies WHERE opportunity_id=$1 ORDER BY created_at DESC LIMIT 1`, [opportunityId])
      return result.rows[0] || null
    } catch { return null }
  }

  // ───── Phase 4: brain_cost_decisions ─────

  async createCostDecision(data: {
    operation: string; canUseMemory: boolean; canUseDatabase: boolean;
    canUseCachedResearch: boolean; needsExternalResearch: boolean; needsLLM: boolean;
    selectedProvider?: string; selectedModel?: string; estimatedCost: number; reason: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_cost_decisions (operation, can_use_memory, can_use_database, can_use_cached_research, needs_external_research, needs_llm, selected_provider, selected_model, estimated_cost, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [data.operation, data.canUseMemory, data.canUseDatabase, data.canUseCachedResearch, data.needsExternalResearch, data.needsLLM, data.selectedProvider || null, data.selectedModel || null, data.estimatedCost, data.reason]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createCostDecision:', e)
      return null
    }
  }

  async listCostDecisions(limit = 50): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_cost_decisions ORDER BY created_at DESC LIMIT $1`, [limit])
      return result.rows
    } catch { return [] }
  }

  // ───── Phase 4.2: REAL RESEARCH RUNS + SOURCE RECORDS ─────

  async createResearchRun(data: {
    correlationId: string
    query: string
    provider: string
    providersUsed?: string[]
    researchConfidence?: string
    fallbackTriggered?: boolean
    fallbackReason?: string | null
    missingInformation?: string[]
    duplicatesRemoved?: number
    resultCount: number
    totalLatencyMs?: number
    status?: string
    error?: string | null
    provenance?: string
  }): Promise<{ id: string; created_at: string } | null> {
    try {
      const result = await this.withConnectionRetry((pool) =>
        pool.query(
          `INSERT INTO brain_research_runs
           (correlation_id, query, provider, providers_used, research_confidence, fallback_triggered,
            fallback_reason, missing_information, duplicates_removed, result_count, total_latency_ms, status, error, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, created_at`,
          [
            data.correlationId,
            data.query,
            data.provider,
            JSON.stringify(data.providersUsed || []),
            data.researchConfidence || null,
            data.fallbackTriggered ?? false,
            data.fallbackReason || null,
            JSON.stringify(data.missingInformation || []),
            data.duplicatesRemoved ?? 0,
            data.resultCount,
            data.totalLatencyMs ?? 0,
            data.status || 'completed',
            data.error || null,
            data.provenance || 'REAL',
          ]
        )
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createResearchRun:', e)
      return null
    }
  }

  async getResearchRun(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_research_runs WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async createSource(data: {
    sourceId: string
    researchId?: string | null
    correlationId: string
    query: string
    provider: string
    title: string
    url: string
    domain?: string | null
    snippet?: string | null
    content?: string | null
    sourceType?: string | null
    resultType?: string | null
    relevanceScore?: number | null
    authoritySignal?: number | null
    rank?: number | null
    retrievedAt: string
    provenance?: string
  }): Promise<{ id: string; source_id: string } | null> {
    try {
      const result = await this.withConnectionRetry((pool) =>
        pool.query(
          `INSERT INTO brain_sources
           (source_id, research_id, correlation_id, query, provider, title, url, domain, snippet, content,
            source_type, result_type, relevance_score, authority_signal, rank, retrieved_at, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (research_id, source_id) DO UPDATE SET
           retrieved_at = EXCLUDED.retrieved_at,
           title = EXCLUDED.title,
           snippet = EXCLUDED.snippet,
           relevance_score = EXCLUDED.relevance_score,
           authority_signal = EXCLUDED.authority_signal,
           rank = EXCLUDED.rank
         RETURNING id, source_id`,
          [
            data.sourceId,
            data.researchId || null,
            data.correlationId,
            data.query,
            data.provider,
            data.title,
            data.url,
            data.domain || null,
            data.snippet || null,
            data.content || null,
            data.sourceType || null,
            data.resultType || null,
            data.relevanceScore ?? null,
            data.authoritySignal ?? null,
            data.rank ?? null,
            data.retrievedAt,
            data.provenance || 'REAL',
          ]
        )
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createSource:', e)
      return null
    }
  }

  async getSourcesByResearchId(researchId: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT * FROM brain_sources WHERE research_id=$1 ORDER BY rank ASC NULLS LAST, created_at ASC`,
        [researchId]
      )
      return result.rows
    } catch { return [] }
  }

  async getSourceBySourceId(sourceId: string, researchId?: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = researchId
        ? await pool.query(
            `SELECT * FROM brain_sources WHERE source_id=$1 AND research_id=$2 ORDER BY created_at DESC LIMIT 1`,
            [sourceId, researchId]
          )
        : await pool.query(
            `SELECT * FROM brain_sources WHERE source_id=$1 ORDER BY created_at DESC LIMIT 1`,
            [sourceId]
          )
      return result.rows[0] || null
    } catch { return null }
  }

  // ───── Phase 4.2: TRACEABLE OPPORTUNITY ─────

  async createTraceableOpportunity(data: {
    title: string
    type: string
    category: string
    description: string
    evidence: unknown
    source: unknown
    confidence: string
    potentialImpact: string
    effort: string
    risk: string
    recommendedAction: string
    reasoning: string
    structuredObservation: unknown
    evaluation: unknown
    evidenceClassification: unknown
    assumptions?: unknown
    researchId?: string | null
    sourceIds: string[]
    correlationId: string
    status?: string
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_opportunities
           (title, type, category, description, evidence, source, confidence, potential_impact, effort, risk,
            recommended_action, brain_reasoning, structured_observation, evaluation, evidence_classification,
            assumptions, research_id, source_ids, correlation_id, status, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         RETURNING id`,
        [
          data.title,
          data.type,
          data.category,
          data.description,
          JSON.stringify(data.evidence),
          JSON.stringify(data.source),
          data.confidence,
          data.potentialImpact,
          data.effort,
          data.risk,
          data.recommendedAction,
          data.reasoning,
          JSON.stringify(data.structuredObservation),
          JSON.stringify(data.evaluation),
          JSON.stringify(data.evidenceClassification),
          JSON.stringify(data.assumptions || []),
          data.researchId || null,
          JSON.stringify(data.sourceIds),
          data.correlationId,
          data.status || 'detected',
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableOpportunity:', e)
      return null
    }
  }

  async getTraceableOpportunity(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_opportunities WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  // ───── Phase 4.2: TRACEABLE STRATEGY ─────

  async createTraceableStrategy(data: {
    opportunityId: string
    title: string
    description: string
    businessGoal: string
    reason: string
    evidence: unknown
    risks: string[]
    dependencies: string[]
    contentApproach: string
    executionRequirements: unknown
    proposedAction: string
    expectedResult: string
    requiredCapabilities: string[]
    targetAudience?: string | null
    searchIntent?: string | null
    sourceIds: string[]
    correlationId: string
    approvalRequired?: boolean
    status?: string
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_strategies
           (opportunity_id, title, description, business_goal, reason, evidence, risks, dependencies,
            content_approach, execution_requirements, proposed_action, expected_result, required_capabilities,
            target_audience, search_intent, source_ids, correlation_id, approval_required, status, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING id`,
        [
          data.opportunityId,
          data.title,
          data.description,
          data.businessGoal,
          data.reason,
          JSON.stringify(data.evidence),
          JSON.stringify(data.risks),
          JSON.stringify(data.dependencies),
          data.contentApproach,
          JSON.stringify(data.executionRequirements),
          data.proposedAction,
          data.expectedResult,
          JSON.stringify(data.requiredCapabilities),
          data.targetAudience || null,
          data.searchIntent || null,
          JSON.stringify(data.sourceIds),
          data.correlationId,
          data.approvalRequired !== false,
          data.status || 'proposed',
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableStrategy:', e)
      return null
    }
  }

  async getTraceableStrategy(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_strategies WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  // ───── Phase 4.2: TRACEABLE EXECUTION PLAN ─────

  async createTraceableExecutionPlan(data: {
    opportunityId: string
    strategyId: string
    objective: string
    actions: unknown
    requiredPermissions: string[]
    approvalRequired: boolean
    executionType: string
    target?: string | null
    targetAutomation: string
    idempotencyKey: string
    evidence?: unknown
    expectedOutcome?: string | null
    rollbackPlan?: string
    verificationPlan?: string
    correlationId: string
    status?: string
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_execution_plans
           (opportunity_id, strategy_id, objective, actions, required_permissions, approval_required,
            execution_type, target, target_automation, idempotency_key, evidence, expected_outcome, rollback_plan, verification_plan,
            correlation_id, status, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id`,
        [
          data.opportunityId,
          data.strategyId,
          data.objective,
          JSON.stringify(data.actions),
          JSON.stringify(data.requiredPermissions),
          data.approvalRequired,
          data.executionType,
          data.target || null,
          data.targetAutomation,
          data.idempotencyKey,
          JSON.stringify(data.evidence || []),
          data.expectedOutcome || null,
          data.rollbackPlan || null,
          data.verificationPlan || null,
          data.correlationId,
          data.status || 'planned',
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableExecutionPlan:', e)
      return null
    }
  }

  async getTraceableExecutionPlan(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async findExecutionPlanByIdempotencyKey(key: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_execution_plans WHERE idempotency_key=$1`, [key])
      return result.rows[0] || null
    } catch { return null }
  }

  /** All plan revisions sharing an idempotency key prefix, oldest first. */
  async listExecutionPlansByIdempotencyPrefix(prefix: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT * FROM brain_execution_plans WHERE idempotency_key LIKE $1 ORDER BY created_at ASC`,
        [`${prefix}%`]
      )
      return result.rows
    } catch { return [] }
  }

  async setExecutionPlanState(
    id: string,
    status: string,
    extra?: { automationJobId?: string; brainTaskId?: string; startedAt?: string; completedAt?: string }
  ): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['status=$1', 'updated_at=NOW()']
      const vals: unknown[] = [status]
      let idx = 2
      if (extra?.automationJobId) { sets.push(`automation_job_id=$${idx++}`); vals.push(extra.automationJobId) }
      if (extra?.brainTaskId) { sets.push(`brain_task_id=$${idx++}`); vals.push(extra.brainTaskId) }
      if (extra?.startedAt) { sets.push(`started_at=$${idx++}`); vals.push(extra.startedAt) }
      if (extra?.completedAt) { sets.push(`completed_at=$${idx++}`); vals.push(extra.completedAt) }
      vals.push(id)
      await pool.query(`UPDATE brain_execution_plans SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.setExecutionPlanState:', e)
      return false
    }
  }

  // ───── Phase 4.2: APPROVALS (server-side verifiable) ─────

  async createTraceableApproval(data: {
    taskId: string
    strategyId: string
    executionPlanId: string
    opportunityId?: string | null
    requiredPermission: string
    targetAutomation?: string | null
    proposedAction: unknown
    evidence: unknown
    requestedBy: string
    correlationId: string
    provenance?: string
  }): Promise<{ id: string; created_at: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_approvals
           (task_id, strategy_id, execution_plan_id, proposed_action, requested_permission, required_permission,
            target_automation, evidence, requested_by, status, decision, correlation_id, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',NULL,$10,$11)
         RETURNING id, created_at`,
        [
          data.taskId,
          data.strategyId,
          data.executionPlanId,
          JSON.stringify(data.proposedAction),
          data.requiredPermission,
          data.requiredPermission,
          data.targetAutomation || null,
          JSON.stringify(data.evidence),
          data.requestedBy,
          data.correlationId,
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableApproval:', e)
      return null
    }
  }

  async getTraceableApproval(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_approvals WHERE id=$1`, [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async listApprovals(filters?: {
    status?: string
    taskId?: string
    strategyId?: string
    executionPlanId?: string
    correlationId?: string
    limit?: number
  }): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const where: string[] = []
      const vals: unknown[] = []
      const push = (col: string, val: unknown) => { vals.push(val); where.push(`${col}=$${vals.length}`) }
      if (filters?.status) push('status', filters.status)
      if (filters?.taskId) push('task_id', filters.taskId)
      if (filters?.strategyId) push('strategy_id', filters.strategyId)
      if (filters?.executionPlanId) push('execution_plan_id', filters.executionPlanId)
      if (filters?.correlationId) push('correlation_id', filters.correlationId)
      vals.push(filters?.limit || 100)
      const sql = `SELECT * FROM brain_approvals ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT $${vals.length}`
      const result = await pool.query(sql, vals)
      return result.rows
    } catch (e) {
      console.error('BrainRepository.listApprovals:', e)
      return []
    }
  }

  /** Decide an approval. Returns false when the approval is not pending (no double-decide). */
  async decideApproval(id: string, decision: 'approved' | 'rejected', decidedBy: string, reason: string, decidedByUserId?: string | null): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `UPDATE brain_approvals
            SET status=$1, decision=$2, decided_by=$3, decided_at=NOW(), updated_at=NOW(),
                reason=$4, decided_by_user_id=$5
            WHERE id=$6 AND status='pending'`,
        [decision, decision, decidedBy, reason, decidedByUserId || null, id]
      )
      return (result.rowCount || 0) === 1
    } catch (e) {
      console.error('BrainRepository.decideApproval:', e)
      return false
    }
  }

  /** Atomically consume an approval for a task. Fails if already consumed. */
  async consumeApproval(id: string, taskId: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `UPDATE brain_approvals
            SET consumed_at=NOW(), consumed_by_task=$2, updated_at=NOW()
          WHERE id=$1 AND status='approved' AND consumed_at IS NULL AND task_id=$2`,
        [id, taskId]
      )
      return (result.rowCount || 0) === 1
    } catch (e) {
      console.error('BrainRepository.consumeApproval:', e)
      return false
    }
  }

  async releaseApprovalConsumption(id: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `UPDATE brain_approvals SET consumed_at=NULL, consumed_by_task=NULL, updated_at=NOW() WHERE id=$1`,
        [id]
      )
      return (result.rowCount || 0) === 1
    } catch (e) {
      console.error('BrainRepository.releaseApprovalConsumption:', e)
      return false
    }
  }

  // ───── Phase 4.2: TRACEABLE TASK + CLAIM LEASE ─────

  async createTraceableTask(data: {
    type: string
    title: string
    goal: string
    priority?: string
    strategyId?: string | null
    opportunityId?: string | null
    executionPlanId?: string | null
    approvalId?: string | null
    correlationId: string
    idempotencyKey?: string | null
    inputs?: unknown
    context?: unknown
    provenance?: string
    initialStatus?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_tasks
           (type, title, goal, priority, strategy_id, opportunity_id, execution_plan_id, approval_id,
            correlation_id, idempotency_key, inputs, context, status, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          data.type,
          data.title,
          data.goal,
          data.priority || 'normal',
          data.strategyId || null,
          data.opportunityId || null,
          data.executionPlanId || null,
          data.approvalId || null,
          data.correlationId,
          data.idempotencyKey || null,
          JSON.stringify(data.inputs || {}),
          JSON.stringify(data.context || {}),
          data.initialStatus || 'awaiting_approval',
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableTask:', e)
      return null
    }
  }

  async findTaskByIdempotencyKey(key: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(`SELECT * FROM brain_tasks WHERE idempotency_key=$1`, [key])
      return result.rows[0] || null
    } catch { return null }
  }

  /**
   * Claim a task for execution.
   * Returns the claim token on success, or null when the task is not claimable:
   * missing, not in an allowed state, or already claimed by a live lease.
   */
  async claimTask(id: string, claimToken: string, claimedBy: string, leaseSeconds = 900): Promise<string | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `UPDATE brain_tasks
            SET status='running',
                claim_token=$2,
                claimed_by=$3,
                claimed_at=NOW(),
                started_at=COALESCE(started_at, NOW()),
                updated_at=NOW()
          WHERE id=$1
            AND type='create_automation_job'
            AND status IN ('queued','awaiting_approval','approved')
            AND (claim_token IS NULL OR claimed_at IS NULL OR claimed_at < NOW() - ($4 || ' seconds')::interval)
          RETURNING id`,
        [id, claimToken, claimedBy, String(leaseSeconds)]
      )
      return result.rows[0]?.id || null
    } catch (e) {
      console.error('BrainRepository.claimTask:', e)
      return null
    }
  }

  /** Update a task only while the caller still holds the claim. */
  async updateClaimedTask(id: string, claimToken: string, data: {
    status?: string
    evidence?: unknown
    recommendation?: string
    approvalState?: string
    completedAt?: boolean
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      if (data.status) { sets.push(`status=$${idx++}`); vals.push(data.status) }
      if (data.evidence !== undefined) { sets.push(`evidence=$${idx++}`); vals.push(JSON.stringify(data.evidence)) }
      if (data.recommendation !== undefined) { sets.push(`recommendation=$${idx++}`); vals.push(data.recommendation) }
      if (data.approvalState) { sets.push(`approval_state=$${idx++}`); vals.push(data.approvalState) }
      if (data.completedAt) { sets.push('completed_at=NOW()') }
      vals.push(id, claimToken)
      const result = await pool.query(
        `UPDATE brain_tasks SET ${sets.join(', ')} WHERE id=$${idx} AND claim_token=$${idx + 1}`,
        vals
      )
      return (result.rowCount || 0) === 1
    } catch (e) {
      console.error('BrainRepository.updateClaimedTask:', e)
      return false
    }
  }

  async releaseTaskClaim(id: string, claimToken: string): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `UPDATE brain_tasks SET claim_token=NULL, claimed_at=NULL, claimed_by=NULL, updated_at=NOW()
          WHERE id=$1 AND claim_token=$2`,
        [id, claimToken]
      )
      return (result.rowCount || 0) === 1
    } catch (e) {
      console.error('BrainRepository.releaseTaskClaim:', e)
      return false
    }
  }

  // ───── Phase 4.2: QUALITY / VERIFICATION / LEARNING ─────

  async createTraceableQualityResult(data: {
    executionPlanId?: string | null
    articleId?: string | null
    brainTaskId?: string | null
    automationJobId?: string | null
    strategyId?: string | null
    opportunityId?: string | null
    correlationId: string
    targetId?: string | null
    targetType?: string
    overallStatus: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL'
    score: number
    checks: unknown
    warnings: unknown
    failures: unknown
    failureReason?: string | null
    recommendedFix?: string | null
    published?: boolean
    publicationBlockedReason?: string | null
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_quality_results
           (execution_plan_id, article_id, brain_task_id, automation_job_id, strategy_id, opportunity_id,
            correlation_id, target_id, target_type, overall_status, score, checks, warnings, failures,
            failure_reason, recommended_fix, published, publication_blocked_reason, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING id`,
        [
          data.executionPlanId || null,
          data.articleId || null,
          data.brainTaskId || null,
          data.automationJobId || null,
          data.strategyId || null,
          data.opportunityId || null,
          data.correlationId,
          data.targetId || data.articleId || null,
          data.targetType || 'article',
          data.overallStatus,
          data.score,
          JSON.stringify(data.checks || []),
          JSON.stringify(data.warnings || []),
          JSON.stringify(data.failures || []),
          data.failureReason || null,
          data.recommendedFix || null,
          data.published ?? false,
          data.publicationBlockedReason || null,
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableQualityResult:', e)
      return null
    }
  }

  async getLatestQualityResultForArticle(articleId: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT * FROM brain_quality_results WHERE article_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [articleId]
      )
      return result.rows[0] || null
    } catch { return null }
  }

  async getArticle(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT id, title, slug, status, published_at, affiliate_url, brain_task_id, automation_job_id,
                strategy_id, opportunity_id, provenance, seo, excerpt, reading_time, content, cover_image_url
           FROM articles WHERE id=$1`,
        [id]
      )
      return result.rows[0] || null
    } catch { return null }
  }

  async createTraceableVerification(data: {
    targetId: string
    targetType?: string
    articleId?: string | null
    correlationId: string
    beforeState?: unknown
    afterState?: unknown
    status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_VERIFIABLE'
    expectedConditions: unknown
    availableObservations: unknown
    limitations: unknown
    summary: string
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_verifications
           (target_id, target_type, article_id, correlation_id, before_state, after_state, status,
            expected_conditions, available_observations, limitations, summary, verified_at, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12)
         RETURNING id`,
        [
          data.targetId,
          data.targetType || 'article',
          data.articleId || null,
          data.correlationId,
          JSON.stringify(data.beforeState || {}),
          JSON.stringify(data.afterState || {}),
          data.status,
          JSON.stringify(data.expectedConditions || []),
          JSON.stringify(data.availableObservations || []),
          JSON.stringify(data.limitations || []),
          data.summary,
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableVerification:', e)
      return null
    }
  }

  async createTraceableLearning(data: {
    correlationId: string
    sourceEvent: string
    taskId?: string | null
    strategyId?: string | null
    executionPlanId?: string | null
    opportunityId?: string | null
    articleId?: string | null
    expected: string
    actual: string
    success: boolean
    evidence: unknown
    failureReason?: string | null
    lesson: string
    confidence: number
    reusability: 'low' | 'medium' | 'high'
    reusable: boolean
    source: string
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_learnings
           (correlation_id, source_event, task_id, strategy_id, execution_plan_id, opportunity_id, article_id,
            expected, actual, success, evidence, failure_reason, lesson, confidence, reusability, reusable, source, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        [
          data.correlationId,
          data.sourceEvent,
          data.taskId || null,
          data.strategyId || null,
          data.executionPlanId || null,
          data.opportunityId || null,
          data.articleId || null,
          data.expected,
          data.actual,
          data.success,
          JSON.stringify(data.evidence),
          data.failureReason || null,
          data.lesson,
          data.confidence,
          data.reusability,
          data.reusable,
          data.source,
          data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createTraceableLearning:', e)
      return null
    }
  }

  // ───── Phase 4.2: PROVENANCE-AWARE DASHBOARD COUNTS ─────

  async countByProvenance(
    table: 'brain_opportunities' | 'brain_strategies' | 'brain_tasks' | 'articles' | 'brain_quality_results' | 'brain_learnings' | 'brain_approvals' | 'brain_execution_plans'
  ): Promise<Record<string, number>> {
    const empty = { REAL: 0, TEST: 0, FIXTURE: 0, UNKNOWN: 0, TOTAL: 0 }
    try {
      const pool = await this.getDb()
      const result = await pool.query<{ provenance: string | null; c: string }>(
        `SELECT COALESCE(provenance,'UNKNOWN') AS provenance, COUNT(*)::text AS c
           FROM ${table}
          GROUP BY COALESCE(provenance,'UNKNOWN')`
      )
      const out: Record<string, number> = { ...empty }
      for (const row of result.rows) {
        const key = (row.provenance || 'UNKNOWN').toUpperCase()
        const val = parseInt(row.c, 10)
        if (key in out) out[key] = val
        out.TOTAL += val
      }
      return out
    } catch (e) {
      console.error(`BrainRepository.countByProvenance(${table}):`, e)
      return { ...empty }
    }
  }

  // ───── Phase 5.5: Strategy Evolution ─────

  async createStrategyEvolution(data: {
    strategyId: string; sourceStrategyVersion: number; proposedVersion: number
    evolutionType: string; triggerType: string; evidenceRefs: any[]
    opportunityIds: string[]; learningIds: string[]; decisionIds: string[]
    executionIds: string[]; evidenceStrength: string; confidence?: number
    assumptions: any[]; unknowns: any[]; unavailableData: any[]
    risks: any[]; proposedChanges: any; expectedObservations: any[]
    successConditions: any[]; failureConditions: any[]
    provenance: string; status: string; approvalId?: string | null
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_strategy_evolution (
          strategy_id, source_strategy_version, proposed_version, evolution_type, trigger_type,
          evidence_refs, opportunity_ids, learning_ids, decision_ids, execution_ids,
          evidence_strength, confidence, assumptions, unknowns, unavailable_data, risks,
          proposed_changes, expected_observations, success_conditions, failure_conditions,
          provenance, status, approval_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         RETURNING id`,
        [
          data.strategyId, data.sourceStrategyVersion, data.proposedVersion, data.evolutionType,
          data.triggerType, JSON.stringify(data.evidenceRefs), JSON.stringify(data.opportunityIds),
          JSON.stringify(data.learningIds), JSON.stringify(data.decisionIds), JSON.stringify(data.executionIds),
          data.evidenceStrength, data.confidence || null, JSON.stringify(data.assumptions),
          JSON.stringify(data.unknowns), JSON.stringify(data.unavailableData), JSON.stringify(data.risks),
          JSON.stringify(data.proposedChanges), JSON.stringify(data.expectedObservations),
          JSON.stringify(data.successConditions), JSON.stringify(data.failureConditions),
          data.provenance, data.status, data.approvalId || null,
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createStrategyEvolution:', e)
      return null
    }
  }

  // ───── Phase 5.6: Experiment Engine ─────

  async createExperiment(data: {
    hypothesis: string;
    metric: string;
    baseline: any;
    variant: any;
    population: string;
    startTime: string;
    status: string;
    evidence: any;
    provenance: string;
    result?: any;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_experiments (
          hypothesis, metric, baseline, variant, population, start_time, status, evidence, provenance, result
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          data.hypothesis,
          data.metric,
          JSON.stringify(data.baseline),
          JSON.stringify(data.variant),
          data.population,
          data.startTime,
          data.status,
          JSON.stringify(data.evidence),
          data.provenance,
          data.result ? JSON.stringify(data.result) : null
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createExperiment:', e)
      return null
    }
  }

  async getExperiment(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query('SELECT * FROM brain_experiments WHERE id = $1', [id])
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.getExperiment:', e)
      return null
    }
  }

  async updateExperimentStatus(id: string, status: string, evidence?: any): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['status=$1', 'updated_at=NOW()']
      const vals: unknown[] = [status]
      let idx = 2
      if (evidence !== undefined) {
        sets.push(`evidence=$${idx++}`)
        vals.push(JSON.stringify(evidence))
      }
      vals.push(id)
      await pool.query(`UPDATE brain_experiments SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.updateExperimentStatus:', e)
      return false
    }
  }

  async createExperimentEvent(data: {
    experimentId: string;
    eventType: string;
    variantId: string;
    metadata: any;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_experiment_events (
          experiment_id, event_type, variant_id, metadata
        ) VALUES ($1,$2,$3,$4) RETURNING id`,
        [
          data.experimentId,
          data.eventType,
          data.variantId,
          JSON.stringify(data.metadata)
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createExperimentEvent:', e)
      return null
    }
  }

  async listExperimentEvents(experimentId: string, eventType?: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM brain_experiment_events WHERE experiment_id = $1'
      const vals: unknown[] = [experimentId]
      let idx = 2
      if (eventType) {
        query += ` AND event_type = $${idx++}`
        vals.push(eventType)
      }
      query += ' ORDER BY created_at DESC'
      const result = await pool.query(query, vals)
      return result.rows
    } catch (e) {
      console.error('BrainRepository.listExperimentEvents:', e)
      return []
    }
  }

  async createExperimentResult(data: {
    experimentId: string;
    conclusion: string;
    pValue: number;
    relativeDifference: number;
    sampleAdequacy: string;
    controlSampleSize: number;
    treatmentSampleSize: number;
    controlConversionRate: number;
    treatmentConversionRate: number;
    absoluteDifference: number;
    controlCiLower: number;
    controlCiUpper: number;
    treatmentCiLower: number;
    treatmentCiUpper: number;
    fisherOddsRatio: number;
    significanceLevel: number;
    minRequiredSample: number;
    uplift: number;
    significance: number;
    conclusive: boolean;
    recommendation: string;
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_experiment_results (
          experiment_id, conclusion, p_value, relative_difference, sample_adequacy,
          control_sample_size, treatment_sample_size, control_conversion_rate, treatment_conversion_rate,
          absolute_difference, control_ci_lower, control_ci_upper, treatment_ci_lower, treatment_ci_upper,
          fisher_odds_ratio, significance_level, min_required_sample, uplift, significance, conclusive, recommendation
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        RETURNING id`,
        [
          data.experimentId,
          data.conclusion,
          data.pValue,
          data.relativeDifference,
          data.sampleAdequacy,
          data.controlSampleSize,
          data.treatmentSampleSize,
          data.controlConversionRate,
          data.treatmentConversionRate,
          data.absoluteDifference,
          data.controlCiLower,
          data.controlCiUpper,
          data.treatmentCiLower,
          data.treatmentCiUpper,
          data.fisherOddsRatio,
          data.significanceLevel,
          data.minRequiredSample,
          data.uplift,
          data.significance,
          data.conclusive,
          data.recommendation
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createExperimentResult:', e)
      return null
    }
  }

  async getExperimentResult(experimentId: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query('SELECT * FROM brain_experiment_results WHERE experiment_id = $1', [experimentId])
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.getExperimentResult:', e)
      return null
    }
  }

  async updateExperimentResult(id: string, data: {
    conclusion?: string;
    pValue?: number;
    relativeDifference?: number;
    sampleAdequacy?: string;
    controlSampleSize?: number;
    treatmentSampleSize?: number;
    controlConversionRate?: number;
    treatmentConversionRate?: number;
    absoluteDifference?: number;
    controlCiLower?: number;
    controlCiUpper?: number;
    treatmentCiLower?: number;
    treatmentCiUpper?: number;
    fisherOddsRatio?: number;
    significanceLevel?: number;
    minRequiredSample?: number;
    uplift?: number;
    significance?: number;
    conclusive?: boolean;
    recommendation?: string;
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      if (data.conclusion !== undefined) { sets.push(`conclusion=$${idx++}`); vals.push(data.conclusion) }
      if (data.pValue !== undefined) { sets.push(`p_value=$${idx++}`); vals.push(data.pValue) }
      if (data.relativeDifference !== undefined) { sets.push(`relative_difference=$${idx++}`); vals.push(data.relativeDifference) }
      if (data.sampleAdequacy !== undefined) { sets.push(`sample_adequacy=$${idx++}`); vals.push(data.sampleAdequacy) }
      if (data.controlSampleSize !== undefined) { sets.push(`control_sample_size=$${idx++}`); vals.push(data.controlSampleSize) }
      if (data.treatmentSampleSize !== undefined) { sets.push(`treatment_sample_size=$${idx++}`); vals.push(data.treatmentSampleSize) }
      if (data.controlConversionRate !== undefined) { sets.push(`control_conversion_rate=$${idx++}`); vals.push(data.controlConversionRate) }
      if (data.treatmentConversionRate !== undefined) { sets.push(`treatment_conversion_rate=$${idx++}`); vals.push(data.treatmentConversionRate) }
      if (data.absoluteDifference !== undefined) { sets.push(`absolute_difference=$${idx++}`); vals.push(data.absoluteDifference) }
      if (data.controlCiLower !== undefined) { sets.push(`control_ci_lower=$${idx++}`); vals.push(data.controlCiLower) }
      if (data.controlCiUpper !== undefined) { sets.push(`control_ci_upper=$${idx++}`); vals.push(data.controlCiUpper) }
      if (data.treatmentCiLower !== undefined) { sets.push(`treatment_ci_lower=$${idx++}`); vals.push(data.treatmentCiLower) }
      if (data.treatmentCiUpper !== undefined) { sets.push(`treatment_ci_upper=$${idx++}`); vals.push(data.treatmentCiUpper) }
      if (data.fisherOddsRatio !== undefined) { sets.push(`fisher_odds_ratio=$${idx++}`); vals.push(data.fisherOddsRatio) }
      if (data.significanceLevel !== undefined) { sets.push(`significance_level=$${idx++}`); vals.push(data.significanceLevel) }
      if (data.minRequiredSample !== undefined) { sets.push(`min_required_sample=$${idx++}`); vals.push(data.minRequiredSample) }
      if (data.uplift !== undefined) { sets.push(`uplift=$${idx++}`); vals.push(data.uplift) }
      if (data.significance !== undefined) { sets.push(`significance=$${idx++}`); vals.push(data.significance) }
      if (data.conclusive !== undefined) { sets.push(`conclusive=$${idx++}`); vals.push(data.conclusive) }
      if (data.recommendation !== undefined) { sets.push(`recommendation=$${idx++}`); vals.push(data.recommendation) }
      vals.push(id)
      await pool.query(`UPDATE brain_experiment_results SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.updateExperimentResult:', e)
      return false
    }
  }

  async listStrategyEvolutions(strategyId?: string, status?: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM brain_strategy_evolutions WHERE 1=1'
      const vals: unknown[] = []
      let idx = 1
      if (strategyId) { query += ` AND strategy_id = $${idx++}`; vals.push(strategyId) }
      if (status) { query += ` AND status = $${idx++}`; vals.push(status) }
      query += ' ORDER BY created_at DESC'
      const result = await pool.query(query, vals)
      return result.rows
    } catch { return [] }
  }

  // ───── Phase 5.6: Brain OS Foundation — Initialization & Runs ─────

  /**
   * Fetch the Brain initialization record.
   *
   * IMPORTANT: this does NOT swallow database / infrastructure failures.
   * - A successful query that returns zero rows => `null` (Brain not yet initialized).
   * - A connection error, a missing table, a constraint violation, or any other
   *   database failure is RE-THROWN so callers can react (fail the run, surface
   *   the error, etc.) instead of being told "no initialization exists" when the
   *   database is actually broken.
   */
  async getInitialization(): Promise<Record<string, unknown> | null> {
    const pool = await this.getDb()
    let result: { rows: Record<string, unknown>[] }
    try {
      result = await pool.query('SELECT * FROM brain_initialization LIMIT 1')
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      console.error(
        JSON.stringify({
          component: 'BrainRepository.getInitialization',
          severity: 'DATABASE_FAILURE',
          error: err,
          timestamp: new Date().toISOString(),
        })
      )
      throw new Error(`Brain initialization query failed: ${err}`)
    }
    return result.rows[0] || null
  }

  async createInitialization(data?: Record<string, unknown>): Promise<{ id: string; initialization_id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_initialization (status, data) VALUES ('initializing', $1) RETURNING id, initialization_id`,
        [JSON.stringify(data || {})]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createInitialization:', e)
      return null
    }
  }

  async updateInitialization(id: string, data: {
    status: string
    data?: Record<string, unknown>
    error?: string | null
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['status=$1', 'updated_at=NOW()']
      const vals: unknown[] = [data.status]
      let idx = 2
      if (data.data !== undefined) { sets.push(`data=$${idx++}`); vals.push(JSON.stringify(data.data)) }
      if (data.error !== undefined) { sets.push(`error=$${idx++}`); vals.push(data.error) }
      vals.push(id)
      await pool.query(`UPDATE brain_initialization SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.updateInitialization:', e)
      return false
    }
  }

  async createRun(data: {
    runType: 'wake_up' | 'cycle'
    trigger: string
    correlationId?: string | null
    initializationId?: string | null
  }): Promise<{ id: string; run_id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_runs (run_type, trigger, status, correlation_id, initialization_id, started_at)
         VALUES ($1, $2, 'running', $3, $4, NOW()) RETURNING id, run_id`,
        [data.runType, data.trigger, data.correlationId || null, data.initializationId || null]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createRun:', e)
      return null
    }
  }

  async updateRun(id: string, data: {
    status: string
    observations?: unknown
    actions?: unknown
    results?: unknown
    completedAt?: boolean
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['status=$1']
      const vals: unknown[] = [data.status]
      let idx = 2
      if (data.observations !== undefined) { sets.push(`observations=$${idx++}`); vals.push(JSON.stringify(data.observations)) }
      if (data.actions !== undefined) { sets.push(`actions=$${idx++}`); vals.push(JSON.stringify(data.actions)) }
      if (data.results !== undefined) { sets.push(`results=$${idx++}`); vals.push(JSON.stringify(data.results)) }
      if (data.completedAt) { sets.push('completed_at=NOW()') }
      vals.push(id)
      await pool.query(`UPDATE brain_runs SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.updateRun:', e)
      return false
    }
  }

  async getLatestRun(runType?: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM brain_runs'
      const vals: unknown[] = []
      if (runType) { vals.push(runType); query += ` WHERE run_type=$1` }
      query += ' ORDER BY created_at DESC LIMIT 1'
      const result = await pool.query(query, vals)
      return result.rows[0] || null
    } catch { return null }
  }

  /**
   * Return the in-flight Brain cycle run, if any.
   * Used by the scheduler to prevent duplicate concurrent cycles.
   * The singleton partial index (idx_brain_runs_single_active_cycle)
   * guarantees at most one such row can exist.
   */
  async getRunningCycleRun(): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT id, run_id, trigger, started_at
         FROM brain_runs
         WHERE run_type = 'cycle' AND status IN ('queued', 'running')
         ORDER BY started_at DESC NULLS LAST
         LIMIT 1`
      )
      return result.rows[0] || null
    } catch { return null }
  }

  /**
   * Return the in-flight wake_up run, if any.
   * Used by wakeBrain() to decide whether a stuck 'initializing'
   * record is genuinely owned by a still-running process.
   */
  async getRunningWakeUpRun(): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT id, run_id, trigger, started_at
         FROM brain_runs
         WHERE run_type = 'wake_up' AND status IN ('queued', 'running')
         ORDER BY started_at DESC NULLS LAST
         LIMIT 1`
      )
      return result.rows[0] || null
    } catch { return null }
  }

  async listRuns(limit = 50, runType?: string): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM brain_runs'
      const vals: unknown[] = []
      if (runType) { vals.push(runType); query += ` WHERE run_type=$1` }
      vals.push(limit)
      query += ` ORDER BY created_at DESC LIMIT $${vals.length}`
      const result = await pool.query(query, vals)
      return result.rows
    } catch { return [] }
  }

  async getRunById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query('SELECT * FROM brain_runs WHERE id=$1', [id])
      return result.rows[0] || null
    } catch { return null }
  }

  // ───── Phase 5.6: Partner Registry ─────

  async createPartner(data: {
    name: string
    network?: string | null
    productFit?: string | null
    nicheFit?: string | null
    qualityScore?: number | null
    commissionRate?: number | null
    commissionType?: string | null
    conversionPotential?: string | null
    reputation?: string | null
    countryEligibility?: string[]
    pakistanEligibility: boolean
    pakistanEligibilityNotes?: string | null
    customerTrafficEligibility?: boolean
    customerTrafficNotes?: string | null
    payoutMethods?: string[]
    payoutCurrency?: string | null
    minimumPayout?: number | null
    minimumPayoutCurrency?: string | null
    fees?: string | null
    payoneerSupported?: boolean | null
    payoneerNotes?: string | null
    paypalSupported?: boolean | null
    paypalNotes?: string | null
    bankTransferSupported?: boolean | null
    bankTransferNotes?: string | null
    applicationRequired?: boolean
    applicationDifficulty?: string | null
    applicationUrl?: string | null
    payoutDocsUrl?: string | null
    lastVerified?: string | null
    verificationNotes?: string | null
    confidence?: number | null
    trackingCapability?: string | null
    reliability?: string | null
    status?: string
    provenance?: string
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO partner_registry (
          name, network, product_fit, niche_fit, quality_score, commission_rate, commission_type,
          conversion_potential, reputation, country_eligibility, pakistan_eligibility, pakistan_eligibility_notes,
          customer_traffic_eligibility, customer_traffic_notes, payout_methods, payout_currency,
          minimum_payout, minimum_payout_currency, fees, payoneer_supported, payoneer_notes,
          paypal_supported, paypal_notes, bank_transfer_supported, bank_transfer_notes,
          application_required, application_difficulty, application_url, payout_docs_url,
          last_verified, verification_notes, confidence, tracking_capability, reliability, status, provenance
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
         RETURNING id`,
        [
          data.name, data.network || null, data.productFit || null, data.nicheFit || null,
          data.qualityScore ?? null, data.commissionRate ?? null, data.commissionType || null,
          data.conversionPotential || null, data.reputation || null,
          JSON.stringify(data.countryEligibility || []), data.pakistanEligibility,
          data.pakistanEligibilityNotes || null, data.customerTrafficEligibility ?? false,
          data.customerTrafficNotes || null, JSON.stringify(data.payoutMethods || []),
          data.payoutCurrency || null, data.minimumPayout ?? null, data.minimumPayoutCurrency || null,
          data.fees || null, data.payoneerSupported ?? null, data.payoneerNotes || null,
          data.paypalSupported ?? null, data.paypalNotes || null,
          data.bankTransferSupported ?? null, data.bankTransferNotes || null,
          data.applicationRequired ?? true, data.applicationDifficulty || null,
          data.applicationUrl || null, data.payoutDocsUrl || null,
          data.lastVerified || null, data.verificationNotes || null,
          data.confidence ?? null, data.trackingCapability || null, data.reliability || null,
          data.status || 'unverified', data.provenance || 'REAL',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createPartner:', e)
      return null
    }
  }

  async listPartners(filters?: {
    pakistanEligible?: boolean
    status?: string
    network?: string
    limit?: number
  }): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM partner_registry WHERE 1=1'
      const vals: unknown[] = []
      let idx = 1
      if (filters?.pakistanEligible !== undefined) { query += ` AND pakistan_eligibility=$${idx++}`; vals.push(filters.pakistanEligible) }
      if (filters?.status) { query += ` AND status=$${idx++}`; vals.push(filters.status) }
      if (filters?.network) { query += ` AND network ILIKE $${idx++}`; vals.push(`%${filters.network}%`) }
      query += ` ORDER BY confidence DESC NULLS LAST, last_verified DESC NULLS LAST LIMIT $${idx}`
      vals.push(filters?.limit || 50)
      const result = await pool.query(query, vals)
      return result.rows
    } catch { return [] }
  }

  async getPartner(id: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query('SELECT * FROM partner_registry WHERE id=$1', [id])
      return result.rows[0] || null
    } catch { return null }
  }

  async updatePartner(id: string, data: Record<string, unknown>): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const allowed = [
        'name', 'network', 'product_fit', 'niche_fit', 'quality_score', 'commission_rate',
        'commission_type', 'conversion_potential', 'reputation', 'country_eligibility',
        'pakistan_eligibility', 'pakistan_eligibility_notes', 'customer_traffic_eligibility',
        'customer_traffic_notes', 'payout_methods', 'payout_currency', 'minimum_payout',
        'minimum_payout_currency', 'fees', 'payoneer_supported', 'payoneer_notes',
        'paypal_supported', 'paypal_notes', 'bank_transfer_supported', 'bank_transfer_notes',
        'application_required', 'application_difficulty', 'application_url', 'payout_docs_url',
        'last_verified', 'verification_notes', 'confidence', 'tracking_capability',
        'reliability', 'status', 'provenance'
      ]
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1
      for (const key of allowed) {
        if (data[key] !== undefined) {
          sets.push(`${key}=$${idx++}`)
          vals.push(data[key])
        }
      }
      vals.push(id)
      await pool.query(`UPDATE partner_registry SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.updatePartner:', e)
      return false
    }
  }

  // ───── Phase 5.6: Brain Schedules ─────

  async listSchedules(enabled?: boolean): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      let query = 'SELECT * FROM brain_schedules'
      const vals: unknown[] = []
      if (enabled !== undefined) { vals.push(enabled); query += ` WHERE enabled=$1` }
      query += ' ORDER BY next_run ASC NULLS LAST'
      const result = await pool.query(query, vals)
      return result.rows
    } catch { return [] }
  }

  async getSchedule(key: string): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query('SELECT * FROM brain_schedules WHERE key=$1', [key])
      return result.rows[0] || null
    } catch { return null }
  }

  async updateScheduleRun(id: string, data: {
    status: string
    lastRun?: boolean
    nextRun?: Date | null
  }): Promise<boolean> {
    try {
      const pool = await this.getDb()
      const sets: string[] = ['status=$1', 'updated_at=NOW()']
      const vals: unknown[] = [data.status]
      let idx = 2
      if (data.lastRun) { sets.push('last_run=NOW()') }
      if (data.nextRun !== undefined) { sets.push(`next_run=$${idx++}`); vals.push(data.nextRun) }
      vals.push(id)
      await pool.query(`UPDATE brain_schedules SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('BrainRepository.updateScheduleRun:', e)
      return false
    }
  }

  async createSchedule(data: {
    key: string
    purpose: string
    frequency: string
    handler: string
    enabled?: boolean
    approvalRequired?: boolean
    nextRun?: Date | null
    metadata?: Record<string, unknown>
  }): Promise<{ id: string } | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_schedules (key, purpose, frequency, handler, enabled, approval_required, next_run, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (key) DO UPDATE SET purpose=EXCLUDED.purpose, frequency=EXCLUDED.frequency, handler=EXCLUDED.handler
         RETURNING id`,
        [
          data.key, data.purpose, data.frequency, data.handler,
          data.enabled ?? true, data.approvalRequired ?? false,
          data.nextRun || null, JSON.stringify(data.metadata || {}),
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.createSchedule:', e)
      return null
    }
  }

  async updateScheduleMetadata(key: string, metadata: Record<string, unknown>): Promise<boolean> {
    try {
      const pool = await this.getDb()
      await pool.query(
        `UPDATE brain_schedules SET metadata=$2, updated_at=NOW() WHERE key=$1`,
        [key, JSON.stringify(metadata)]
      )
      return true
    } catch (e) {
      console.error('BrainRepository.updateScheduleMetadata:', e)
      return false
    }
  }

  // ───── Phase 5.6: Strategy Formal Activation ─────

  /**
   * Atomically activate a strategy.
   *
   * - Only 'approved' strategies may be activated (rejected/superseded/archived
   *   can never become active).
   * - The current active strategy (if any) is demoted to 'superseded' — history
   *   is preserved, never deleted.
   * - The singleton unique index (idx_brain_strategies_single_active) guarantees
   *   that concurrent activations cannot produce two active strategies: the
   *   loser of the race hits a unique violation and is rolled back.
   *
   * Returns success=false with a clear error for every failure mode.
   */
  async activateStrategy(strategyId: string, activatedBy: string): Promise<{
    success: boolean
    error?: string
    activated?: Record<string, unknown>
    superseded?: Record<string, unknown>[]
  }> {
    const pool = await this.getDb()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Lock the currently active row (serializes concurrent activations).
      const activeRes = await client.query(
        `SELECT id, title FROM brain_strategies WHERE status='active' FOR UPDATE`
      )

      // Lock and validate the target.
      const targetRes = await client.query(
        `SELECT id, title, status, version FROM brain_strategies WHERE id=$1 FOR UPDATE`,
        [strategyId]
      )
      const target = targetRes.rows[0]
      if (!target) {
        await client.query('ROLLBACK')
        return { success: false, error: 'Strategy not found' }
      }
      if (target.status !== 'approved') {
        await client.query('ROLLBACK')
        return {
          success: false,
          error: `Only 'approved' strategies can be activated (current status: '${target.status}')`,
        }
      }

      // Demote any current active strategy to superseded (history preserved).
      let superseded: Record<string, unknown>[] = []
      if (activeRes.rows.length > 0) {
        superseded = activeRes.rows
        await client.query(
          `UPDATE brain_strategies SET status='superseded', updated_at=NOW() WHERE status='active'`
        )
      }

      // Activate the target. The conditional status check makes duplicate
      // activation attempts no-ops rather than errors.
      const actRes = await client.query(
        `UPDATE brain_strategies
            SET status='active', activated_at=NOW(), updated_at=NOW()
          WHERE id=$1 AND status='approved'`,
        [strategyId]
      )
      if ((actRes.rowCount || 0) === 0) {
        await client.query('ROLLBACK')
        return { success: false, error: 'Strategy was no longer in an activatable state' }
      }

      await client.query('COMMIT')

      const activatedRes = await client.query(
        `SELECT * FROM brain_strategies WHERE id=$1`,
        [strategyId]
      )
      return {
        success: true,
        activated: activatedRes.rows[0],
        superseded,
      }
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('idx_brain_strategies_single_active') || msg.includes('duplicate key')) {
        return {
          success: false,
          error: 'Concurrent activation detected — another strategy is already active',
        }
      }
      console.error('BrainRepository.activateStrategy:', e)
      return { success: false, error: msg }
    } finally {
      client.release()
    }
  }

  /** The single currently-active strategy, or null. */
  async getCurrentActiveStrategy(): Promise<Record<string, unknown> | null> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT * FROM brain_strategies WHERE status='active' ORDER BY activated_at DESC NULLS LAST LIMIT 1`
      )
      return result.rows[0] || null
    } catch { return null }
  }

  /**
   * Idempotently ensure the baseline business strategy exists.
   * Returns the baseline row (creating it if missing) or null on failure.
   *
   * The baseline is the operating foundation for the Brain — it is NOT a
   * consequential change, so it is created/activated automatically during
   * one-time initialization. Opportunity-based strategies remain 'proposed'
   * until the owner approves them.
   */
  async ensureBaselineStrategy(): Promise<Record<string, unknown> | null> {
    try {
      const existing = await this.getCurrentActiveStrategy()
      if (existing) return existing

      const pool = await this.getDb()
      const result = await pool.query(
        `INSERT INTO brain_strategies (
           title, description, business_goal, reason, evidence, expected_impact,
           confidence, risks, status, provenance, strategy_type
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          'ViaFinds Baseline: Digital Products Affiliate Content Business',
          'Article/blog-driven digital products affiliate business operated from Pakistan for an international audience. Revenue-first, evidence-driven, with Pakistan-first affiliate eligibility and payout practicality as a hard constraint.',
          'Sustained affiliate revenue growth through high-quality digital product content',
          'Initial baseline strategy created during one-time Brain Wake Up',
          JSON.stringify({
            source: 'business_foundation',
            constraints: [
              'Pakistan operator must have a realistic, verified way to receive affiliate commissions',
              'No fake data, no fabricated affiliate links or partner eligibility',
              'International customers allowed; Pakistan payout practicality is the hard constraint',
            ],
            createdAt: new Date().toISOString(),
          }),
          'Defines the operating frame for all Brain opportunity, partner, and content decisions',
          'High',
          'Baseline assumptions may need refinement as real revenue data accumulates',
          'approved',
          'REAL',
          'baseline',
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('BrainRepository.ensureBaselineStrategy:', e)
      return null
    }
  }

  /**
   * Idempotently ensure the required production schedules exist.
   * Missing schedules are inserted; existing ones are left untouched.
   */
  async ensureRequiredSchedules(): Promise<void> {
    const schedules: Array<{
      key: string; purpose: string; frequency: string; handler: string
    }> = [
      { key: 'daily_opportunity_scan', purpose: 'Daily opportunity discovery and validation', frequency: 'daily', handler: 'brain_cycle:opportunities' },
      { key: 'daily_health', purpose: 'Daily system health assessment', frequency: 'daily', handler: 'brain_cycle:health' },
      { key: 'weekly_research', purpose: 'Weekly deep research cycle', frequency: 'weekly', handler: 'brain_cycle:research' },
      { key: 'monthly_strategy_review', purpose: 'Monthly strategy evaluation and adjustment', frequency: 'monthly', handler: 'brain_cycle:strategy_review' },
      { key: 'daily_revenue_scan', purpose: 'Daily revenue and conversion scan', frequency: 'daily', handler: 'brain_cycle:revenue' },
      { key: 'weekly_product_research', purpose: 'Weekly product discovery and partner verification', frequency: 'weekly', handler: 'brain_cycle:partners' },
      { key: 'weekly_partner_verification', purpose: 'Weekly partner eligibility re-verification', frequency: 'weekly', handler: 'brain_cycle:partners' },
    ]
    try {
      const pool = await this.getDb()
      for (const s of schedules) {
        await pool.query(
          `INSERT INTO brain_schedules (key, purpose, frequency, enabled, status, handler, metadata)
           VALUES ($1, $2, $3, true, 'scheduled', $4, $5)
           ON CONFLICT (key) DO NOTHING`,
          [s.key, s.purpose, s.frequency, s.handler, JSON.stringify({ ensuredBy: 'wakeBrain' })]
        )
      }
    } catch (e) {
      console.error('BrainRepository.ensureRequiredSchedules:', e)
    }
  }

  /** Full strategy history, newest first. */
  async getStrategyHistory(limit = 50): Promise<Record<string, unknown>[]> {
    try {
      const pool = await this.getDb()
      const result = await pool.query(
        `SELECT id, title, status, version, parent_strategy_id, activated_at, created_at, updated_at
           FROM brain_strategies
          ORDER BY COALESCE(activated_at, created_at) DESC
          LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch { return [] }
  }
}

export const brainRepository = new BrainRepository()
