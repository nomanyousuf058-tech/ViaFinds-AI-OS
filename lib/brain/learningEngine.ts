import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  BrainLearning,
  BrainContext,
  generateCorrelationId,
  makeCostDecision,
} from './types';

/** Learning Engine - Extracts lessons from outcomes and stores reusable knowledge */
export class LearningEngine {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async learnFromOutcome(
    expected: string,
    actual: string,
    success: boolean,
    context: {
      entityType: 'opportunity' | 'strategy' | 'execution_plan' | 'content' | 'product' | 'experiment';
      entityId: string;
      evidence?: Record<string, any>;
      failureReason?: string;
      experimentId?: string;
      experimentConclusion?: 'SIGNIFICANT_WIN' | 'SIGNIFICANT_LOSS' | 'NO_SIGNIFICANCE' | 'INSUFFICIENT_SAMPLE' | 'ERROR';
      sampleSize?: number;
      variantId?: string;
      metric?: string;
    }
  ): Promise<BrainLearning | null> {
    await makeCostDecision('learn_from_outcome');
    
    const lesson = await this.generateLesson(expected, actual, success, context);
    
    const learning: BrainLearning = {
      id: `learn-${Date.now()}`,
      correlationId: this.correlationId,
      opportunityId: context.entityType === 'opportunity' ? context.entityId : undefined,
      strategyId: context.entityType === 'strategy' ? context.entityId : undefined,
      executionPlanId: context.entityType === 'execution_plan' ? context.entityId : undefined,
      expected,
      actual,
      success,
      evidence: context.evidence || {},
      failureReason: context.failureReason,
      lesson,
      reusable: this.isReusable(lesson, success),
      source: context.entityType as any,
      createdAt: new Date().toISOString(),
    };
    
    // Add experiment-specific fields to evidence for experiment learnings
    if (context.entityType === 'experiment') {
      learning.evidence.experiment = {
        id: context.experimentId,
        conclusion: context.experimentConclusion,
        sampleSize: context.sampleSize,
        variantId: context.variantId,
        metric: context.metric,
      };
    }
    
    const result = await brainRepository.createLearning({
      correlationId: learning.correlationId,
      taskId: context.entityId,
      strategyId: learning.strategyId,
      executionPlanId: learning.executionPlanId,
      expected: learning.expected,
      actual: learning.actual,
      success: learning.success,
      evidence: learning.evidence,
      failureReason: learning.failureReason,
      lesson: learning.lesson,
      reusable: learning.reusable,
      source: learning.source,
    });
    
    if (!result) return null;
    
    return { ...learning, id: result.id };
  }
  
  private async generateLesson(
    expected: string,
    actual: string,
    success: boolean,
    context: any
  ): Promise<string> {
    try {
      const prompt = `
Extract a REUSABLE LESSON from this outcome.

CONTEXT:
- Entity: ${context.entityType} (${context.entityId})
- Expected: ${expected}
- Actual: ${actual}
- Success: ${success}
- Failure Reason: ${context.failureReason || 'N/A'}
- Evidence: ${JSON.stringify(context.evidence || {})}

OUTPUT JSON:
{
  "lesson": "One concise, actionable lesson that can be applied to future similar situations. Focus on WHAT WORKED or WHAT FAILED and WHY. Be specific to ViaFinds business model (editorial + affiliate + owned products)."
}

CONSTRAINTS:
- Lesson must be GENERALIZABLE, not specific to this single case
- Must be ACTIONABLE (can inform future decisions)
- Must reference ViaFinds context (content, affiliate, products, SEO, automation)
- Max 2 sentences
`;
      
      const response = await aiRouter.route({
        systemPrompt: 'You are the ViaFinds Learning Engine. Extract concise, reusable lessons from outcomes. Respond in valid JSON.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.3,
      });
      
      const parsed = JSON.parse(response.content.replace(/```json\n?|\n?```/g, ''));
      return parsed.lesson || this.generateFallbackLesson(expected, actual, success);
    } catch (error) {
      console.error('LearningEngine.generateLesson failed:', error);
      return this.generateFallbackLesson(expected, actual, success);
    }
  }
  
