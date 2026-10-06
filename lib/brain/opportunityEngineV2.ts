import { BrainRepository } from '../db/repositories/brain'
import { EvidenceConfidenceModel, EvidenceFreshness } from './strategyEngineV2'

export type OpportunityType =
  | 'CONTENT_OPPORTUNITY' | 'PRODUCT_OPPORTUNITY' | 'RESEARCH_OPPORTUNITY'
  | 'MONETIZATION_OPPORTUNITY' | 'TRAFFIC_OPPORTUNITY' | 'CONVERSION_OPPORTUNITY'
  | 'AFFILIATE_OPPORTUNITY' | 'INTERNAL_LINKING_OPPORTUNITY'
  | 'TECHNOLOGY_OPPORTUNITY' | 'BUSINESS_MODEL_OPPORTUNITY'

export type OpportunityStatus =
  | 'DISCOVERED' | 'VALIDATING' | 'SUPPORTED' | 'PROPOSED' | 'APPROVED'
  | 'EXECUTING' | 'OBSERVING' | 'COMPLETED' | 'REJECTED' | 'EXPIRED'
  | 'BLOCKED' | 'UNKNOWN'

export type ProvenanceEvidenceType =
  | 'EXTERNAL_SOURCE'
  | 'INTERNAL_OBSERVATION'
  | 'PRODUCT_PROVIDER'
  | 'RESEARCH_RUN'
  | 'BRAIN_INFERENCE_ONLY'

export type ProductAvailability =
  | 'VERIFIED'
  | 'UNAVAILABLE'
  | 'NOT_VERIFIED'
  | 'UNKNOWN'
  | 'DIGISTORE_CREDENTIALS_MISSING'
  | 'PRODUCT_NOT_FOUND'

export interface OpportunityV2 {
  id?: string; title: string; description: string; objective?: string
  opportunity_type: OpportunityType; status: OpportunityStatus
  provenance: string; provenance_evidence_type?: ProvenanceEvidenceType
  evidence_strength: string; confidence?: number
  evidence_refs: any[]; source_ids: string[]; research_ids: string[]
  article_ids: string[]; product_ids: string[]; strategy_ids: string[]
  decision_ids: string[]; observed_signals: any[]; assumptions: any[]
  unknowns: any[]; unavailable_data: any[]; constraints: any[]
  risks: any[]; potential_actions: any[]; success_conditions: any[]
  failure_conditions: any[]; freshness: any; deduplication_key?: string
  parent_opportunity_id?: string | null; version: number
  product_availability: ProductAvailability; validation_status?: string; conflict_flags?: any[]
  created_at?: string; updated_at?: string
}

export class OpportunityEngineV2 {
  private brainRepo: BrainRepository
  constructor(brainRepo?: BrainRepository) { this.brainRepo = brainRepo || new BrainRepository() }

  async discoverAndValidate(context: {
    snapshot?: any; researchRuns?: any[]; learnings?: any[]
    existingOpportunities?: any[]; existingStrategies?: any[]
    decisions?: any[]; articles?: any[]; products?: any[]
    constraints?: any[]
  }): Promise<OpportunityV2[]> {
    const candidates: OpportunityV2[] = []
    const snapshot = context.snapshot
    const researchRuns = context.researchRuns || []
    const learnings = context.learnings || []
    const existing = context.existingOpportunities || []
    candidates.push(...this.discoverContentOpportunities(snapshot, researchRuns, learnings, context.articles || []))
    candidates.push(...this.discoverResearchOpportunities(snapshot, researchRuns, learnings))
    candidates.push(...this.discoverSensorOpportunities(snapshot, learnings))
    const validated = await this.validateOpportunities(candidates, existing, context.existingStrategies || [], context.decisions || [])
    return this.deduplicateOpportunities(validated, existing)
  }

