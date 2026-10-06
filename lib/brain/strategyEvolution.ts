import { BrainRepository } from '../db/repositories/brain'
import { EvidenceConfidenceModel, EvidenceFreshness } from './strategyEngineV2'
import { OpportunityEngineV2 } from './opportunityEngineV2'

export type EvolutionType =
  | 'NO_CHANGE' | 'REVIEW' | 'REFINE' | 'SUPERSEDE'
  | 'PAUSE' | 'RETIRE'

export type EvolutionTrigger =
  | 'NEW_EVIDENCE' | 'STRATEGY_STALE' | 'OPPORTUNITY_CHANGED'
  | 'OPPORTUNITY_EXPIRED' | 'CONFLICT_DETECTED' | 'EXECUTION_DEVIATION'
  | 'QUALITY_DEVIATION' | 'BUSINESS_OUTCOME' | 'CAPABILITY_CHANGE'
  | 'PRODUCT_AVAILABILITY_CHANGE' | 'REUSABLE_LEARNING'
  | 'EXPERIMENT_PROPOSAL'

export interface StrategyEvolutionProposal {
  id?: string
  strategy_id: string
  source_strategy_version: number
  proposed_version: number
  evolution_type: EvolutionType
  trigger_type: EvolutionTrigger
  evidence_refs: any[]
  opportunity_ids: string[]
  learning_ids: string[]
  decision_ids: string[]
  execution_ids: string[]
  experiment_ids?: string[]
  experiment_results?: any[]
  experiment_decisions?: any[]
  evidence_strength: string
  confidence?: number
  assumptions: any[]
  unknowns: any[]
  unavailable_data: any[]
  risks: any[]
  proposed_changes: any
  expected_observations: any[]
  success_conditions: any[]
  failure_conditions: any[]
  provenance: string
  status: string
  approval_id?: string | null
  created_at?: string
  updated_at?: string
}

export class StrategyEvolution {
  private brainRepo: BrainRepository

  constructor(brainRepo?: BrainRepository) {
    this.brainRepo = brainRepo || new BrainRepository()
  }

  async evaluate(strategy: any, context: {
    snapshot?: any; opportunities?: any[]; learnings?: any[]
    decisions?: any[]; executions?: any[]; qualityResults?: any[]
    verifications?: any[]; researchRuns?: any[]
  }): Promise<StrategyEvolutionProposal[]> {
    const triggers = this.detectTriggers(strategy, context)
    if (triggers.length === 0) {
      return [this.buildNoChange(strategy, context)]
    }
    const proposals: StrategyEvolutionProposal[] = []
    for (const trigger of triggers) {
      const proposal = this.buildProposal(strategy, trigger, context)
      if (proposal) proposals.push(proposal)
    }
    return proposals.length > 0 ? proposals : [this.buildNoChange(strategy, context)]
  }

