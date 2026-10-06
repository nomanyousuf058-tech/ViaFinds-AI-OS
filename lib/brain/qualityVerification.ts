import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  QualityResult,
  VerificationResult,
  ExecutionAction,
  BrainExecutionPlan,
  generateCorrelationId,
  makeCostDecision,
} from './types';

/** Quality Gate - Validates content and execution outputs */
export class QualityGate {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async checkContent(
    content: string,
    requirements: Record<string, any>,
    contentType: string
  ): Promise<QualityResult> {
    await makeCostDecision('quality_check_content');
    
    const automatedChecks = this.runAutomatedChecks(content, requirements);
    const aiAssessment = await this.runAIAssessment(content, requirements, contentType);
    
    const passed = automatedChecks.passed && aiAssessment.passed;
    const score = Math.round(((automatedChecks.score || 0) + (aiAssessment.score || 0)) / 2);
    
    const result: QualityResult = {
      checkType: 'content',
      passed,
      score,
      issues: [...(automatedChecks.issues || []), ...(aiAssessment.issues || [])],
      metrics: {
        ...automatedChecks.metrics,
        ...aiAssessment.metrics,
      },
      recommendations: [...(automatedChecks.recommendations || []), ...(aiAssessment.recommendations || [])],
      checkedAt: new Date().toISOString(),
      checkedBy: 'quality_gate',
    };
    
    return result;
  }
  
  async checkExecution(plan: BrainExecutionPlan): Promise<QualityResult> {
    await makeCostDecision('quality_check_execution');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    let passed = true;
    let score = 100;
    
    const actions = plan.actions || [];
    const incompleteActions = actions.filter(a => a.status !== 'completed');
    if (incompleteActions.length > 0) {
      issues.push(`${incompleteActions.length} actions not completed`);
      passed = false;
      score -= 20;
    }
    
    const failedActions = actions.filter(a => a.status === 'failed');
    if (failedActions.length > 0) {
      issues.push(`${failedActions.length} actions failed`);
      passed = false;
      score -= 30;
    }
    
    for (const action of actions) {
      for (const depId of action.dependencies || []) {
        const dep = actions.find(a => a.id === depId);
        if (dep && dep.status !== 'completed') {
          issues.push(`Action ${action.id} ran before dependency ${depId} completed`);
          passed = false;
          score -= 10;
        }
      }
    }
    
    if (plan.estimatedCost && plan.estimatedCost > 10) {
      issues.push(`Plan cost $${plan.estimatedCost} exceeds $10 limit`);
      recommendations.push('Split into smaller plans or optimize costs');
      score -= 15;
    }
    
    return {
      checkType: 'execution',
      passed,
      score: Math.max(0, score),
      issues,
      metrics: {
        totalActions: actions.length,
        completedActions: actions.filter(a => a.status === 'completed').length,
        failedActions: failedActions.length,
        estimatedCost: plan.estimatedCost,
      },
      recommendations,
      checkedAt: new Date().toISOString(),
      checkedBy: 'quality_gate',
    };
  }
  
  private runAutomatedChecks(content: string, requirements: Record<string, any>): QualityResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    
    const wordCount = content.split(/\s+/).length;
    const targetWords = requirements.wordCount || 1000;
    if (wordCount < targetWords * 0.8) {
      issues.push(`Word count ${wordCount} below target ${targetWords}`);
      score -= 15;
    } else if (wordCount > targetWords * 1.5) {
      recommendations.push(`Word count ${wordCount} exceeds target ${targetWords} by 50%`);
      score -= 5;
    }
    
