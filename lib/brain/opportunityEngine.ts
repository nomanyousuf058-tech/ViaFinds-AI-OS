import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  BrainOpportunity,
  BrainContext,
  StructuredObservation,
  OpportunityEvaluation,
  OpportunitySource,
  OpportunityCategory,
  BrainLearning,
  CostDecision,
  DEFAULT_PERMISSION_POLICY,
  generateCorrelationId,
  makeCostDecision,
  validatePermission,
} from './types';
import type { RealResearchRun, RealSourceRecord } from './researchEngine';
import { renderSourcesForPrompt, parseStrictJson, routeJsonWithRetry } from './researchEngine';
import { v4 as uuidv4 } from 'uuid';

export interface ExternalEvidenceItem {
  claim: string;
  source_id: string;
  quote: string;
  quote_verified: boolean;
}

export interface InferenceItem {
  statement: string;
  basis_source_ids: string[];
  impact: 'High' | 'Medium' | 'Low';
}

export interface RecommendationItem {
  action: string;
  rationale: string;
  source_ids: string[];
}

export interface AssumptionItem {
  assumption: string;
  why_needed: string;
  risk_if_wrong: string;
}

export interface EvidenceGroundedOpportunity {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string;
  status: string;
  correlationId: string;
  researchId: string;
  sourceIds: string[];
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  impact: 'High' | 'Medium' | 'Low';
  structuredObservation: {
    external_evidence: ExternalEvidenceItem[];
    brain_inference: InferenceItem[];
    recommendation: RecommendationItem[];
    assumptions: AssumptionItem[];
    source_ids: string[];
    missing_information: string[];
  };
  rejected: Array<{ claim: string; reason: string; claimed_source_id?: string }>;
  warnings: string[];
}