  private detectTriggers(strategy: any, context: any): EvolutionTrigger[] {
    const triggers: EvolutionTrigger[] = []
    const snapshot = context.snapshot
    const sensors = snapshot?.sensors || {}
    const now = Date.now()
    const created = strategy.created_at ? new Date(strategy.created_at).getTime() : NaN
    const ageDays = !isNaN(created) ? (now - created) / (1000 * 60 * 60 * 24) : Infinity

    if (ageDays > 30) triggers.push('STRATEGY_STALE')

    const opps = context.opportunities || []
    const strategyOppIds: string[] = Array.isArray(strategy.opportunity_ids) ? strategy.opportunity_ids : []
    for (const opp of opps) {
      if (strategyOppIds.includes(opp.id) && opp.provenance !== 'UNKNOWN') {
        if (opp.evidence_strength === 'STALE' || this.assessFreshness(opp) === 'STALE') {
          triggers.push('OPPORTUNITY_EXPIRED')
        } else if (opp.validation_status === 'CONFLICT_DETECTED' || (opp.conflict_flags || []).length > 0) {
          triggers.push('CONFLICT_DETECTED')
        } else if (opp.evidence_strength && opp.evidence_strength !== strategy.evidence_strength) {
          triggers.push('OPPORTUNITY_CHANGED')
        }
      }
    }

    const qualityResults = context.qualityResults || []
    const failedQuality = qualityResults.filter((q: any) => q.status === 'FAIL').length
    if (failedQuality >= 2) triggers.push('QUALITY_DEVIATION')

    const executions = context.executions || []
    const failedExec = executions.filter((e: any) => e.status === 'failed').length
    if (failedExec >= 2) triggers.push('EXECUTION_DEVIATION')

    const verifications = context.verifications || []
    const notVerified = verifications.filter((v: any) => v.status === 'NOT_VERIFIABLE').length
    const businessUnavailable = sensors.traffic === 'UNAVAILABLE' || sensors.affiliateConversions === 'UNAVAILABLE' || sensors.revenue === 'UNAVAILABLE'
    if (notVerified >= 1 && businessUnavailable) {
      triggers.push('BUSINESS_OUTCOME')
    }

    const learnings = context.learnings || []
    const reusable = learnings.filter((l: any) => l.reusability === 'high' || l.reusable === true)
    if (reusable.length >= 2) triggers.push('REUSABLE_LEARNING')

    const researchRuns = context.researchRuns || []
    if (researchRuns.length >= 1 && strategy.evidence_strength !== 'STRONGLY_SUPPORTED') {
      triggers.push('NEW_EVIDENCE')
    }

    const experimentResults = context.experimentResults || []
    const experimentDecisions = context.experimentDecisions || []
    if (experimentResults.length > 0 || experimentDecisions.length > 0) {
      triggers.push('EXPERIMENT_PROPOSAL')
    }

    const productState = context.snapshot?.sensors?.product_availability
    if (productState === 'DIGISTORE_CREDENTIALS_MISSING' || productState === 'UNAVAILABLE') {
      triggers.push('PRODUCT_AVAILABILITY_CHANGE')
    }

    const capabilityGaps = (context.researchRuns?.length > 0 && strategy.evidence_strength !== 'STRONGLY_SUPPORTED') ||
      businessUnavailable
    if (capabilityGaps) {
      triggers.push('CAPABILITY_CHANGE')
    }

    return Array.from(new Set(triggers))
  }