  private discoverContentOpportunities(snapshot: any, researchRuns: any[], learnings: any[], articles: any[]): OpportunityV2[] {
    const result: OpportunityV2[] = []
    const unavailableData: any[] = []
    let criticalUnavailable = false
    const sensors = snapshot?.sensors || {}
    if (sensors.traffic === 'UNAVAILABLE') { unavailableData.push('Traffic measurement is unavailable.'); criticalUnavailable = true }
    if (sensors.affiliateConversions === 'UNAVAILABLE') { unavailableData.push('Conversion measurement is unavailable.'); criticalUnavailable = true }
    if (sensors.revenue === 'UNAVAILABLE') { unavailableData.push('Revenue measurement is unavailable.'); criticalUnavailable = true }

    const existingTitles = new Set((articles || []).map((a: any) => (a.title || '').toLowerCase().trim()))
    const coveredTopics = new Set<string>()
    for (const r of researchRuns) {
      const topic = (r.query || '').toLowerCase().trim()
      if (topic && !coveredTopics.has(topic)) {
        coveredTopics.add(topic)
        if (!existingTitles.has(topic)) {
          const sourceIds: string[] = Array.isArray(r.sources) ? r.sources.map((s: any) => s.source_id).filter(Boolean) : []
          const evidence: any[] = []
          const evidenceRefs: any[] = []
          if (sourceIds.length > 0) {
            evidence.push({ type: 'research_signal', description: `Research run "${r.query}" produced ${sourceIds.length} persisted source record(s).` })
            sourceIds.forEach((id) => evidenceRefs.push({ sourceId: id, type: 'research_source' }))
          }
          const freshness = this.assessFreshness({ created_at: r.created_at })
          const confidence = sourceIds.length > 0
            ? EvidenceConfidenceModel.compute({
              sourceCount: sourceIds.length, sourceAuthority: 1.0, freshness,
              completeness: 1.0, provenanceQuality: 1.0, consistency: 1.0,
              relevance: 1.0, criticalUnavailable,
            })
            : 0.1
          const strength = EvidenceConfidenceModel.strengthFromConfidence(confidence)
          const successConditions = [
            'Article covering the research topic is published with persisted lineage',
            criticalUnavailable ? 'Affiliate click sensor becomes active (business outcome NOT_VERIFIABLE)' : 'Observed affiliate clicks increase from baseline',
          ]
          const failureConditions = [
            'Research sources become inaccessible',
            criticalUnavailable ? 'Business outcome remains NOT_VERIFIABLE' : '',
          ].filter(Boolean)
          result.push({
            title: `Content opportunity: ${r.query}`,
            description: `Research evidence supports content around "${r.query}". Existing coverage: ${existingTitles.has(topic) ? 'yes' : 'no'}.`,
            opportunity_type: 'CONTENT_OPPORTUNITY',
            status: strength === 'INSUFFICIENT_EVIDENCE' ? 'VALIDATING' : 'SUPPORTED',
            provenance: sourceIds.length > 0 ? 'REAL' : 'UNKNOWN',
            provenance_evidence_type: sourceIds.length > 0 ? 'RESEARCH_RUN' : 'BRAIN_INFERENCE_ONLY',
            evidence_strength: strength,
            confidence,
            evidence_refs: evidenceRefs,
            source_ids: sourceIds,
            research_ids: [r.research_id || r.id].filter(Boolean),
            article_ids: [], product_ids: [], strategy_ids: [], decision_ids: [],
            observed_signals: evidence,
            assumptions: ['Existing automation pipeline can produce the article'],
            unknowns: sourceIds.length === 0 ? ['No persisted source records for this research run'] : [],
            unavailable_data: unavailableData,
            constraints: ['Free-first', 'Must pass quality gate'],
            risks: ['Execution cost', 'Content must pass pre-publication quality gate'],
            potential_actions: [{ action: 'create_article', description: `Produce an article covering "${r.query}"` }],
            success_conditions: successConditions,
            failure_conditions: failureConditions,
            freshness: { generatedAt: new Date().toISOString(), sourceFreshness: freshness },
            deduplication_key: this.buildDedupKey('CONTENT_OPPORTUNITY', r.query, sourceIds),
            parent_opportunity_id: null,
            version: 1,
            product_availability: 'UNKNOWN',
            validation_status: strength === 'INSUFFICIENT_EVIDENCE' ? 'INSUFFICIENT_EVIDENCE' : 'VALIDATED',
          })
        }
      }
    }
    return result
  }