  private generateFallbackLesson(expected: string, actual: string, success: boolean): string {
    if (success) {
      return `SUCCESS: ${expected} achieved. Pattern: ${this.extractPattern(expected)} works for ${this.inferContext(expected)}.`;
    } else {
      return `FAILURE: Expected ${expected} but got ${actual}. Avoid ${this.extractPattern(expected)} for ${this.inferContext(expected)} without stronger validation.`;
    }
  }
  
  private extractPattern(text: string): string {
    const patterns = [
      'content creation',
      'affiliate promotion',
      'product review',
      'SEO optimization',
      'keyword targeting',
      'comparison article',
      'tool integration',
      'email marketing',
    ];
    
    for (const p of patterns) {
      if (text.toLowerCase().includes(p)) return p;
    }
    return 'this approach';
  }
  
  private inferContext(text: string): string {
    if (text.includes('traffic') || text.includes('SEO') || text.includes('keyword')) return 'organic growth';
    if (text.includes('revenue') || text.includes('affiliate') || text.includes('commission')) return 'monetization';
    if (text.includes('conversion') || text.includes('CTR') || text.includes('click')) return 'conversion optimization';
    return 'general operations';
  }
  
  private isReusable(lesson: string, success: boolean): boolean {
    const reusableKeywords = ['pattern', 'works', 'avoid', 'use', 'prefer', 'effective', 'ineffective', 'strategy', 'approach'];
    return reusableKeywords.some(k => lesson.toLowerCase().includes(k));
  }
  
  async getReusableLearnings(context: Partial<BrainContext>, limit = 10): Promise<BrainLearning[]> {
    const results = await brainRepository.listReusableLearnings(limit);
    return results.map(r => ({
      id: r.id as string,
      correlationId: r.correlation_id as string,
      opportunityId: r.opportunity_id as string | undefined,
      strategyId: r.strategy_id as string | undefined,
      executionPlanId: r.execution_plan_id as string | undefined,
      expected: r.expected as string,
      actual: r.actual as string,
      success: r.success as boolean,
      evidence: r.evidence,
      failureReason: r.failure_reason as string | undefined,
      lesson: r.lesson as string,
      reusable: r.reusable as boolean,
      source: r.source as any,
      createdAt: r.created_at as string,
    }));
  }
  
  async getLearningsByEntity(entityType: string, entityId: string): Promise<BrainLearning[]> {
    const allLearnings = await brainRepository.listReusableLearnings(100);
    return allLearnings
      .filter(l => {
        if (entityType === 'opportunity' && l.opportunity_id === entityId) return true;
        if (entityType === 'strategy' && l.strategy_id === entityId) return true;
        if (entityType === 'execution_plan' && l.execution_plan_id === entityId) return true;
        return false;
      })
      .map(r => ({
        id: r.id as string,
        correlationId: r.correlation_id as string,
        opportunityId: r.opportunity_id as string | undefined,
        strategyId: r.strategy_id as string | undefined,
        executionPlanId: r.execution_plan_id as string | undefined,
        expected: r.expected as string,
        actual: r.actual as string,
        success: r.success as boolean,
        evidence: r.evidence,
        failureReason: r.failure_reason as string | undefined,
        lesson: r.lesson as string,
        reusable: r.reusable as boolean,
        source: r.source as any,
        createdAt: r.created_at as string,
      }));
  }
  
  async applyLearnings(newContext: Partial<BrainContext>): Promise<string[]> {
    const learnings = await this.getReusableLearnings(newContext, 20);
    const relevant = learnings.filter(l => this.isRelevant(l, newContext));
    return relevant.map(l => l.lesson);
  }
  
  private isRelevant(learning: BrainLearning, context: Partial<BrainContext>): boolean {
    const contextKeywords: string[] = [];
    if (context.analytics && typeof context.analytics === 'object') {
      contextKeywords.push(...Object.keys(context.analytics as Record<string, unknown>));
    }
    if (context.existing_strategy) {
      contextKeywords.push(context.existing_strategy.type);
    }
    if (context.research) {
      contextKeywords.push(...Object.keys(context.research as Record<string, unknown>));
    }
    
    const lessonLower = learning.lesson.toLowerCase();
    return contextKeywords.some(k => lessonLower.includes(k.toLowerCase()));
  }
  
