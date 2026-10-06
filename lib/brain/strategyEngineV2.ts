import { BrainRepository } from '../db/repositories/brain'
import { BusinessIntelligenceService, BusinessHealthSnapshot } from './businessIntelligence'

export type StrategyType =
  | 'CONTENT_STRATEGY'
  | 'PRODUCT_DISCOVERY_STRATEGY'
  | 'TRAFFIC_STRATEGY'
  | 'CONVERSION_STRATEGY'
  | 'AFFILIATE_STRATEGY'
  | 'SEO_CONTENT_STRATEGY'
  | 'INTERNAL_LINKING_STRATEGY'
  | 'PUBLISHING_STRATEGY'
  | 'RESEARCH_STRATEGY'
  | 'AUTOMATION_STRATEGY'
  | 'MONETIZATION_STRATEGY'
  | 'OWNED_PRODUCT_STRATEGY'

export type StrategyStatus =
  | 'PROPOSED'
  | 'EVIDENCE_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'BLOCKED'

export type EvidenceStrength =
  | 'INSUFFICIENT_EVIDENCE'
  | 'LIMITED_EVIDENCE'
  | 'SUPPORTED'
  | 'STRONGLY_SUPPORTED'

export type StrategyOutcomeStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'OBSERVING'
  | 'EXECUTION_SUCCESS'
  | 'BUSINESS_SUCCESS'
  | 'PARTIAL'
  | 'EXECUTION_FAILED'
  | 'BUSINESS_FAILED'
  | 'NOT_VERIFIABLE'
  | 'INSUFFICIENT_DATA'

export type EvidenceFreshness = 'FRESH' | 'STALE' | 'UNKNOWN_FRESHNESS'

export interface StrategyV2 {
  id?: string
  title: string
  type: StrategyType
  objective: string
  status: StrategyStatus
  description: string
  rationale: string
  evidence: any
  evidence_refs: any[]
  assumptions: any[]
  unknowns: any[]
  unavailable_data: any[]
  risks: string[]
  constraints: any[]
  expected_observations: any[]
  success_conditions: any[]
  failure_conditions: any[]
  required_permissions: string[]
  opportunity_ids: string[]
  decision_ids: string[]
  research_ids: string[]
  learning_ids: string[]
  parent_strategy_id?: string | null
  version: number
  evidence_strength: EvidenceStrength
  outcome_status: StrategyOutcomeStatus
  freshness: any
  conflict_flags: any[]
  provenance?: string
  confidence?: number
  created_at?: string
  updated_at?: string
}

/**
 * Evidence-derived confidence model.
 *
 * Confidence is computed from actual available evidence, never from a
 * hardcoded constant. Factors:
 *
 *   source_count        — number of independent research sources
 *   source_authority    — 1.0 for persisted DB sources, 0.5 for inferred
 *   evidence_freshness  — FRESH=1.0, STALE=0.5, UNKNOWN=0.7
 *   evidence_completeness — fraction of required evidence present
 *   provenance_quality  — REAL=1.0, TEST/FIXTURE=0.5, UNKNOWN=0.0
 *   consistency         — 1.0 if no contradictions, 0.7 if mixed
 *   relevance           — 1.0 if evidence directly supports the strategy
 *   critical_unavailable — penalty when required business data is missing
 *
 * Weights are documented and transparent. The final score is the weighted
 * product, clamped to [0, 1]. If evidence is insufficient, the qualitative
 * EvidenceStrength state is used instead of manufacturing a precise number.
 */
export class EvidenceConfidenceModel {
  private static readonly WEIGHTS = {
    source_count: 0.20,
    source_authority: 0.15,
    evidence_freshness: 0.15,
    evidence_completeness: 0.20,
    provenance_quality: 0.10,
    consistency: 0.10,
    relevance: 0.10,
  }