  private discoverResearchOpportunities(snapshot: any, researchRuns: any[], learnings: any[]): OpportunityV2[] {
    if (researchRuns.length === 0) return []
    const unavailableData: any[] = []
    let criticalUnavailable = false
    const sensors = snapshot?.sensors || {}
    if (sensors.traffic === 'UNAVAILABLE') { unavailableData.push('Traffic measurement is unavailable.'); criticalUnavailable = true }
    const sourceIds: string[] = researchRuns.flatMap((r: any) => Array.isArray(r.sources) ? r.sources.map((s: any) => s.source_id).filter(Boolean) : [])
    const uniqueSourceIds = Array.from(new Set(sourceIds))
    const freshness = this.assessFreshness({ created_at: researchRuns[0]?.created_at })
    const confidence = EvidenceConfidenceModel.compute({
      sourceCount: uniqueSourceIds.length, sourceAuthority: 1.0, freshness,
      completeness: 0.7, provenanceQuality: 1.0, consistency: 1.0,
      relevance: 1.0, criticalUnavailable,
    })
    const strength = EvidenceConfidenceModel.strengthFromConfidence(confidence)
    return [{
      title: 'Sustained research coverage for verified topics',
      description: `${researchRuns.length} research run(s) with ${uniqueSourceIds.length} persisted source(s) support continued research coverage.`,
      opportunity_type: 'RESEARCH_OPPORTUNITY',
      status: strength === 'INSUFFICIENT_EVIDENCE' ? 'VALIDATING' : 'SUPPORTED',
      provenance: uniqueSourceIds.length > 0 ? 'REAL' : 'UNKNOWN',
      evidence_strength: strength,
      confidence,
      evidence_refs: uniqueSourceIds.map((id: string) => ({ sourceId: id, type: 'research_source' })),
      source_ids: uniqueSourceIds,
      research_ids: researchRuns.map((r: any) => r.research_id || r.id).filter(Boolean),
      article_ids: [], product_ids: [], strategy_ids: [], decision_ids: [],
      observed_signals: [{ type: 'research_pipeline', description: `${researchRuns.length} research run(s) available` }],
      assumptions: ['Research sources remain accessible'],
      unknowns: uniqueSourceIds.length === 0 ? ['No persisted source records'] : [],
      unavailable_data: unavailableData,
      constraints: ['Free-first'],
      risks: ['Research sources may become stale'],
      potential_actions: [{ action: 'run_research', description: 'Continue research on active topics' }],
      success_conditions: ['Research refreshed for active topics', criticalUnavailable ? 'Traffic sensor becomes active (NOT_VERIFIABLE)' : 'Observed traffic confirms relevance'],
      failure_conditions: ['Research sources become inaccessible', criticalUnavailable ? 'Business outcome NOT_VERIFIABLE' : ''].filter(Boolean),
      freshness: { generatedAt: new Date().toISOString(), sourceFreshness: freshness },
      deduplication_key: this.buildDedupKey('RESEARCH_OPPORTUNITY', 'sustained-research', uniqueSourceIds),
      parent_opportunity_id: null,
      version: 1,
      product_availability: 'UNKNOWN',
      validation_status: strength === 'INSUFFICIENT_EVIDENCE' ? 'INSUFFICIENT_EVIDENCE' : 'VALIDATED',
    }]
  }