  async synthesizeGuidance(topic: string): Promise<string> {
    const learnings = await brainRepository.listReusableLearnings(50);
    const relevant = learnings.filter(l => String(l.lesson).toLowerCase().includes(topic.toLowerCase()));
    
    if (relevant.length === 0) {
      return `No specific learnings found for "${topic}". Proceed with standard best practices.`;
    }
    
    const lessons = relevant.slice(0, 5).map(l => `- ${String(l.lesson)}`).join('\n');
    return `RELEVANT LEARNINGS for ${topic}:\n${lessons}\n\nApply these patterns to improve outcomes.`;
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4.2: CONSIDER A REUSABLE LESSON
  //
  // A single clean run is not a lesson. A lesson is only recorded when
  // the execution actually deviated from the happy path AND the
  // deviation generalises. The lesson text is composed from the
  // recorded facts — no model invents the content.
  // ─────────────────────────────────────────────────────────────

  async considerExecutionLearning(input: {
    correlationId: string;
    sourceEvent: string;
    taskId?: string | null;
    strategyId?: string | null;
    executionPlanId?: string | null;
    opportunityId?: string | null;
    articleId?: string | null;
    expected: string;
    actual: string;
    success: boolean;
    evidence: Record<string, any>;
    deviations: string[];
    qualityWarnings?: string[];
    failureReason?: string | null;
  }): Promise<{ persisted: boolean; reason: string; id?: string; lesson?: string }> {
    const deviations = input.deviations.filter(Boolean);
    const warnings = (input.qualityWarnings || []).filter(Boolean);

    if (!input.success) {
      const reason = input.failureReason || 'execution failed without a recorded reason';
      if (reason.length < 20) {
        return { persisted: false, reason: 'Failure has no specific, generalizable cause recorded — nothing to learn' };
      }
      const lesson = `When ${input.sourceEvent} fails with "${reason}", the automation must stop at the failing gate and surface the reason; it must not continue to publication.`;
      const created = await brainRepository.createTraceableLearning({
        correlationId: input.correlationId,
        sourceEvent: input.sourceEvent,
        taskId: input.taskId,
        strategyId: input.strategyId,
        executionPlanId: input.executionPlanId,
        opportunityId: input.opportunityId,
        articleId: input.articleId,
        expected: input.expected,
        actual: input.actual,
        success: false,
        evidence: { ...input.evidence, deviations, qualityWarnings: warnings },
        failureReason: reason,
        lesson,
        confidence: 0.7,
        reusability: 'high',
        reusable: true,
        source: 'execution',
        provenance: 'REAL',
      });
      return created
        ? { persisted: true, reason: 'Failure produced a generalizable constraint', id: created.id, lesson }
        : { persisted: false, reason: 'Failure lesson could not be persisted' };
    }

    if (deviations.length === 0) {
      return {
        persisted: false,
        reason:
          'The execution completed with no deviation, retry, or blocked step. A single uneventful run is not a reusable lesson, so brain_learnings is intentionally left unchanged.',
      };
    }

    const lesson = `For ${input.sourceEvent}, the following deviations occurred and had to be handled before the article could ship: ${deviations.join('; ')}. Plan for these conditions explicitly rather than treating the happy path as the only path.`;
    const created = await brainRepository.createTraceableLearning({
      correlationId: input.correlationId,
      sourceEvent: input.sourceEvent,
      taskId: input.taskId,
      strategyId: input.strategyId,
      executionPlanId: input.executionPlanId,
      opportunityId: input.opportunityId,
      articleId: input.articleId,
      expected: input.expected,
      actual: input.actual,
      success: true,
      evidence: { ...input.evidence, deviations, qualityWarnings: warnings },
      lesson,
      confidence: Math.min(0.9, 0.4 + deviations.length * 0.15),
      reusability: deviations.length >= 2 ? 'high' : 'medium',
      reusable: true,
      source: 'execution',
      provenance: 'REAL',
    });

    return created
      ? { persisted: true, reason: `${deviations.length} deviation(s) produced a generalizable lesson`, id: created.id, lesson }
      : { persisted: false, reason: 'Lesson could not be persisted' };
  }
}