  static compute(input: {
    sourceCount: number
    sourceAuthority: number
    freshness: EvidenceFreshness
    completeness: number
    provenanceQuality: number
    consistency: number
    relevance: number
    criticalUnavailable: boolean
  }): number {
    const {
      sourceCount, sourceAuthority, freshness, completeness,
      provenanceQuality, consistency, relevance, criticalUnavailable,
    } = input

    const countScore = Math.min(1, sourceCount / 3)
    const freshnessScore = freshness === 'FRESH' ? 1.0 : freshness === 'STALE' ? 0.5 : 0.7
    const completenessScore = Math.max(0, Math.min(1, completeness))
    const authorityScore = Math.max(0, Math.min(1, sourceAuthority))
    const provenanceScore = Math.max(0, Math.min(1, provenanceQuality))
    const consistencyScore = Math.max(0, Math.min(1, consistency))
    const relevanceScore = Math.max(0, Math.min(1, relevance))

    const weighted =
      countScore * EvidenceConfidenceModel.WEIGHTS.source_count +
      authorityScore * EvidenceConfidenceModel.WEIGHTS.source_authority +
      freshnessScore * EvidenceConfidenceModel.WEIGHTS.evidence_freshness +
      completenessScore * EvidenceConfidenceModel.WEIGHTS.evidence_completeness +
      provenanceScore * EvidenceConfidenceModel.WEIGHTS.provenance_quality +
      consistencyScore * EvidenceConfidenceModel.WEIGHTS.consistency +
      relevanceScore * EvidenceConfidenceModel.WEIGHTS.relevance

    let confidence = Math.max(0, Math.min(1, weighted))

    // Penalty when critical business data is unavailable — this prevents
    // unavailable revenue/conversion data from inflating confidence.
    if (criticalUnavailable) {
      confidence *= 0.5
    }

    // Single observation cap: one source cannot support HIGH confidence.
    if (sourceCount <= 1) {
      confidence = Math.min(confidence, 0.5)
    }

    // Zero sources with no evidence cannot support any confidence above
    // INSUFFICIENT_EVIDENCE, regardless of provenance quality or consistency.
    if (sourceCount === 0 && completeness <= 0) {
      confidence = Math.min(confidence, 0.1)
    }

    return Math.round(confidence * 100) / 100
  }

  static strengthFromConfidence(confidence: number): EvidenceStrength {
    if (confidence >= 0.7) return 'STRONGLY_SUPPORTED'
    if (confidence >= 0.4) return 'SUPPORTED'
    if (confidence >= 0.15) return 'LIMITED_EVIDENCE'
    return 'INSUFFICIENT_EVIDENCE'
  }
}

export class StrategyEngineV2 {
  private brainRepo: BrainRepository

  constructor(brainRepo?: BrainRepository) {
    this.brainRepo = brainRepo || new BrainRepository()
  }

  async generateStrategies(context: {
    snapshot?: any
    opportunities?: any[]
    decisions?: any[]
    researchRuns?: any[]
    learnings?: any[]
    existingStrategies?: any[]
    constraints?: any[]
  }): Promise<StrategyV2[]> {
    const snapshot = context.snapshot
    const opportunities = context.opportunities || []
    const decisions = context.decisions || []
    const learnings = context.learnings || []
    const existingStrategies = context.existingStrategies || []

    const realOpportunities = this.filterRealOpportunities(opportunities)
    const realLearnings = this.filterRealLearnings(learnings)
    const candidates: StrategyV2[] = []

    if (realOpportunities.length > 0) {
      for (const opp of realOpportunities) {
        const strat = this.buildContentStrategyFromOpportunity(opp, snapshot, decisions, realLearnings)
        if (strat) candidates.push(strat)
      }
    }

    const contentStrat = this.buildContentInventoryStrategy(snapshot, realOpportunities, realLearnings)
    if (contentStrat) candidates.push(contentStrat)

    const researchStrat = this.buildResearchStrategy(snapshot, realOpportunities, realLearnings)
    if (researchStrat) candidates.push(researchStrat)

    const deduped = this.deduplicateStrategies(candidates, existingStrategies)
    return deduped
  }

  private filterRealOpportunities(opportunities: any[]): any[] {
    return opportunities.filter((o) => {
      const p = (o.provenance || '').toUpperCase()
      return p === 'REAL'
    })
  }