  private discoverSensorOpportunities(snapshot: any, learnings: any[]): OpportunityV2[] {
    const result: OpportunityV2[] = []
    const sensors = snapshot?.sensors || {}
    const evidence: any[] = []
    const unavailableData: any[] = []
    const assumptions: any[] = []
    const unknowns: any[] = []

    if (sensors.traffic === 'UNAVAILABLE') {
      unavailableData.push('Traffic measurement is unavailable.')
      evidence.push({ type: 'measurement_gap', description: 'Traffic sensor is inactive.' })
      assumptions.push({ assumption: 'Traffic measurement would be valuable once enabled', why_needed: 'Required for traffic-based decisions', risk_if_wrong: 'Traffic strategy would be unfounded' })
    }
    if (sensors.affiliateConversions === 'UNAVAILABLE') {
      unavailableData.push('Conversion measurement is unavailable.')
      evidence.push({ type: 'measurement_gap', description: 'Conversion sensor is inactive.' })
      assumptions.push({ assumption: 'Conversion tracking would be valuable once enabled', why_needed: 'Required for conversion decisions', risk_if_wrong: 'Conversion strategy would be unfounded' })
    }
    if (sensors.revenue === 'UNAVAILABLE') {
      unavailableData.push('Revenue measurement is unavailable.')
      evidence.push({ type: 'measurement_gap', description: 'Revenue ledger is inactive.' })
      assumptions.push({ assumption: 'Revenue attribution would be valuable once enabled', why_needed: 'Required for revenue decisions', risk_if_wrong: 'Revenue strategy would be unfounded' })
    }

    if (evidence.length === 0) return []

    const confidence = EvidenceConfidenceModel.compute({
      sourceCount: evidence.length, sourceAuthority: 0.5, freshness: 'UNKNOWN_FRESHNESS',
      completeness: 0.3, provenanceQuality: 1.0, consistency: 1.0,
      relevance: 1.0, criticalUnavailable: true,
    })
    const strength = EvidenceConfidenceModel.strengthFromConfidence(confidence)
    const successConditions = evidence.map((e: any) => `${e.description} → sensor becomes active`)
    result.push({
      title: 'Enable verified measurement infrastructure',
      description: `${evidence.length} measurement sensor(s) are unavailable. Enabling them is required for evidence-based decisions.`,
      opportunity_type: 'MONETIZATION_OPPORTUNITY',
status: 'PROPOSED',
      provenance: 'REAL',
      provenance_evidence_type: 'INTERNAL_OBSERVATION',
      evidence_strength: strength,
      confidence,
      evidence_refs: [],
      source_ids: [],
      research_ids: [],
      article_ids: [], product_ids: [], strategy_ids: [], decision_ids: [],
      observed_signals: evidence,
      assumptions,
      unknowns,
      unavailable_data: unavailableData,
      constraints: ['Free-first', 'Requires integration configuration'],
      risks: ['Integration may require credentials', 'Measurement gaps persist without action'],
      potential_actions: [{ action: 'configure_integration', description: 'Enable the inactive measurement sensor(s)' }],
      success_conditions: successConditions,
      failure_conditions: ['Required integration remains unavailable'],
      freshness: { generatedAt: new Date().toISOString(), sourceFreshness: 'UNKNOWN_FRESHNESS' },
      deduplication_key: this.buildDedupKey('MONETIZATION_OPPORTUNITY', 'measurement-infrastructure', []),
      parent_opportunity_id: null,
      version: 1,
      product_availability: 'UNAVAILABLE',
      validation_status: 'VALIDATED',
    })
    return result
  }

  private async validateOpportunities(candidates: OpportunityV2[], existing: any[], strategies: any[], decisions: any[]): Promise<OpportunityV2[]> {
    const validated: OpportunityV2[] = []
    for (const opp of candidates) {
      const conflicts = this.detectOpportunityConflicts(opp, [...existing, ...strategies])
      const enriched: OpportunityV2 = {
        ...opp,
        conflict_flags: conflicts,
        validation_status: conflicts.length > 0 ? 'CONFLICT_DETECTED' : (opp.validation_status || 'VALIDATED'),
      }
      validated.push(enriched)
    }
    return validated
  }

  private deduplicateOpportunities(candidates: OpportunityV2[], existing: any[]): OpportunityV2[] {
    const seen = new Set<string>()
    const existingKeys = new Set((existing || []).map((o: any) => o.deduplication_key).filter(Boolean))
    const result: OpportunityV2[] = []
    for (const c of candidates) {
      const key = c.deduplication_key || this.strategySignature(c)
      if (seen.has(key) || existingKeys.has(key)) continue
      seen.add(key)
      result.push(c)
    }
return result
    }

    private strategySignature(s: any): string {
      const type = s.opportunity_type || s.type || ''
      const title = (s.title || '').trim().toLowerCase()
      return `${type}:${title}`
    }