  private buildNoChange(strategy: any, context: any): StrategyEvolutionProposal {
    const unavailableData: any[] = []
    const sensors = context.snapshot?.sensors || {}
    if (sensors.traffic === 'UNAVAILABLE') unavailableData.push('Traffic measurement is unavailable.')
    if (sensors.affiliateConversions === 'UNAVAILABLE') unavailableData.push('Conversion measurement is unavailable.')
    if (sensors.revenue === 'UNAVAILABLE') unavailableData.push('Revenue measurement is unavailable.')
    return {
      strategy_id: strategy.id,
      source_strategy_version: strategy.version || 1,
      proposed_version: strategy.version || 1,
      evolution_type: 'NO_CHANGE',
      trigger_type: 'NEW_EVIDENCE',
      evidence_refs: [],
      opportunity_ids: [],
      learning_ids: [],
      decision_ids: [],
      execution_ids: [],
      evidence_strength: strategy.evidence_strength || 'INSUFFICIENT_EVIDENCE',
      confidence: 0.1,
      assumptions: ['No evidence justifies changing this strategy'],
      unknowns: [],
      unavailable_data: unavailableData,
      risks: [],
      proposed_changes: { change: 'none' },
      expected_observations: [],
      success_conditions: ['Strategy remains unchanged'],
      failure_conditions: [],
      provenance: strategy.provenance || 'UNKNOWN',
      status: 'PROPOSED',
      approval_id: null,
    }
  }

private buildProposal(strategy: any, trigger: EvolutionTrigger, context: any): StrategyEvolutionProposal | null {
    const unavailableData: any[] = []
    const sensors = context.snapshot?.sensors || {}
    if (sensors.traffic === 'UNAVAILABLE') unavailableData.push('Traffic measurement is unavailable.')
    if (sensors.affiliateConversions === 'UNAVAILABLE') unavailableData.push('Conversion measurement is unavailable.')
    if (sensors.revenue === 'UNAVAILABLE') unavailableData.push('Revenue measurement is unavailable.')

    const opps = context.opportunities || []
    const strategyOppIds: string[] = Array.isArray(strategy.opportunity_ids) ? strategy.opportunity_ids : []
    const relatedOpps = opps.filter((o: any) => strategyOppIds.includes(o.id))
    const realRelated = relatedOpps.filter((o: any) => (o.provenance || '').toUpperCase() === 'REAL')

    if (trigger === 'OPPORTUNITY_EXPIRED' && realRelated.length === 0) {
        return null
    }

    const learnings = context.learnings || []
    const reusableLearnings = learnings.filter((l: any) => l.reusability === 'high' || l.reusable === true)

    const sourceIds: string[] = []
    const evidenceRefs: any[] = []
    for (const opp of realRelated) {
        const ids = Array.isArray(opp.source_ids) ? opp.source_ids : []
        ids.forEach((id: string) => { sourceIds.push(id); evidenceRefs.push({ sourceId: id, type: 'research_source' }) })
    }
    reusableLearnings.forEach((l: any) => evidenceRefs.push({ learningId: l.id, type: 'reusable_learning' }))

    // Handle experiment results for EXPERIMENT_PROPOSAL trigger
    if (trigger === 'EXPERIMENT_PROPOSAL') {
        const experimentResults = context.experimentResults || []
        const experimentDecisions = context.experimentDecisions || []
        
        // Add experiment result references
        for (const result of experimentResults) {
            evidenceRefs.push({ experimentId: result.experiment_id, type: 'experiment_result' })
        }
        
        // Add experiment decision references  
        for (const decision of experimentDecisions) {
            evidenceRefs.push({ decisionId: decision.id, type: 'experiment_decision' })
        }
        
        // Extract learnings from experiment results
        for (const result of experimentResults) {
            if (result.conclusion === 'SIGNIFICANT_WIN' || result.conclusion === 'SIGNIFICANT_LOSS') {
                // Create a learning from the experiment result
                const learningId = `exp-learn-${result.experiment_id}-${Date.now()}`
                evidenceRefs.push({ learningId, type: 'experiment_learning' })
                // Don't add to learning_ids as this is handled elsewhere
            }
        }
    }

    const freshness = this.assessFreshness(strategy)
    const confidence = EvidenceConfidenceModel.compute({
        sourceCount: sourceIds.length, sourceAuthority: 1.0, freshness,
        completeness: sourceIds.length > 0 ? 1.0 : 0.3, provenanceQuality: 1.0,
        consistency: 1.0, relevance: 1.0, criticalUnavailable: unavailableData.length > 0,
    })
    const strength = EvidenceConfidenceModel.strengthFromConfidence(confidence)

    const evolutionType = this.mapTriggerToEvolution(trigger, strategy, context)
    const proposedVersion = (strategy.version || 1) + 1

    const successConditions: any[] = []
    const failureConditions: any[] = []
    if (unavailableData.length > 0) {
        successConditions.push('Measurement sensors become active (business outcome currently NOT_VERIFIABLE)')
        failureConditions.push('Business outcome remains NOT_VERIFIABLE due to unavailable sensors')
    } else {
        successConditions.push('Verified business observations confirm the evolution is justified')
    }

    const proposal: StrategyEvolutionProposal = {
        strategy_id: strategy.id,
        source_strategy_version: strategy.version || 1,
        proposed_version: proposedVersion,
        evolution_type: evolutionType,
        trigger_type: trigger,
        evidence_refs: evidenceRefs,
        opportunity_ids: realRelated.map((o: any) => o.id),
        learning_ids: reusableLearnings.map((l: any) => l.id),
        decision_ids: [], // Will be populated from experiment decisions if EXPERIMENT_PROPOSAL
        execution_ids: [],
        evidence_strength: strength,
        confidence,
        assumptions: ['Evolution is justified by accumulated verified evidence'],
        unknowns: sourceIds.length === 0 ? ['No persisted source records for related opportunities'] : [],
        unavailable_data: unavailableData,
        risks: ['Evolution requires approval before execution'],
        proposed_changes: { trigger, evolutionType, freshness },
        expected_observations: ['Strategy evidence re-evaluated after change'],
        success_conditions: successConditions,
        failure_conditions: failureConditions,
        provenance: strategy.provenance || 'UNKNOWN',
        status: 'PROPOSED',
        approval_id: null,
    }
    return proposal
}

  private mapTriggerToEvolution(trigger: EvolutionTrigger, strategy: any, context: any): EvolutionType {
    switch (trigger) {
      case 'STRATEGY_STALE': return 'REVIEW'
      case 'OPPORTUNITY_EXPIRED': return 'REVIEW'
      case 'CONFLICT_DETECTED': return 'REVIEW'
      case 'OPPORTUNITY_CHANGED': return 'REFINE'
      case 'EXECUTION_DEVIATION': return 'REFINE'
      case 'QUALITY_DEVIATION': return 'REFINE'
      case 'BUSINESS_OUTCOME': return 'REVIEW'
      case 'CAPABILITY_CHANGE': return 'PAUSE'
      case 'PRODUCT_AVAILABILITY_CHANGE': return 'PAUSE'
      case 'REUSABLE_LEARNING': return 'REFINE'
      case 'NEW_EVIDENCE': return 'REFINE'
      case 'EXPERIMENT_PROPOSAL': return 'REFINE'
      default: return 'REVIEW'
    }
  }

