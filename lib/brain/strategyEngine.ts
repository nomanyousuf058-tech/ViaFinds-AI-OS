import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  BrainStrategy,
  BrainOpportunity,
  BrainContext,
  StructuredObservation,
  OpportunitySource,
  generateCorrelationId,
  makeCostDecision,
} from './types';
import { parseStrictJson, routeJsonWithRetry } from './researchEngine';

/** Strategy Engine - Creates strategies from accepted opportunities */
export class StrategyEngine {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async createStrategy(opportunity: BrainOpportunity): Promise<BrainStrategy | null> {
    await makeCostDecision('create_strategy');

    // Reject UNKNOWN-provenance opportunities — they carry no evidence and
    // cannot support a strategy. Only REAL, TEST, and FIXTURE may proceed.
    const provenance = (opportunity.provenance || '').toUpperCase();
    if (provenance === 'UNKNOWN' || provenance === '') {
      console.warn(
        `StrategyEngine.createStrategy: opportunity ${opportunity.id} has UNKNOWN/empty provenance — refusing to build a strategy from untrusted data.`
      );
      return null;
    }

    if (opportunity.status !== 'accepted' && opportunity.status !== 'evaluated') {
      console.warn(`Opportunity ${opportunity.id} not in accepted/evaluated state: ${opportunity.status}`);
    }
    