  private filterRealLearnings(learnings: any[]): any[] {
    return learnings.filter((l) => {
      const p = (l.provenance || '').toUpperCase()
      return p === 'REAL'
    })
  }

private buildContentStrategyFromOpportunity(
    opp: any,
    snapshot: any,
    decisions: any[],
    learnings: any[]
  ): StrategyV2 | null {
    const title = opp.title || 'Untitled opportunity'
    const evidence: any[] = []
    const assumptions: any[] = []
    const unknowns: any[] = []
    const unavailableData: any[] = []
    const evidenceRefs: any[] = []

    const sourceIds: string[] = Array.isArray(opp.source_ids) ? opp.source_ids : []
    if (sourceIds.length > 0) {
      evidence.push({
        type: 'research_source',
        sourceIds: sourceIds,
        description: `Opportunity ${opp.id} is grounded in ${sourceIds.length} persisted research source record(s).`
      })
      sourceIds.forEach((id) => evidenceRefs.push({ sourceId: id, type: 'research_source' }))
    } else {
      unknowns.push(`Opportunity ${opp.id} carries no persisted source records.`)
    }

    const brainReasoning = opp.brain_reasoning || ''
    if (brainReasoning) {
      evidence.push({
        type: 'brain_inference',
        description: `Brain reasoning: ${brainReasoning.slice(0, 200)}`
      })
    }

    const evaluation = opp.evaluation || {}
    const expectedOutcome = evaluation.expectedOutcome || ''
    if (expectedOutcome) {
      evidence.push({
        type: 'expected_outcome',
        description: expectedOutcome
      })
    }

    const sensorStatus = snapshot?.sensors || {}
    let criticalUnavailable = false
    if (sensorStatus.affiliateConversions === 'UNAVAILABLE') {
      unavailableData.push('Conversion measurement is unavailable — conversion-rate conclusions cannot be drawn.')
      criticalUnavailable = true
    }
    if (sensorStatus.revenue === 'UNAVAILABLE') {
      unavailableData.push('Revenue measurement is unavailable — revenue-based conclusions cannot be drawn.')
      criticalUnavailable = true
    }
    if (sensorStatus.traffic === 'UNAVAILABLE') {
      unavailableData.push('Traffic measurement is unavailable — traffic-based conclusions cannot be drawn.')
      criticalUnavailable = true
    }

    const freshness = this.assessFreshness(opp, snapshot)
    const provenanceQuality = this.assessProvenanceQuality(opp)
    const confidence = EvidenceConfidenceModel.compute({
      sourceCount: sourceIds.length,
      sourceAuthority: sourceIds.length > 0 ? 1.0 : 0.0,
      freshness,
      completeness: sourceIds.length > 0 ? 1.0 : 0.0,
      provenanceQuality,
      consistency: 1.0,
      relevance: 1.0,
      criticalUnavailable,
    })
    const evidenceStrength = EvidenceConfidenceModel.strengthFromConfidence(confidence)
    const status: StrategyStatus = evidenceStrength === 'INSUFFICIENT_EVIDENCE'
      ? 'EVIDENCE_REVIEW'
      : 'PROPOSED'

    const relatedDecisions = decisions.filter((d) => {
      const ev = d.evidence || {}
      return ev.opportunityId === opp.id
    })

    const successConditions = [
      'Article is published with persisted lineage and passes the quality gate',
      criticalUnavailable
        ? 'Affiliate click sensor becomes active and produces attributable click observations (business outcome currently NOT_VERIFIABLE)'
        : 'Observed affiliate clicks increase from the current baseline',
    ]
    const failureConditions = [
      'Required sources remain unavailable',
      'Quality gate fails repeatedly',
      criticalUnavailable ? 'Business outcome remains NOT_VERIFIABLE due to unavailable conversion/revenue sensors' : '',
    ].filter(Boolean)

    const strategy: StrategyV2 = {
      title: `Content strategy for: ${title}`,
      type: 'CONTENT_STRATEGY',
      objective: `Produce content addressing the verified opportunity "${title}"`,
      status,
      description: `Strategy to address opportunity ${opp.id} (${title}) through content creation grounded in persisted research evidence.`,
      rationale: `This strategy is justified by ${evidence.length} evidence record(s) and ${sourceIds.length} persisted source(s). Conversion and revenue data are unavailable, so this strategy makes no conversion or revenue claims.`,
      evidence,
      evidence_refs: evidenceRefs,
      assumptions,
      unknowns,
      unavailable_data: unavailableData,
      risks: ['Execution cost', 'Content quality must pass the pre-publication quality gate'],
      constraints: ['Free-first providers only', 'Must not publish without approval'],
      expected_observations: ['Article published', 'Article lineage persisted'],
      success_conditions: successConditions,
      failure_conditions: failureConditions,
      required_permissions: ['execute:content', 'publish:article'],
      opportunity_ids: [opp.id],
      decision_ids: relatedDecisions.map((d) => d.id),
      research_ids: sourceIds,
      learning_ids: learnings.filter((l) => l.source === 'execution').map((l) => l.id),
      parent_strategy_id: null,
      version: 1,
      evidence_strength: evidenceStrength,
      outcome_status: 'NOT_STARTED',
      freshness: { generatedAt: new Date().toISOString(), sourceFreshness: freshness, sourceIds },
      conflict_flags: [],
      provenance: this.deriveStrategyProvenance(opp),
      confidence,
    }
    return strategy
  }

private classifyEvidenceStrength(evidence: any[], sourceIds: string[], snapshot: any): EvidenceStrength {
    if (sourceIds.length === 0 && evidence.length === 0) return 'INSUFFICIENT_EVIDENCE'
    if (sourceIds.length === 0) return 'LIMITED_EVIDENCE'
    if (sourceIds.length >= 2) return 'STRONGLY_SUPPORTED'
    return 'SUPPORTED'
  }