    private assessFreshness(record: any): EvidenceFreshness {
    const createdAt = record?.created_at || record?.createdAt
    if (!createdAt) return 'UNKNOWN_FRESHNESS'
    const created = new Date(createdAt).getTime()
    if (isNaN(created)) return 'UNKNOWN_FRESHNESS'
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24)
    return ageDays <= 30 ? 'FRESH' : 'STALE'
  }

  private buildDedupKey(type: string, topic: string, sourceIds: string[]): string {
    const normalized = (topic || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const sorted = Array.from(new Set(sourceIds)).sort().join(',')
    return `${type}:${normalized}:${sorted}`
  }

  private deriveOpportunityProvenance(input: {
    sourceIds?: string[]; researchId?: string; internalObservation?: boolean
    productProviderEvidence?: boolean; inferenceOnly?: boolean
  }): { provenance: string; evidenceType: ProvenanceEvidenceType } {
    const { sourceIds, researchId, internalObservation, productProviderEvidence, inferenceOnly } = input
    if (inferenceOnly) {
      return { provenance: 'UNKNOWN', evidenceType: 'BRAIN_INFERENCE_ONLY' }
    }
    if (productProviderEvidence) {
      return { provenance: 'REAL', evidenceType: 'PRODUCT_PROVIDER' }
    }
    if (internalObservation) {
      return { provenance: 'REAL', evidenceType: 'INTERNAL_OBSERVATION' }
    }
    const ids = (sourceIds || []).filter(Boolean)
    if (ids.length > 0) {
      return { provenance: 'REAL', evidenceType: researchId ? 'RESEARCH_RUN' : 'EXTERNAL_SOURCE' }
    }
    return { provenance: 'UNKNOWN', evidenceType: 'BRAIN_INFERENCE_ONLY' }
  }

  private buildVersionedOpportunity(opp: OpportunityV2, existing: any[]): OpportunityV2 {
    const key = opp.deduplication_key || this.strategySignature(opp)
    const existingVersion = (existing || []).find((o: any) => o.deduplication_key === key)
    if (existingVersion && existingVersion.id !== opp.id) {
      const materialChange = this.hasMaterialChange(opp, existingVersion)
      if (materialChange) {
        return {
          ...opp,
          parent_opportunity_id: existingVersion.id,
          version: (existingVersion.version || 1) + 1,
        }
      }
    }
    return { ...opp, parent_opportunity_id: null, version: 1 }
  }

  private hasMaterialChange(candidate: OpportunityV2, existing: any): boolean {
    const fields: Array<keyof OpportunityV2> = [
      'evidence_strength', 'provenance', 'product_availability', 'validation_status',
    ]
    return fields.some((f) => (candidate as any)[f] !== (existing as any)[f])
  }

  
  private detectOpportunityConflicts(opp: OpportunityV2, others: any[]): any[] {
    const conflicts: any[] = []
    const timestamp = new Date().toISOString()
    for (const other of others) {
      if (!other || other.id === opp.id) continue
      const oConstraints = (other.constraints || []).map((c: string) => c.toLowerCase())
      const oActions = (other.potential_actions || []).map((a: any) => a.action)
      const myActions = (opp.potential_actions || []).map((a: any) => a.action)
      const exclusive: Record<string, string[]> = {
        'configure_integration': ['delete_content'],
        'create_article': ['delete_content'],
        'delete_content': ['create_article', 'configure_integration'],
      }
      for (const [action, conflicts_] of Object.entries(exclusive)) {
        if (myActions.includes(action) && conflicts_.some((c) => oActions.includes(c))) {
          conflicts.push({ type: 'incompatible_capability', conflictingId: other.id, explanation: `Opportunity "${opp.title}" proposes "${action}" but "${other.title}" proposes a conflicting action.`, detectedAt: timestamp, provenance: 'generated' })
        }
      }
      const hasNoPublish = (opp.constraints || []).some((c: string) => c.toLowerCase().includes('no publishing') || c.toLowerCase().includes('must not publish'))
      const oHasPublish = oConstraints.some((c: string) => c.includes('publish') && !c.includes('no publishing') && !c.includes('must not publish'))
      if (hasNoPublish && oHasPublish) {
        conflicts.push({ type: 'contradictory_constraint', conflictingId: other.id, explanation: `Opportunity "${opp.title}" forbids publishing but "${other.title}" permits it.`, detectedAt: timestamp, provenance: 'generated' })
      }
      const oTitle = (other.title || '').toLowerCase()
      const myObj = (opp.description || '').toLowerCase()
      const oObj = (other.description || '').toLowerCase()
      if ((myObj.includes('expand') && oObj.includes('reduce')) || (myObj.includes('increase') && oObj.includes('decrease')) || (myObj.includes('maximize') && oObj.includes('minimize'))) {
        conflicts.push({ type: 'contradictory_objective', conflictingId: other.id, explanation: `Opportunities "${opp.title}" and "${other.title}" have contradictory objectives.`, detectedAt: timestamp, provenance: 'generated' })
      }
      const myEv = (opp.evidence_strength || '').toUpperCase()
      const oEv = (other.evidence_strength || '').toUpperCase()
      if ((myEv === 'STRONGLY_SUPPORTED' && oEv === 'INSUFFICIENT_EVIDENCE') || (myEv === 'INSUFFICIENT_EVIDENCE' && oEv === 'STRONGLY_SUPPORTED')) {
        conflicts.push({ type: 'contradictory_evidence', conflictingId: other.id, explanation: `Opportunities "${opp.title}" and "${other.title}" have contradictory evidence strength.`, detectedAt: timestamp, provenance: 'generated' })
      }
    }
    return conflicts
  }
}