    const prompt = this.buildStrategyPrompt(opportunity);
    
    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are the ViaFinds AI Brain Strategy Engine. Create a concrete, actionable strategy from the given opportunity. You must respond in strictly valid JSON.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.3,
      });
      
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      const parsed = JSON.parse(content);
      
      const strategy: BrainStrategy = {
        id: parsed.id || generateCorrelationId().replace('brain-', 'strat-'),
        opportunityId: opportunity.id!,
        title: parsed.title || `Strategy for ${opportunity.title}`,
        description: parsed.description || '',
        businessGoal: parsed.businessGoal || parsed.business_goal || '',
        reason: parsed.reason || '',
        evidence: parsed.evidence || opportunity.structuredObservation,
        targetAudience: parsed.targetAudience || parsed.target_audience,
        searchIntent: parsed.searchIntent || parsed.search_intent,
        proposedAction: parsed.proposedAction || parsed.proposed_action || '',
        requiredCapabilities: parsed.requiredCapabilities || parsed.required_capabilities || [],
        expectedResult: parsed.expectedResult || parsed.expected_result || '',
        risks: parsed.risks || [],
        dependencies: parsed.dependencies || [],
        approvalRequired: parsed.approvalRequired !== false,
        status: 'proposed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const result = await brainRepository.createStrategyPhase4({
        opportunityId: opportunity.id!,
        title: strategy.title,
        description: strategy.description,
        businessGoal: strategy.businessGoal,
        reason: strategy.reason,
        evidence: strategy.evidence,
        targetAudience: strategy.targetAudience,
        searchIntent: strategy.searchIntent,
        proposedAction: strategy.proposedAction,
        requiredCapabilities: strategy.requiredCapabilities,
        expectedResult: strategy.expectedResult,
        risks: strategy.risks,
        dependencies: strategy.dependencies,
        approvalRequired: strategy.approvalRequired,
        status: strategy.status,
      });
      
      if (!result) return null;
      
      await brainRepository.updateOpportunity(opportunity.id!, { 
        status: 'strategy_created', 
        strategyId: result.id 
      });
      
      return { ...strategy, id: result.id };
    } catch (error) {
      console.error('StrategyEngine.createStrategy failed:', error);
      throw error;
    }
  }
  
  private buildStrategyPrompt(opportunity: BrainOpportunity): string {
    return `
Create a concrete, actionable STRATEGY from this opportunity.

OPPORTUNITY:
- Title: ${opportunity.title}
- Category: ${opportunity.category}
- Description: ${opportunity.description}
- Observed Fact: ${opportunity.structuredObservation.observedFact}
- External Evidence: ${opportunity.structuredObservation.externalEvidence}
- Brain Inference: ${opportunity.structuredObservation.brainInference}
- Recommendation: ${opportunity.structuredObservation.recommendation}
- Evaluation: ${JSON.stringify(opportunity.evaluation, null, 2)}
- Source: ${JSON.stringify(opportunity.source, null, 2)}
- Brain Reasoning: ${opportunity.brainReasoning}

VIAFINDS BUSINESS MODEL:
Editorial content + affiliate monetization + owned digital products.
Primary channels: SEO-optimized articles, product reviews, comparisons, guides.

OUTPUT JSON:
{
  "title": "Specific strategy title",
  "description": "What this strategy does",
  "businessGoal": "Revenue/traffic/authority goal",
  "reason": "Why this strategy addresses the opportunity",
  "evidence": { ... },
  "targetAudience": "Who this targets",
  "searchIntent": "informational|commercial|transactional|navigational",
  "proposedAction": "Concrete action (e.g., create comparison article, integrate partner API, build product)",
  "requiredCapabilities": ["capability1", "capability2"],
  "expectedResult": "Measurable outcome",
  "risks": ["risk1", "risk2"],
  "dependencies": ["dependency1"],
  "approvalRequired": true
}

CONSTRAINTS:
- Strategy must be EXECUTABLE via existing Automation pipeline.
- Must reference existing ViaFinds capabilities (content, products, automation).
- Must specify REQUIRED CAPABILITIES that map to existing systems.
- Must have clear EXPECTED RESULT (measurable).
- Approval required for EXECUTE/MODIFY/PUBLISH actions.
`;
  }
  
  async getStrategy(strategyId: string): Promise<BrainStrategy | null> {
    const result = await brainRepository.getStrategyById(strategyId);
    if (!result) return null;
    
    return result;
  }
  
  async listStrategies(): Promise<BrainStrategy[]> {
    return brainRepository.listStrategies();
  }
  
  async approveStrategy(strategyId: string): Promise<boolean> {
    return brainRepository.updateStrategy(strategyId, { status: 'approved' });
  }
  
  async rejectStrategy(strategyId: string, reason: string): Promise<boolean> {
    await brainRepository.createLearning({
      correlationId: this.correlationId,
      strategyId,
      expected: 'Strategy would be viable',
      actual: `Strategy rejected: ${reason}`,
      success: false,
      evidence: { strategyId, reason },
      failureReason: reason,
      lesson: `Strategy rejected: ${reason}`,
      reusable: true,
      source: 'strategy',
    });
    
    return brainRepository.updateStrategy(strategyId, { status: 'rejected' });
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4.2: STRATEGY GROUNDED IN A REAL OPPORTUNITY
  // ─────────────────────────────────────────────────────────────

  async createStrategyFromOpportunity(
    opportunityId: string,
    sources: Array<{
      source_id: string;
      title: string;
      url: string;
      snippet: string;
      provider: string;
      retrieved_at: string;
    }>
  ): Promise<{ id: string; warnings: string[] } | null> {
    const opportunity = await brainRepository.getTraceableOpportunity(opportunityId);
    if (!opportunity) {
      throw new Error(`BLOCKED: opportunity ${opportunityId} does not exist in the database`);
    }

    const declaredSourceIds: string[] = Array.isArray(opportunity.source_ids)
      ? (opportunity.source_ids as string[])
      : [];

    if (declaredSourceIds.length === 0) {
      throw new Error(
        `BLOCKED: opportunity ${opportunityId} carries no source records. A strategy cannot be built on an unevidenced opportunity.`
      );
    }

    const sourceById = new Map(sources.map((s) => [s.source_id, s]));
    const availableSourceIds = declaredSourceIds.filter((id) => sourceById.has(id));
    if (availableSourceIds.length === 0) {
      throw new Error(
        `BLOCKED: none of the opportunity's declared source records could be loaded, so the strategy would rest on unverified material.`
      );
    }

    const usableSources = availableSourceIds.map((id) => sourceById.get(id)!);
    const warnings: string[] = [];
    if (availableSourceIds.length !== declaredSourceIds.length) {
      warnings.push(
        `${declaredSourceIds.length - availableSourceIds.length} declared source record(s) could not be loaded and were excluded.`
      );
    }

    const prompt = this.buildGroundedStrategyPrompt(opportunity, usableSources);

    const parsed = await routeJsonWithRetry<{
      title?: string;
      description?: string;
      businessGoal?: string;
      reason?: string;
      proposedAction?: string;
      contentApproach?: string;
      expectedResult?: string;
      targetAudience?: string;
      searchIntent?: string;
      requiredCapabilities?: string[];
      executionRequirements?: unknown[];
      risks?: string[];
      dependencies?: string[];
      evidence?: Array<{ statement?: string; source_id?: string }>;
    }>({
      systemPrompt:
        'You are the ViaFinds AI Brain Strategy Engine. You respond in strictly valid JSON. ' +
        'You may only cite source_id values supplied to you. Any claim you cannot trace to a supplied source is a stated assumption, not a fact.',
      userPrompt: prompt,
      temperature: 0.2,
    });

    const title = (parsed.title || '').trim();
    if (!title) throw new Error('BLOCKED: strategy title was empty');

    const proposedAction = (parsed.proposedAction || '').trim();
    if (!proposedAction) {
      throw new Error('BLOCKED: strategy has no proposed action, so nothing can be executed from it');
    }

    const invalidCitations = (parsed.evidence || []).filter(
      (e) => e.source_id && !sourceById.has(e.source_id)
    );
    if (invalidCitations.length > 0) {
      warnings.push(
        `${invalidCitations.length} strategy evidence citation(s) referenced a source_id outside the opportunity's source set and were dropped.`
      );
    }

    const evidence = (parsed.evidence || [])
      .filter((e) => (e.statement || '').trim() && (!e.source_id || sourceById.has(e.source_id)))
      .map((e) => ({
        statement: (e.statement || '').trim(),
        source_id: e.source_id || null,
      }));

    if (evidence.length === 0) {
      throw new Error('BLOCKED: strategy produced no traceable evidence statements');
    }

    const created = await brainRepository.createTraceableStrategy({
      opportunityId,
      title,
      description: (parsed.description || '').trim(),
      businessGoal: (parsed.businessGoal || '').trim(),
      reason: (parsed.reason || '').trim(),
      evidence: {
        strategy_evidence: evidence,
        opportunity_external_evidence: (opportunity.structured_observation as any)?.external_evidence || [],
        source_ids: availableSourceIds,
      },
      risks: (parsed.risks || []).map((r) => String(r).trim()).filter(Boolean),
      dependencies: (parsed.dependencies || []).map((d) => String(d).trim()).filter(Boolean),
      contentApproach: (parsed.contentApproach || '').trim(),
      executionRequirements: parsed.executionRequirements || [],
      proposedAction,
      expectedResult: (parsed.expectedResult || '').trim(),
      requiredCapabilities: (parsed.requiredCapabilities || []).map((c) => String(c).trim()).filter(Boolean),
      targetAudience: (parsed.targetAudience || '').trim() || null,
      searchIntent: (parsed.searchIntent || '').trim() || null,
      sourceIds: availableSourceIds,
      correlationId: this.correlationId,
      approvalRequired: true,
      status: 'proposed',
      provenance: 'REAL',
    });

    if (!created) return null;

    await brainRepository.updateOpportunity(opportunityId, {
      status: 'strategy_created',
      strategyId: created.id,
    });

    return { id: created.id, warnings };
  }

  private buildGroundedStrategyPrompt(
    opportunity: Record<string, unknown>,
    sources: Array<{ source_id: string; title: string; url: string; snippet: string; provider: string; retrieved_at: string }>
  ): string {
    const observation = (opportunity.structured_observation as any) || {};
    const render = (items: any[]) =>
      (items || [])
        .map((item, i) => `${i + 1}. ${item.claim || item.statement || item.action || JSON.stringify(item)}`)
        .join('\n');

    return `
Build ONE concrete, executable strategy from the opportunity below.

OPPORTUNITY (persisted, id=${opportunity.id})
  title: ${opportunity.title}
  category: ${opportunity.category || opportunity.type}
  description: ${opportunity.description}
  business reasoning: ${opportunity.brain_reasoning}
  recommended action: ${opportunity.recommended_action}

EXTERNAL EVIDENCE (already verified against persisted sources):
${render(observation.external_evidence)}

BRAIN INFERENCE (judgements, not external facts):
${render(observation.brain_inference)}

RECOMMENDATION FROM DETECTION:
${render(observation.recommendation)}

STATED ASSUMPTIONS:
${render(observation.assumptions)}

PERMITTED SOURCES (cite only these source_id values):
${sources
  .map(
    (s) =>
      `- ${s.source_id} | ${s.title}\n    ${s.url}\n    excerpt: ${s.snippet || '(none)'}`
  )
  .join('\n')}

VIAFINDS BUSINESS MODEL:
Editorial comparison/review content monetized by affiliate offers, plus owned digital products.
Niche: digital products, SaaS, AI tools, creator and business software.

OUTPUT STRICT JSON:
{
  "title": "strategy title",
  "description": "what the strategy does",
  "businessGoal": "the business outcome this serves",
  "reason": "why this strategy addresses THIS opportunity",
  "proposedAction": "one concrete action the existing automation pipeline can execute (produce an article/comparison on a specific subject)",
  "contentApproach": "article format, angle, structure, and section outline",
  "expectedResult": "measurable, non-fabricated expectation (describe the observable, not an invented metric)",
  "targetAudience": "who this serves",
  "searchIntent": "informational|commercial|transactional|navigational",
  "requiredCapabilities": ["existing platform capability names only"],
  "executionRequirements": [
    { "requirement": "...", "satisfiedBy": "existing component or external provider", "blocking": true|false }
  ],
  "risks": ["risk"],
  "dependencies": ["dependency"],
  "evidence": [
    { "statement": "how this source supports the strategy", "source_id": "src_..." }
  ]
}

HARD RULES:
1. "proposedAction" must be executable by the EXISTING automation pipeline (content generation from real research). Do not invent new engines.
2. Every "evidence" entry must cite one of the permitted source_id values.
3. "expectedResult" must describe something observable on the live site. Do NOT state invented traffic, revenue or conversion numbers.
4. Output JSON only.
`;
  }
}