/** Opportunity Engine - Core detection logic */
export class OpportunityEngine {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  /** Detect opportunities from research and context */
  async detectOpportunities(
    context: Partial<BrainContext>,
    researchQuery?: string
  ): Promise<BrainOpportunity[]> {
    await makeCostDecision('detect_opportunities');
    
    const prompt = this.buildDetectionPrompt(context, researchQuery);
    
    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are the ViaFinds AI Brain Opportunity Engine. You must respond in strictly valid JSON. Detect real, actionable opportunities from the provided context and research. Every opportunity must have external evidence.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.3,
      });
      
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      const parsed = JSON.parse(content);
      
      const opportunities = this.structureOpportunities(parsed.opportunities || [], context);
      
      for (const opp of opportunities) {
        const created = await brainRepository.createOpportunityPhase4({
          title: opp.title,
          category: opp.category,
          description: opp.description,
          structuredObservation: opp.structuredObservation,
          evaluation: opp.evaluation,
          source: opp.source,
          brainReasoning: opp.brainReasoning,
          status: 'detected',
        });
        // Persisted row id must win: downstream traceability depends on the
        // real database id, not the in-memory uuid.
        if (created?.id) opp.id = created.id as string;
      }
      
      return opportunities;
    } catch (error) {
      console.error('OpportunityEngine.detectOpportunities failed:', error);
      throw error;
    }
  }
  
  private buildDetectionPrompt(context: Partial<BrainContext>, researchQuery?: string): string {
    const categories = [
      'content', 'product', 'seo_search', 'affiliate', 'conversion',
      'technical', 'revenue', 'missing_capability', 'underperforming_capability', 'strategic'
    ].join(', ');
    
    return `
Analyze the following ViaFinds system context and research to detect REAL, ACTIONABLE opportunities.

SYSTEM CONTEXT:
${JSON.stringify(context, null, 2)}

RESEARCH QUERY: ${researchQuery || 'General business intelligence'}

OPPORTUNITY CATEGORIES (use exactly these):
${categories}

For EACH opportunity, you MUST provide:
1. OBSERVED FACT: Raw fact from external/internal source
2. EXTERNAL EVIDENCE: Supporting evidence (URLs, data, quotes)
3. BRAIN INFERENCE: Your deduction from fact + evidence
4. RECOMMENDATION: Actionable next step
5. CATEGORY: One of the categories above
6. EVALUATION: impact/effort/confidence/evidence/dependencies/risks/expectedOutcome
7. SOURCE: {url, title, type, retrievedAt, snippet}

Output JSON:
{
  "opportunities": [
    {
      "title": "Brief title",
      "category": "content|product|seo_search|affiliate|conversion|technical|revenue|missing_capability|underperforming_capability|strategic",
      "description": "Detailed description",
      "structuredObservation": {
        "observedFact": "...",
        "externalEvidence": "...",
        "brainInference": "...",
        "recommendation": "...",
        "confidence": "High|Medium|Low",
        "source": "Brain Analysis"
      },
      "evaluation": {
        "impact": "High|Medium|Low",
        "effort": "High|Medium|Low",
        "confidence": "High|Medium|Low",
        "evidence": ["source1", "source2"],
        "dependencies": [],
        "risks": [],
        "expectedOutcome": "..."
      },
      "source": {
        "url": "https://...",
        "title": "Source title",
        "type": "search|api|database|partner|manual|analytics|trend|competitor|user_feedback|internal",
        "retrievedAt": "2024-...",
        "snippet": "Relevant excerpt"
      },
      "brainReasoning": "Why this is a real opportunity for ViaFinds"
    }
  ]
}

CONSTRAINTS:
- NO fake data. Only use provided context/research.
- Separate FACT from INFERENCE clearly.
- Every opportunity must have EXTERNAL EVIDENCE (not just Brain's opinion).
- Be specific to ViaFinds: editorial content + affiliate + owned digital products.
- If data is missing (e.g. revenue NOT CONNECTED), detect that as an opportunity.
`;
  }
  
  private structureOpportunities(raw: any[], context: Partial<BrainContext>): BrainOpportunity[] {
    return raw.map((o, idx) => {
      const structuredObs: StructuredObservation = {
        observedFact: o.structuredObservation?.observedFact || o.observedFact || '',
        externalEvidence: o.structuredObservation?.externalEvidence || o.externalEvidence || '',
        brainInference: o.structuredObservation?.brainInference || o.brainInference || '',
        recommendation: o.structuredObservation?.recommendation || o.recommendation || '',
        confidence: o.structuredObservation?.confidence || o.confidence || 'Medium',
        source: o.structuredObservation?.source || o.source || 'Brain Analysis',
        sourceMetadata: o.structuredObservation?.sourceMetadata || o.sourceMetadata,
        opportunityCategory: o.category,
      };
      
      const evaluation: OpportunityEvaluation = {
        impact: o.evaluation?.impact || o.impact || 'Medium',
        effort: o.evaluation?.effort || o.effort || 'Medium',
        confidence: o.evaluation?.confidence || o.confidence || 'Medium',
        evidence: o.evaluation?.evidence || o.evidence || [],
        dependencies: o.evaluation?.dependencies || o.dependencies || [],
        risks: o.evaluation?.risks || o.risks || [],
        expectedOutcome: o.evaluation?.expectedOutcome || o.expectedOutcome || '',
      };
      
      const source: OpportunitySource = {
        url: o.source?.url || '',
        title: o.source?.title || '',
        type: o.source?.type || 'internal',
        retrievedAt: o.source?.retrievedAt || new Date().toISOString(),
        snippet: o.source?.snippet,
        relevance: o.source?.relevance,
        confidence: o.source?.confidence,
      };
      
      return {
        id: uuidv4(),
        title: o.title || `Opportunity ${idx + 1}`,
        category: o.category as OpportunityCategory || 'strategic',
        description: o.description || '',
        structuredObservation: structuredObs,
        evaluation,
        source,
        status: 'detected',
        brainReasoning: o.brainReasoning || 'Detected via AI analysis',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }
  
  async evaluateOpportunity(opportunityId: string): Promise<BrainOpportunity | null> {
    const existing = await brainRepository.getOpportunityById(opportunityId);
    if (!existing) return null;
    
    await brainRepository.updateOpportunity(opportunityId, { status: 'evaluated' });
    
    return { ...existing, status: 'evaluated', updatedAt: new Date().toISOString() } as BrainOpportunity;
  }
  
  async acceptOpportunity(opportunityId: string): Promise<boolean> {
    return brainRepository.updateOpportunity(opportunityId, { status: 'accepted' });
  }
  
  async rejectOpportunity(opportunityId: string, reason: string): Promise<boolean> {
    const existing = await brainRepository.getOpportunityById(opportunityId);
    if (!existing) return false;
    
    await brainRepository.createLearning({
      correlationId: this.correlationId,
      expected: `Opportunity ${opportunityId} would be viable`,
      actual: `Opportunity rejected: ${reason}`,
      success: false,
      evidence: { opportunityId, reason },
      failureReason: reason,
      lesson: `Opportunity rejected: ${reason}. May indicate criteria too broad or evidence insufficient.`,
      reusable: true,
      source: 'opportunity',
    });
    
    return brainRepository.updateOpportunity(opportunityId, { status: 'rejected' });
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4.2: EVIDENCE-GROUNDED OPPORTUNITY DETECTION
  //
  // Every external factual claim must resolve to a persisted source
  // record AND to a verbatim quote inside that source. Claims that
  // cannot be verified are demoted to brain inference, never kept as
  // external evidence.
  // ─────────────────────────────────────────────────────────────

  async detectFromResearch(research: RealResearchRun): Promise<EvidenceGroundedOpportunity> {
    if (research.sources.length === 0) {
      throw new Error('detectFromResearch requires at least one persisted source record');
    }

    const sourceById = new Map<string, RealSourceRecord>(research.sources.map((s) => [s.source_id, s]));
    const prompt = this.buildGroundedDetectionPrompt(research);

    const parsed = await routeJsonWithRetry<{
      title?: string;
      category?: string;
      description?: string;
      external_evidence?: Array<{ claim?: string; source_id?: string; quote?: string }>;
      brain_inference?: Array<{ statement?: string; basis_source_ids?: string[]; impact?: string }>;
      recommendation?: Array<{ action?: string; rationale?: string; source_ids?: string[] }>;
      assumptions?: Array<{ assumption?: string; why_needed?: string; risk_if_wrong?: string }>;
    }>({
      systemPrompt:
        'You are the ViaFinds AI Brain Opportunity Engine. You respond in strictly valid JSON. ' +
        'You may ONLY state an external fact when you quote text copied verbatim from a supplied [SOURCE] block, ' +
        'and you must reference that source by its exact source_id. Anything you cannot quote is brain inference, not a fact.',
      userPrompt: prompt,
      temperature: 0.2,
    });

    const rejected: Array<{ claim: string; reason: string; claimed_source_id?: string }> = [];
    const warnings: string[] = [];
    const externalEvidence: ExternalEvidenceItem[] = [];

    for (const item of parsed.external_evidence || []) {
      const claim = (item.claim || '').trim();
      const claimedId = (item.source_id || '').trim();
      const quote = (item.quote || '').trim();

      if (!claim) continue;

      const source = sourceById.get(claimedId);
      if (!source) {
        rejected.push({
          claim,
          claimed_source_id: claimedId || undefined,
          reason: claimedId
            ? `Cited source_id "${claimedId}" is not a persisted source record for this research run`
            : 'Cited no source_id',
        });
        continue;
      }

      if (!quote) {
        rejected.push({ claim, claimed_source_id: claimedId, reason: 'No verbatim quote supplied for an external claim' });
        continue;
      }

      if (!quoteAppearsInSource(quote, source)) {
        rejected.push({
          claim,
          claimed_source_id: claimedId,
          reason: 'Quote does not appear verbatim in the persisted source title/snippet — cannot be external evidence',
        });
        continue;
      }

      externalEvidence.push({ claim, source_id: claimedId, quote, quote_verified: true });
    }

    if (externalEvidence.length === 0) {
      throw new Error(
        'BLOCKED: the model produced zero externally verifiable claims. Every one of its claims cited a ' +
          'non-existent source, supplied no quote, or quoted text absent from the persisted sources. ' +
          'Refusing to create an opportunity whose evidence cannot be traced.'
      );
    }

    const referencedSourceIds = Array.from(new Set(externalEvidence.map((e) => e.source_id)));

    const brainInference: InferenceItem[] = (parsed.brain_inference || [])
      .filter((i) => (i.statement || '').trim())
      .map((i) => ({
        statement: (i.statement || '').trim(),
        basis_source_ids: (i.basis_source_ids || []).filter((id) => sourceById.has(id)),
        impact: normalizeImpact(i.impact),
      }));

    const recommendation: RecommendationItem[] = (parsed.recommendation || [])
      .filter((r) => (r.action || '').trim())
      .map((r) => ({
        action: (r.action || '').trim(),
        rationale: (r.rationale || '').trim(),
        source_ids: (r.source_ids || []).filter((id) => sourceById.has(id)),
      }));

    const assumptions: AssumptionItem[] = (parsed.assumptions || [])
      .filter((a) => (a.assumption || '').trim())
      .map((a) => ({
        assumption: (a.assumption || '').trim(),
        why_needed: (a.why_needed || '').trim(),
        risk_if_wrong: (a.risk_if_wrong || '').trim(),
      }));

    if (brainInference.length === 0) {
      warnings.push('No brain inference was produced; the record is evidence-only.');
    }
    if (assumptions.length === 0) {
      warnings.push('No assumptions were declared; unstated assumptions remain unrecorded.');
    }
    if (recommendation.length === 0) {
      throw new Error('BLOCKED: no actionable recommendation could be derived from the verified evidence.');
    }

    const confidenceScore = computeConfidenceScore(research, referencedSourceIds.length, sourceById);
    const confidence = confidenceScore >= 0.7 ? 'High' : confidenceScore >= 0.45 ? 'Medium' : 'Low';
    const impact = brainInference.some((i) => i.impact === 'High') ? 'High' : brainInference.some((i) => i.impact === 'Medium') ? 'Medium' : 'Low';

    const title = (parsed.title || '').trim();
    if (!title) throw new Error('BLOCKED: opportunity title was empty');

    const category = normalizeCategory(parsed.category);
    const description = (parsed.description || '').trim();

    // `brain_opportunities.risk` is a short level column; the per-assumption risk
    // text is preserved in structured_observation and evaluation.risks.
    const declaredRisks = assumptions.map((a) => a.risk_if_wrong).filter(Boolean);
    const riskLevel =
      declaredRisks.length === 0
        ? 'Unknown'
        : /catastrophic|fatal|permanent loss|regulatory|legal/i.test(declaredRisks.join(' '))
          ? 'High'
          : declaredRisks.length >= 3
            ? 'High'
            : declaredRisks.length === 2
              ? 'Medium'
              : 'Low';
    if (riskLevel === 'Unknown') {
      warnings.push('No risk was stated for any assumption; risk recorded as Unknown.');
    }

    const structuredObservation = {
      external_evidence: externalEvidence,
      brain_inference: brainInference,
      recommendation,
      assumptions,
      source_ids: referencedSourceIds,
      missing_information: research.missing_information,
    };

    const created = await brainRepository.createTraceableOpportunity({
      title,
      type: category,
      category,
      description,
      evidence: {
        external_evidence: externalEvidence,
        source_ids: referencedSourceIds,
        research_id: research.research_id,
        query: research.query,
        retrieved_at: research.sources[0]?.retrieved_at || null,
        providers_used: research.providers_used,
      },
      source: research.sources
        .filter((s) => referencedSourceIds.includes(s.source_id))
        .map((s) => ({ source_id: s.source_id, url: s.url, title: s.title, provider: s.provider, retrieved_at: s.retrieved_at })),
      confidence,
      potentialImpact: impact,
      effort: 'Medium',
      risk: riskLevel,
      recommendedAction: recommendation.map((r) => r.action).join(' | '),
      reasoning: [
        `Derived from ${externalEvidence.length} externally verified claim(s) across ${referencedSourceIds.length} persisted source record(s).`,
        `Research confidence from live provider(s) ${research.providers_used.join(', ')}: ${research.research_confidence}.`,
        `Impact "${impact}" is a brain inference, not an external measurement.`,
      ].join(' '),
      structuredObservation,
      evaluation: {
        impact,
        effort: 'Medium',
        confidence,
        confidence_score: confidenceScore,
        evidence: externalEvidence.map((e) => `${e.source_id}: ${e.claim}`),
        dependencies: assumptions.map((a) => a.why_needed).filter(Boolean),
        risks: assumptions.map((a) => a.risk_if_wrong).filter(Boolean),
        expectedOutcome: recommendation.map((r) => r.action).join(' | '),
      },
      evidenceClassification: structuredObservation,
      assumptions,
      researchId: research.research_id,
      sourceIds: referencedSourceIds,
      correlationId: this.correlationId,
      status: 'detected',
      provenance: 'REAL',
    });

    if (!created) {
      throw new Error('Failed to persist the evidence-grounded opportunity');
    }

    return {
      id: created.id,
      title,
      type: category,
      category,
      description,
      status: 'detected',
      correlationId: this.correlationId,
      researchId: research.research_id,
      sourceIds: referencedSourceIds,
      confidence,
      confidenceScore,
      impact,
      structuredObservation,
      rejected,
      warnings,
    };
  }

  private buildGroundedDetectionPrompt(research: RealResearchRun): string {
    return `
Detect at most ONE genuinely actionable content/business opportunity for ViaFinds from the verified source material below.

RESEARCH QUERY: ${research.query}
PROVIDERS USED: ${research.providers_used.join(', ')}
RESEARCH CONFIDENCE: ${research.research_confidence}
MISSING INFORMATION: ${research.missing_information.join('; ') || 'none reported'}

VERIFIED SOURCES (these are the ONLY sources you may cite):
${renderSourcesForPrompt(research.sources)}

VIAFINDS BUSINESS MODEL:
Editorial comparison/review content that monetizes through affiliate offers, plus owned digital products.
Niche: digital products, SaaS, AI tools, creator/business software.

OUTPUT STRICT JSON:
{
  "title": "concise opportunity title",
  "category": "content|product|seo_search|affiliate|conversion|revenue|strategic",
  "description": "2-3 sentences describing the opportunity",
  "external_evidence": [
    { "claim": "one atomic external fact", "source_id": "exact source_id from above", "quote": "text copied VERBATIM from that source's excerpt or title" }
  ],
  "brain_inference": [
    { "statement": "what this implies for ViaFinds", "basis_source_ids": ["src_..."], "impact": "High|Medium|Low" }
  ],
  "recommendation": [
    { "action": "one concrete, executable next step", "rationale": "why", "source_ids": ["src_..."] }
  ],
  "assumptions": [
    { "assumption": "something taken on faith", "why_needed": "why it is unavoidable", "risk_if_wrong": "consequence" }
  ]
}

HARD RULES:
1. Every "external_evidence" entry MUST quote text that appears verbatim in that source's excerpt or title. If you cannot quote it, it does not go in external_evidence.
2. Never invent a source_id. Only use source_id values listed above.
3. Never state a number, date, price, or ranking as external fact unless it is inside your verbatim quote.
4. Impact, difficulty and value judgements belong in "brain_inference", never in "external_evidence".
5. Output JSON only. No prose, no markdown fences.
`;
  }
}

function normalizeImpact(value: unknown): 'High' | 'Medium' | 'Low' {
  const v = String(value || '').toLowerCase();
  if (v === 'high') return 'High';
  if (v === 'low') return 'Low';
  return 'Medium';
}

function normalizeCategory(value: unknown): OpportunityCategory {
  const allowed: OpportunityCategory[] = [
    'content', 'product', 'seo_search', 'affiliate', 'conversion',
    'technical', 'revenue', 'missing_capability', 'underperforming_capability', 'strategic',
  ];
  const v = String(value || '') as OpportunityCategory;
  return allowed.includes(v) ? v : 'content';
}

/** Deterministic confidence derived from real signals, not from the model's opinion. */
function computeConfidenceScore(
  research: RealResearchRun,
  verifiedClaimCount: number,
  sourceById: Map<string, RealSourceRecord>
): number {
  const baseByResearchConfidence: Record<string, number> = {
    high: 0.55,
    medium: 0.45,
    low: 0.3,
    insufficient: 0.15,
  };
  let score = baseByResearchConfidence[research.research_confidence] ?? 0.3;

  const referenced = research.sources.filter((s) => sourceById.has(s.source_id));
  const authoritative = referenced.filter((s) => (s.authority_signal ?? 0) >= 0.7).length;
  score += Math.min(0.2, authoritative * 0.07);
  score += Math.min(0.15, verifiedClaimCount * 0.03);
  score -= Math.min(0.1, research.missing_information.length * 0.02);

  return Math.max(0.05, Math.min(0.95, Number(score.toFixed(3))));
}

/** True when the quote appears verbatim inside the persisted source text. */
export function quoteAppearsInSource(quote: string, source: RealSourceRecord): boolean {
  const haystack = normalizeForQuoteMatch(`${source.title} ${source.snippet}`);
  const needle = normalizeForQuoteMatch(quote);
  if (needle.length < 12) return false;
  return haystack.includes(needle);
}

function normalizeForQuoteMatch(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}