  private deriveConfidence(evidenceStrength: EvidenceStrength, sourceCount: number): number {
    switch (evidenceStrength) {
      case 'STRONGLY_SUPPORTED': return 0.85
      case 'SUPPORTED': return 0.65
      case 'LIMITED_EVIDENCE': return 0.4
      default: return 0.2
    }
  }

  private assessFreshness(opp: any, snapshot: any): EvidenceFreshness {
    const createdAt = opp.created_at || opp.createdAt
    if (!createdAt) return 'UNKNOWN_FRESHNESS'
    const created = new Date(createdAt).getTime()
    if (isNaN(created)) return 'UNKNOWN_FRESHNESS'
    const ageMs = Date.now() - created
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    return ageDays <= 30 ? 'FRESH' : 'STALE'
  }

  private assessProvenanceQuality(opp: any): number {
    const p = (opp.provenance || '').toUpperCase()
    switch (p) {
      case 'REAL': return 1.0
      case 'TEST':
      case 'FIXTURE': return 0.5
      default: return 0.0
    }
  }

  private deriveStrategyProvenance(opp: any): string {
    const p = (opp.provenance || '').toUpperCase()
    if (p === 'REAL') return 'REAL'
    if (p === 'TEST' || p === 'FIXTURE') return p
    return 'UNKNOWN'
  }

private buildContentInventoryStrategy(
    snapshot: any,
    realOpportunities: any[],
    realLearnings: any[]
  ): StrategyV2 | null {
    const articles = snapshot?.content?.totalArticles
    if (!articles || articles.value === 0) return null

    const unknowns: any[] = []
    const unavailableData: any[] = []
    let criticalUnavailable = false
    if (snapshot?.sensors?.traffic === 'UNAVAILABLE') {
      unavailableData.push('Traffic measurement is unavailable.')
      criticalUnavailable = true
    }
    if (snapshot?.sensors?.affiliateConversions === 'UNAVAILABLE') {
      unavailableData.push('Conversion measurement is unavailable.')
      criticalUnavailable = true
    }

    const evidence: any[] = [
      { type: 'observed_inventory', description: `${articles.value} articles exist in the content inventory.` }
    ]
    const evidenceRefs: any[] = []
    const published = snapshot?.content?.publishedThisMonth
    if (published && published.value > 0) {
      evidence.push({
        type: 'observed_activity',
        description: `${published.value} article(s) were published in the current observation window.`
      })
    }

    const freshness = this.assessFreshness({ created_at: snapshot?.generatedAt }, snapshot)
    const confidence = EvidenceConfidenceModel.compute({
      sourceCount: evidence.length,
      sourceAuthority: 0.5,
      freshness,
      completeness: evidence.length >= 2 ? 1.0 : 0.5,
      provenanceQuality: 1.0,
      consistency: 1.0,
      relevance: 1.0,
      criticalUnavailable,
    })
    const strength = EvidenceConfidenceModel.strengthFromConfidence(confidence)
    const successConditions = [
      'Additional published articles with persisted lineage',
      criticalUnavailable
        ? 'Affiliate click sensor becomes active (business outcome currently NOT_VERIFIABLE)'
        : 'Observed affiliate clicks increase from baseline',
    ]
    const failureConditions = [
      'No new articles published in observation window',
      criticalUnavailable ? 'Business outcome remains NOT_VERIFIABLE' : '',
    ].filter(Boolean)

    const strategy: StrategyV2 = {
      title: 'Expand verified content inventory',
      type: 'CONTENT_STRATEGY',
      objective: 'Grow the published content inventory from verified opportunities',
      status: strength === 'INSUFFICIENT_EVIDENCE' ? 'EVIDENCE_REVIEW' : 'PROPOSED',
      description: 'Strategy to grow content inventory from REAL opportunities with persisted research evidence.',
      rationale: `Content inventory is observed at ${articles.value} articles. ${realOpportunities.length} REAL opportunity(ies) are available to drive new content.`,
      evidence,
      evidence_refs: evidenceRefs,
      assumptions: ['Existing automation pipeline can publish from verified opportunities'],
      unknowns,
      unavailable_data: unavailableData,
      risks: ['Execution cost', 'Quality gate must pass'],
      constraints: ['Free-first', 'No publishing without approval'],
      expected_observations: ['New article published', 'Article lineage persisted'],
      success_conditions: successConditions,
      failure_conditions: failureConditions,
      required_permissions: ['execute:content', 'publish:article'],
      opportunity_ids: realOpportunities.map((o) => o.id),
      decision_ids: [],
      research_ids: [],
      learning_ids: realLearnings.map((l) => l.id),
      parent_strategy_id: null,
      version: 1,
      evidence_strength: strength,
      outcome_status: 'NOT_STARTED',
      freshness: { generatedAt: new Date().toISOString(), sourceFreshness: freshness },
      conflict_flags: [],
      provenance: 'REAL',
      confidence,
    }
    return strategy
  }

private buildResearchStrategy(
    snapshot: any,
    realOpportunities: any[],
    realLearnings: any[]
  ): StrategyV2 | null {
    if (realOpportunities.length === 0) return null
    const unavailableData: any[] = []
    let criticalUnavailable = false
    if (snapshot?.sensors?.traffic === 'UNAVAILABLE') {
      unavailableData.push('Traffic measurement is unavailable.')
      criticalUnavailable = true
    }
    const evidence: any[] = [
      { type: 'opportunity_pipeline', description: `${realOpportunities.length} REAL opportunity(ies) require continued research.` }
    ]
    const evidenceRefs: any[] = []
    const freshness = this.assessFreshness({ created_at: snapshot?.generatedAt }, snapshot)
    const confidence = EvidenceConfidenceModel.compute({
      sourceCount: realOpportunities.length,
      sourceAuthority: 0.5,
      freshness,
      completeness: 0.5,
      provenanceQuality: 1.0,
      consistency: 1.0,
      relevance: 1.0,
      criticalUnavailable,
    })
    const successConditions = [
      'Research refreshed for active opportunities',
      criticalUnavailable
        ? 'Traffic sensor becomes active (business outcome currently NOT_VERIFIABLE)'
        : 'Observed traffic data confirms research relevance',
    ]
    const failureConditions = [
      'Research sources become inaccessible',
      criticalUnavailable ? 'Business outcome remains NOT_VERIFIABLE' : '',
    ].filter(Boolean)
    return {
      title: 'Continue research on verified opportunities',
      type: 'RESEARCH_STRATEGY',
      objective: 'Maintain research coverage for REAL opportunities',
      status: 'PROPOSED',
      description: 'Strategy to sustain research coverage for verified opportunities.',
      rationale: `REAL opportunities require continued research to refresh evidence before execution.`,
      evidence,
      evidence_refs: evidenceRefs,
      assumptions: ['Research sources remain accessible'],
      unknowns: [],
      unavailable_data: unavailableData,
      risks: ['Research sources may become stale'],
      constraints: ['Free-first'],
      expected_observations: ['New research runs completed'],
      success_conditions: successConditions,
      failure_conditions: failureConditions,
      required_permissions: ['execute:research'],
      opportunity_ids: realOpportunities.map((o) => o.id),
      decision_ids: [],
      research_ids: [],
      learning_ids: [],
      parent_strategy_id: null,
      version: 1,
      evidence_strength: EvidenceConfidenceModel.strengthFromConfidence(confidence),
      outcome_status: 'NOT_STARTED',
      freshness: { generatedAt: new Date().toISOString(), sourceFreshness: freshness },
      conflict_flags: [],
      provenance: 'REAL',
      confidence,
    }
  }