  private assessFreshness(record: any): EvidenceFreshness {
    const createdAt = record?.created_at || record?.createdAt
    if (!createdAt) return 'UNKNOWN_FRESHNESS'
    const created = new Date(createdAt).getTime()
    if (isNaN(created)) return 'UNKNOWN_FRESHNESS'
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24)
    return ageDays <= 30 ? 'FRESH' : 'STALE'
  }
async applyEvolution(proposalId: string, adminUserId: string): Promise<any> {
    const pool = await this.brainRepo.getDbPool()
    
    // 1. Verify admin
    const adminCheck = await pool.query('SELECT role FROM admin_users WHERE id = $1', [adminUserId])
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      throw new Error('Unauthorized transition attempt')
    }

    // 2. Fetch proposal
    const propRes = await pool.query('SELECT * FROM brain_strategy_evolution WHERE id = $1', [proposalId])
    if (propRes.rows.length === 0) throw new Error('Evolution proposal not found')
    const proposal = propRes.rows[0]
    
    if (proposal.status !== 'APPROVED') {
      throw new Error('Only APPROVED proposals can be applied')
    }

    // 3. Fetch V1
    const stratRes = await pool.query('SELECT * FROM brain_strategies WHERE id = $1', [proposal.strategy_id])
    if (stratRes.rows.length === 0) throw new Error('Source strategy not found')
    const v1 = stratRes.rows[0]

    // 4. Evolve to V2
    if (['REFINE', 'SUPERSEDE', 'PAUSE', 'RETIRE'].includes(proposal.evolution_type)) {
      const v2 = await this.brainRepo.createStrategyV2({
        title: v1.title,
        type: v1.strategy_type,
        objective: v1.objective,
        status: proposal.evolution_type === 'PAUSE' ? 'PAUSED' : (proposal.evolution_type === 'RETIRE' ? 'COMPLETED' : 'ACTIVE'),
        description: v1.description,
        rationale: v1.rationale + `\n[EVOLVED via ${proposal.id}]: ${JSON.stringify(proposal.proposed_changes)}`,
        evidence: v1.evidence,
        evidenceRefs: proposal.evidence_refs || v1.evidence_refs || [],
        assumptions: proposal.assumptions || v1.assumptions || [],
        unknowns: proposal.unknowns || v1.unknowns || [],
        unavailableData: proposal.unavailable_data || v1.unavailable_data || [],
        risks: proposal.risks || v1.risks || [],
        constraints: v1.constraints || [],
        expectedObservations: proposal.expected_observations || v1.expected_observations || [],
        successConditions: proposal.success_conditions || v1.success_conditions || [],
        failureConditions: proposal.failure_conditions || v1.failure_conditions || [],
        requiredPermissions: v1.required_permissions || [],
        opportunityIds: proposal.opportunity_ids || v1.opportunity_ids || [],
        decisionIds: proposal.decision_ids || v1.decision_ids || [],
        researchIds: v1.research_ids || [],
        learningIds: v1.learning_ids || [],
        parentStrategyId: v1.id,
        version: proposal.proposed_version,
        evidenceStrength: proposal.evidence_strength || v1.evidence_strength,
        outcomeStatus: 'NOT_STARTED',
        freshness: 'FRESH',
        conflictFlags: [],
        provenance: proposal.provenance || v1.provenance,
        confidence: proposal.confidence || v1.confidence || null,
        approvalRequired: false
      })

      await pool.query('UPDATE brain_strategy_evolution SET status = $1 WHERE id = $2', ['APPLIED', proposal.id])
      
      // Do not mutate V1.
      const resolvedStatus = proposal.evolution_type === 'PAUSE' ? 'PAUSED' : (proposal.evolution_type === 'RETIRE' ? 'COMPLETED' : 'ACTIVE')
      return { ...v2, version: proposal.proposed_version, parent_strategy_id: v1.id, provenance: proposal.provenance || v1.provenance, status: resolvedStatus, rationale: v1.rationale + `\n[EVOLVED via ${proposal.id}]: ${JSON.stringify(proposal.proposed_changes)}` }
    }

    return null
  }
}