    const targetKeywords = requirements.targetKeywords || [];
    const missingKeywords = targetKeywords.filter((kw: string) => 
      !content.toLowerCase().includes(kw.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      issues.push(`Missing target keywords: ${missingKeywords.join(', ')}`);
      score -= missingKeywords.length * 5;
    }
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = wordCount / Math.max(1, sentences.length);
    if (avgWordsPerSentence > 25) {
      recommendations.push('Sentences are long; consider breaking up for readability');
      score -= 5;
    }
    
    const headings = content.match(/^#{1,6}\s/mg) || [];
    if (headings.length < 3) {
      recommendations.push('Content has few headings; add more structure');
      score -= 5;
    }
    
    return {
      checkType: 'content',
      passed: issues.length === 0,
      score: Math.max(0, score),
      issues,
      metrics: { wordCount, sentenceCount: sentences.length, headingCount: headings.length },
      recommendations,
      checkedAt: new Date().toISOString(),
      checkedBy: 'automated',
    };
  }
  
  private async runAIAssessment(
    content: string,
    requirements: Record<string, any>,
    contentType: string
  ): Promise<QualityResult> {
    try {
      const prompt = `
Assess the quality of this ${contentType} content.

REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

CONTENT (first 3000 chars):
${content.substring(0, 3000)}

OUTPUT JSON:
{
  "passed": true|false,
  "score": 0-100,
  "issues": ["issue1", "issue2"],
  "metrics": {"clarity": 0-100, "depth": 0-100, "originality": 0-100, "seo_potential": 0-100},
  "recommendations": ["rec1", "rec2"]
}

CRITERIA:
- Clarity: Clear, well-structured, easy to follow
- Depth: Sufficient detail, not superficial
- Originality: Unique perspective, not copied
- SEO Potential: Matches search intent, good keyword usage
`;
      
      const response = await aiRouter.route({
        systemPrompt: 'You are a content quality assessor. Be strict but fair. Respond in valid JSON.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.2,
      });
      
      const parsed = JSON.parse(response.content.replace(/```json\n?|\n?```/g, ''));
      
      return {
        checkType: 'content',
        passed: parsed.passed !== false,
        score: parsed.score || 70,
        issues: parsed.issues || [],
        metrics: parsed.metrics || {},
        recommendations: parsed.recommendations || [],
        checkedAt: new Date().toISOString(),
        checkedBy: 'ai_assessment',
      };
    } catch (error) {
      console.error('AI quality assessment failed:', error);
      return {
        checkType: 'content',
        passed: true,
        score: 70,
        issues: ['AI assessment unavailable'],
        metrics: {},
        recommendations: ['Run manual review'],
        checkedAt: new Date().toISOString(),
        checkedBy: 'fallback',
      };
    }
  }
}

/** Verification Loop - Verifies outcomes against expectations */
export class VerificationLoop {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async verifyStrategy(
    strategyId: string,
    expectedOutcome: string,
    actualMetrics: Record<string, number>
  ): Promise<VerificationResult> {
    await makeCostDecision('verify_strategy');
    
    const expected = this.parseExpectedOutcome(expectedOutcome);
    
    const matches: Record<string, boolean> = {};
    const discrepancies: string[] = [];
    
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = actualMetrics[key];
      const match = actualValue !== undefined && actualValue >= expectedValue * 0.7;
      matches[key] = match;
      
      if (!match && actualValue !== undefined) {
        discrepancies.push(`${key}: expected ≥${expectedValue}, got ${actualValue}`);
      }
    }
    
    const verified = Object.values(matches).every(m => m) && Object.keys(matches).length > 0;
    const confidence = Object.keys(matches).length > 0 
      ? Object.values(matches).filter(m => m).length / Object.keys(matches).length 
      : 0;
    
    const result: VerificationResult = {
      verified,
      confidence,
      expectedOutcome: expectedOutcome,
      actualOutcome: JSON.stringify(actualMetrics),
      discrepancies,
      evidence: { expected, actual: actualMetrics },
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    await brainRepository.createLearning({
      correlationId: this.correlationId,
      strategyId,
      expected: expectedOutcome,
      actual: JSON.stringify(actualMetrics),
      success: verified,
      evidence: result.evidence,
      failureReason: discrepancies.join('; ') || undefined,
      lesson: verified ? 'Strategy met expected outcomes' : `Strategy fell short: ${discrepancies.join(', ')}`,
      reusable: true,
      source: 'verification',
    });
    
    return result;
  }
  
  async verifyContent(
    contentStrategyId: string,
    expectedTraffic: number,
    expectedRevenue: number,
    actualTraffic: number,
    actualRevenue: number
  ): Promise<VerificationResult> {
    return this.verifyStrategy(contentStrategyId, 
      `Traffic: ${expectedTraffic}, Revenue: $${expectedRevenue}`,
      { traffic: actualTraffic, revenue: actualRevenue }
    );
  }
  
  private parseExpectedOutcome(outcome: string): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    const trafficMatch = outcome.match(/traffic[:\s]+([\d,]+)/i);
    if (trafficMatch) metrics.traffic = parseInt(trafficMatch[1].replace(/,/g, ''));
    
    const revenueMatch = outcome.match(/revenue[:\s]+\$?([\d,]+\.?\d*)/i);
    if (revenueMatch) metrics.revenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
    
    const conversionMatch = outcome.match(/conversion[:\s]+([\d.]+)%?/i);
    if (conversionMatch) metrics.conversionRate = parseFloat(conversionMatch[1]);
    
    return metrics;
  }
  