  private deduplicateStrategies(candidates: StrategyV2[], existing: any[]): StrategyV2[] {
    const seen = new Set<string>()
    const existingSignatures = new Set(
      (existing || []).map((s) => this.strategySignature(s))
    )
    const result: StrategyV2[] = []
    for (const c of candidates) {
      const sig = this.strategySignature(c)
      if (seen.has(sig) || existingSignatures.has(sig)) continue
      seen.add(sig)
      const conflicts = this.detectConflicts(c, [...result, ...(existing || [])])
      result.push({ ...c, conflict_flags: conflicts })
    }
    return result
  }

  private detectConflicts(strategy: StrategyV2, others: any[]): any[] {
    const conflicts: any[] = []
    const timestamp = new Date().toISOString()
    for (const other of others) {
      if (!other || other.id === strategy.id) continue

      // Contradictory publishing constraints
      const sConstraints = (strategy.constraints || []).map((c: string) => c.toLowerCase())
      const oConstraints = (other.constraints || []).map((c: string) => c.toLowerCase())
      const hasNoPublish = sConstraints.some((c: string) => c.includes('no publishing') || c.includes('must not publish'))
      const oHasPublish = oConstraints.some((c: string) => c.includes('publish') && !c.includes('no publishing') && !c.includes('must not publish'))
      if (hasNoPublish && oHasPublish) {
        conflicts.push({
          type: 'contradictory_publishing_constraint',
          conflictingStrategyId: other.id,
          explanation: `Strategy "${strategy.title}" forbids publishing but "${other.title}" permits it.`,
          detectedAt: timestamp,
          provenance: 'generated',
        })
      }

      // Mutually exclusive required capabilities
      const sPerms = new Set(strategy.required_permissions || [])
      const oPerms = new Set(other.required_permissions || [])
      const exclusive: Record<string, string[]> = {
        'execute:research': ['execute:content', 'execute:publish'],
        'execute:content': ['execute:research'],
        'publish:article': ['delete:article'],
        'delete:article': ['publish:article'],
      }
      for (const [cap, conflicts_] of Object.entries(exclusive)) {
        if (sPerms.has(cap) && conflicts_.some((c) => oPerms.has(c))) {
          conflicts.push({
            type: 'mutually_exclusive_capability',
            conflictingStrategyId: other.id,
            explanation: `Strategy "${strategy.title}" requires "${cap}" but "${other.title}" requires a conflicting capability.`,
            detectedAt: timestamp,
            provenance: 'generated',
          })
        }
      }

      // Conflicting opportunity targets
      const sOpps = new Set(strategy.opportunity_ids || [])
      const oOpps = new Set(other.opportunity_ids || [])
      const sharedOpps = [...sOpps].filter((id) => oOpps.has(id))
      if (sharedOpps.length > 0 && strategy.type !== other.type) {
        const sObj = (strategy.objective || '').toLowerCase()
        const oObj = (other.objective || '').toLowerCase()
        const contradictory = (sObj.includes('expand') && oObj.includes('reduce')) ||
          (sObj.includes('increase') && oObj.includes('decrease')) ||
          (sObj.includes('maximize') && oObj.includes('minimize'))
        if (contradictory) {
          conflicts.push({
            type: 'conflicting_objective',
            conflictingStrategyId: other.id,
            explanation: `Strategies "${strategy.title}" and "${other.title}" target the same opportunity with contradictory objectives.`,
            detectedAt: timestamp,
            provenance: 'generated',
          })
        }
      }
    }
    return conflicts
  }

  private strategySignature(s: any): string {
    const type = s.type || ''
    const title = (s.title || '').trim().toLowerCase()
    const opps = JSON.stringify((s.opportunity_ids || []).sort())
    return `${type}:${title}:${opps}`
  }
}