  /**
   * Compute a deterministic verification confidence from stored evidence.
   *
   * The confidence is derived from what is actually observable in the
   * verification record, never from a constant. Factors:
   *
   * - verification status (PASS / PARTIAL / FAIL / NOT_VERIFIABLE)
   * - number of expected metrics
   * - number of observed metrics
   * - number of successfully matched metrics
   * - evidence quality (number of evidence entries)
   * - data availability (how many measurement channels returned data)
   * - sample size (number of observations)
   *
   * Rules:
   * - NOT_VERIFIABLE always returns 0.0 — nothing was observed.
   * - FAIL always returns 0.0 — the verification did not pass.
   * - A single observation can never exceed 0.5 — one data point is not a
   *   reliable basis for HIGH confidence.
   * - Multiple matching observations with strong evidence can reach HIGH.
   */
  static computeVerificationConfidence(input: {
    status: string;
    expectedMetrics: Record<string, number>;
    observedMetrics: Record<string, number>;
    evidenceEntries: number;
    dataChannelsAvailable: number;
    sampleSize: number;
  }): number {
    const {
      status,
      expectedMetrics,
      observedMetrics,
      evidenceEntries,
      dataChannelsAvailable,
      sampleSize,
    } = input;

    // NOT_VERIFIABLE and FAIL mean nothing was verified — confidence is zero.
    if (status === 'NOT_VERIFIABLE' || status === 'FAIL') {
      return 0.0;
    }

    const expectedCount = Object.keys(expectedMetrics).length;
    const observedCount = Object.keys(observedMetrics).length;

    // No expected metrics means nothing to verify against.
    if (expectedCount === 0) {
      return 0.0;
    }

    // Match score: fraction of expected metrics that were actually observed.
    const matchScore = observedCount / expectedCount;

    // Evidence quality: more evidence entries = stronger basis.
    const evidenceScore = Math.min(1.0, evidenceEntries / 3);

    // Data availability: more channels returning data = stronger basis.
    const availabilityScore = Math.min(1.0, dataChannelsAvailable / 3);

    // Sample size: more observations = stronger basis. Single observation
    // caps at 0.5 regardless of other factors.
    let sampleScore = 0.0;
    if (sampleSize >= 10) {
      sampleScore = 1.0;
    } else if (sampleSize >= 5) {
      sampleScore = 0.7;
    } else if (sampleSize >= 2) {
      sampleScore = 0.4;
    } else if (sampleSize === 1) {
      sampleScore = 0.2;
    }

    // Weighted combination.
    let confidence =
      matchScore * 0.35 +
      evidenceScore * 0.25 +
      availabilityScore * 0.20 +
      sampleScore * 0.20;

    // Clamp to [0, 1].
    confidence = Math.max(0.0, Math.min(1.0, confidence));

    // Single-observation cap: one data point cannot support HIGH confidence.
    if (sampleSize <= 1) {
      confidence = Math.min(confidence, 0.5);
    }

    // PARTIAL status reduces confidence.
    if (status === 'PARTIAL') {
      confidence = Math.min(confidence, 0.7);
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Extract the evidence fields needed for confidence computation from a
   * stored learning/verification record.
   */
  private extractVerificationEvidence(learning: Record<string, unknown>): {
    status: string;
    expectedMetrics: Record<string, number>;
    observedMetrics: Record<string, number>;
    evidenceEntries: number;
    dataChannelsAvailable: number;
    sampleSize: number;
  } {
    const evidence = (learning.evidence as Record<string, unknown>) || {};
    const expected = (evidence.expected as Record<string, number>) || {};
    const observed = (evidence.actual as Record<string, number>) || {};

    // Count evidence entries: number of keys in the evidence object.
    const evidenceEntries = Object.keys(evidence).length;

    // Count data channels: keys in the observed metrics.
    const dataChannelsAvailable = Object.keys(observed).length;

    // Sample size: prefer an explicit sample_size field, fall back to the
    // number of observed metrics.
    const explicitSample = evidence.sample_size;
    const sampleSize =
      typeof explicitSample === 'number' && explicitSample > 0
        ? explicitSample
        : Object.keys(observed).length;

    // Status: prefer the learning's success flag, fall back to stored status.
    let status = 'PASS';
    if (learning.success === false) {
      status = 'FAIL';
    } else if (learning.status === 'PARTIAL') {
      status = 'PARTIAL';
    } else if (learning.status === 'NOT_VERIFIABLE') {
      status = 'NOT_VERIFIABLE';
    }

    return {
      status,
      expectedMetrics: expected,
      observedMetrics: observed,
      evidenceEntries,
      dataChannelsAvailable,
      sampleSize,
    };
  }

  async getVerificationHistory(entityType: string, entityId: string): Promise<VerificationResult[]> {
    const learnings = await brainRepository.listLearningsByCorrelationId(entityId);
    return learnings
      .filter(l => l.source === 'verification')
      .map(l => {
        const evidence = this.extractVerificationEvidence(l);
        const confidence = VerificationLoop.computeVerificationConfidence(evidence);

        return {
          verified: l.success as boolean,
          confidence,
          expectedOutcome: l.expected as string,
          actualOutcome: l.actual as string,
          discrepancies: l.failure_reason ? [l.failure_reason as string] : [],
          evidence: l.evidence as Record<string, any> || {},
          verifiedAt: l.created_at as string,
          createdAt: l.created_at as string,
        };
      });
  }
}