import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  BrainExecutionPlan,
  BrainStrategy,
  ExecutionAction,
  Permission,
  generateCorrelationId,
  makeCostDecision,
  validatePermission,
} from './types';
import { parseStrictJson } from './researchEngine';
import { DEFAULT_PERMISSION_POLICY } from './types';

/**
 * Automation entry points that already exist in this codebase.
 * The planner may only target one of these — no second automation engine.
 */
export const SUPPORTED_TARGET_AUTOMATIONS = {
  generate_content: {
    kind: 'generate_content',
    pipelineEntry: 'AutomationPipeline.runDirect',
    permission: 'EXECUTE' as Permission,
    publishes: true,
  },
  publish_content: {
    kind: 'publish_content',
    pipelineEntry: 'AutomationPipeline.runPublishDraft',
    permission: 'PUBLISH' as Permission,
    publishes: true,
  },
} as const;

export type TargetAutomation = keyof typeof SUPPORTED_TARGET_AUTOMATIONS;

export interface GroundedExecutionPlan {
  id: string;
  strategyId: string;
  opportunityId: string;
  objective: string;
  targetAutomation: TargetAutomation;
  requiredPermissions: Permission[];
  approvalRequired: boolean;
  idempotencyKey: string;
  correlationId: string;
  status: 'awaiting_approval';
  actions: Array<{
    id: string;
    type: string;
    description: string;
    automationType: TargetAutomation;
    permission: Permission;
    requiresApproval: boolean;
    automationParams: Record<string, unknown>;
    validationRules: string[];
  }>;
  warnings: string[];
}

/** Execution Planner - Creates validated execution plans from approved strategies */
export class ExecutionPlanner {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async createExecutionPlan(strategy: BrainStrategy, userPermissions: Permission[] = []): Promise<BrainExecutionPlan | null> {
    await makeCostDecision('create_execution_plan');
    
    if (strategy.status !== 'approved') {
      console.warn(`Strategy ${strategy.id} not approved: ${strategy.status}`);
    }
    
    const actions = await this.planActions(strategy);
    const validatedActions = this.validateActions(actions, userPermissions);
    const estimatedCost = validatedActions.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
    const requiresApproval = validatedActions.some(a => a.requiresApproval);
    const overallPermission = validatedActions.some(a => !a.permissionValidation?.allowed)
      ? 'REQUIRES_APPROVAL'
      : 'ALLOWED';
    
    const plan: BrainExecutionPlan = {
      id: generateCorrelationId().replace('brain-', 'plan-'),
      strategyId: strategy.id!,
      title: `Execution Plan: ${strategy.title}`,
      description: `Automated execution plan for strategy: ${strategy.description}`,
      actions: validatedActions,
      estimatedCost,
      requiresApproval,
      overallPermission,
      status: requiresApproval ? 'pending_approval' : 'ready',
      correlationId: this.correlationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const result = await brainRepository.createExecutionPlanPhase4({
      opportunityId: strategy.opportunityId || '',
      strategyId: strategy.id!,
      objective: plan.description || `Execution plan for ${strategy.title}`,
      actions: plan.actions,
      requiredPermissions: plan.actions.map(a => a.permission || 'PROPOSE'),
      evidence: [],
      expectedOutcome: strategy.expectedResult,
      rollbackPlan: 'Manual rollback via automation dashboard',
      verificationPlan: 'Quality gate + verification loop',
      correlationId: this.correlationId,
    });
    
    if (!result) return null;
    
    await brainRepository.updateStrategy(strategy.id!, { status: 'execution_planned' });
    
    return { ...plan, id: result.id };
  }
  
  private async planActions(strategy: BrainStrategy): Promise<ExecutionAction[]> {
    const prompt = this.buildPlanningPrompt(strategy);
    
    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are the ViaFinds AI Brain Execution Planner. Break down the strategy into specific, executable actions. Each action must map to an existing automation capability. You must respond in strictly valid JSON.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.2,
      });
      
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      const parsed = JSON.parse(content);
      
      return (parsed.actions || []).map((a: any, idx: number) => ({
        id: a.id || `action-${idx + 1}`,
        type: a.type || 'CONTENT_CREATE',
        description: a.description || '',
        automationType: a.automationType || a.automation_type || 'content_generation',
        automationParams: a.automationParams || a.automation_params || {},
        estimatedCost: a.estimatedCost || a.estimated_cost || 0.001,
        requiresApproval: a.requiresApproval !== false,
        dependencies: a.dependencies || [],
        validationRules: a.validationRules || a.validation_rules || [],
        status: 'pending' as const,
      }));
    } catch (error) {
      console.error('ExecutionPlanner.planActions failed:', error);
      return this.getDefaultActions(strategy);
    }
  }
  
  private getDefaultActions(strategy: BrainStrategy): ExecutionAction[] {
    const baseAction: ExecutionAction = {
      id: 'action-1',
      type: 'CONTENT_CREATE',
      description: strategy.proposedAction || 'Execute strategy',
      automationType: this.mapProposedActionToAutomation(strategy.proposedAction),
      automationParams: { strategyId: strategy.id },
      estimatedCost: 0.01,
      requiresApproval: strategy.approvalRequired,
      dependencies: strategy.dependencies,
      validationRules: ['content_quality_check', 'seo_validation'],
      status: 'pending',
    };
    
    return [baseAction];
  }
  
  private mapProposedActionToAutomation(proposedAction: string): string {
    const action = proposedAction.toLowerCase();
    if (action.includes('article') || action.includes('content') || action.includes('write')) return 'content_generation';
    if (action.includes('product') || action.includes('review')) return 'product_research';
    if (action.includes('seo') || action.includes('keyword')) return 'seo_optimization';
    if (action.includes('affiliate') || action.includes('link')) return 'affiliate_integration';
    if (action.includes('publish') || action.includes('deploy')) return 'content_publishing';
    return 'content_generation';
  }
  
  private validateActions(actions: ExecutionAction[], userPermissions: Permission[]): ExecutionAction[] {
    return actions.map(action => {
      const requiredPermission = this.getRequiredPermission(action.type);
      const permissionValidation = validatePermission(requiredPermission, userPermissions);
      
      return {
        ...action,
        permission: requiredPermission,
        permissionValidation,
        requiresApproval: action.requiresApproval || permissionValidation.requiresApproval,
        status: permissionValidation.allowed ? 'pending' : 'blocked',
      };
    });
  }
  
  private getRequiredPermission(actionType: string): Permission {
    const permissionMap: Record<string, Permission> = {
      'CONTENT_CREATE': 'PROPOSE',
      'CONTENT_MODIFY': 'MODIFY',
      'CONTENT_PUBLISH': 'PUBLISH',
      'CONTENT_DELETE': 'DELETE',
      'PRODUCT_RESEARCH': 'RESEARCH',
      'SEO_OPTIMIZATION': 'ANALYZE',
      'AFFILIATE_INTEGRATION': 'MODIFY',
      'DATA_FETCH': 'READ',
      'API_CALL': 'RESEARCH',
      'SPEND': 'SPEND',
    };
    return permissionMap[actionType] || 'PROPOSE';
  }
  
  private buildPlanningPrompt(strategy: BrainStrategy): string {
    return `
Break down this strategy into SPECIFIC, EXECUTABLE actions.

STRATEGY:
- Title: ${strategy.title}
- Description: ${strategy.description}
- Business Goal: ${strategy.businessGoal}
- Proposed Action: ${strategy.proposedAction}
- Required Capabilities: ${strategy.requiredCapabilities.join(', ')}
- Expected Result: ${strategy.expectedResult}
- Risks: ${strategy.risks.join(', ')}
- Dependencies: ${strategy.dependencies.join(', ')}
- Approval Required: ${strategy.approvalRequired}

AVAILABLE AUTOMATION TYPES:
- content_generation: Create articles, reviews, guides
- product_research: Find and analyze products
- seo_optimization: Keyword research, on-page SEO
- affiliate_integration: Add affiliate links, track clicks
- content_publishing: Publish to CMS, schedule
- data_analysis: Analyze metrics, trends
- api_integration: Connect external APIs
- social_media: Create social posts
- email_marketing: Create campaigns
- analytics_tracking: Set up tracking

OUTPUT JSON:
{
  "actions": [
    {
      "type": "CONTENT_CREATE|CONTENT_MODIFY|CONTENT_PUBLISH|PRODUCT_RESEARCH|SEO_OPTIMIZATION|AFFILIATE_INTEGRATION|DATA_FETCH|API_CALL|SPEND",
      "description": "Specific action description",
      "automationType": "content_generation|product_research|seo_optimization|...",
      "automationParams": { "key": "value" },
      "estimatedCost": 0.01,
      "requiresApproval": true,
      "dependencies": ["action-id"],
      "validationRules": ["rule1", "rule2"]
    }
  ]
}

CONSTRAINTS:
- Each action must map to ONE existing automation type.
- automationParams must match the automation's expected input.
- estimatedCost in USD (use 0.001 for content, 0.01 for research, 0.1 for API calls).
- requiresApproval: true for PUBLISH/MODIFY/DELETE/SPEND actions.
- validationRules should be checkable by Quality Gate.
`;
  }
  
  async getExecutionPlan(planId: string): Promise<BrainExecutionPlan | null> {
    const result = await brainRepository.getExecutionPlanById(planId);
    if (!result) return null;
    
    return {
      id: result.id as string,
      strategyId: result.strategy_id as string,
      title: result.title as string,
      description: result.description as string,
      actions: result.actions as ExecutionAction[],
      estimatedCost: result.estimated_cost as number,
      requiresApproval: result.requires_approval as boolean,
      overallPermission: result.overall_permission as string,
      status: result.status as 'planned' | 'approval_pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back' | 'ready' | 'pending_approval' | 'partial_failure',
      correlationId: result.correlation_id as string,
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    };
  }
  
  async updateActionStatus(planId: string, actionId: string, status: string, result?: any): Promise<boolean> {
    const plan = await this.getExecutionPlan(planId);
    if (!plan) return false;
    
    const actions = plan.actions.map(a => {
      if (a.id === actionId) {
        return { ...a, status, result, completedAt: ['completed', 'failed'].includes(status) ? new Date().toISOString() : undefined };
      }
      return a;
    });
    
    const allCompleted = actions.every(a => a.status === 'completed');
    const newPlanStatus = allCompleted ? 'completed' : 'in_progress';
    
    return brainRepository.updateExecutionPlanStatus(planId, newPlanStatus);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4.2: EXECUTION PLAN BOUND TO A REAL STRATEGY
  //
  // The plan names exactly which existing automation entry point the
  // worker must call, which permissions it needs, and a stable
  // idempotency key. It enters AWAITING_APPROVAL when approval is
  // required by policy.
  // ─────────────────────────────────────────────────────────────

  async createPlanFromStrategy(strategyId: string): Promise<GroundedExecutionPlan> {
    const strategy = await brainRepository.getTraceableStrategy(strategyId);
    if (!strategy) {
      throw new Error(`BLOCKED: strategy ${strategyId} does not exist in the database`);
    }

    const opportunityId = strategy.opportunity_id as string;
    if (!opportunityId) {
      throw new Error(`BLOCKED: strategy ${strategyId} is not linked to an opportunity`);
    }

    const opportunity = await brainRepository.getTraceableOpportunity(opportunityId);
    if (!opportunity) {
      throw new Error(`BLOCKED: strategy ${strategyId} references opportunity ${opportunityId}, which does not exist`);
    }

    const researchRun = opportunity.research_id
      ? await brainRepository.getResearchRun(opportunity.research_id as string)
      : null;
    const researchQuery = String(researchRun?.query || '').trim();

    const topic = deriveTopic(strategy, researchQuery);
    if (!topic) {
      throw new Error(`BLOCKED: could not derive an executable content topic from strategy ${strategyId}`);
    }

    const warnings: string[] = [];

    if (!/^[A-Za-z0-9]/.test(topic) || topic !== topic.trim()) {
      warnings.push(`Derived topic "${topic}" is not in normal editorial form.`);
    }

    // Permission set required by the chosen automation. Determined from
    // policy, not from the caller.
    const requiredPermissions: Permission[] = ['EXECUTE', 'PUBLISH'];
    for (const permission of requiredPermissions) {
      if (DEFAULT_PERMISSION_POLICY[permission] !== 'approval_required') {
        throw new Error(`Invariant violation: ${permission} must require approval under the current policy`);
      }
    }
    const approvalRequired = true;

    // Idempotency key is derived from immutable lineage, so a repeated
    // request for the same strategy can never create a second live plan.
    // A plan that already reached a terminal failure may be re-planned: the
    // failed plan stays on record and a new revision carries the corrected
    // intent under its own key.
    const baseKey = `plan-${opportunityId}-${strategyId}`;
    let idempotencyKey = baseKey;
    const existing = await brainRepository.findExecutionPlanByIdempotencyKey(idempotencyKey);
    if (existing) {
      const terminal = ['failed', 'cancelled', 'abandoned'].includes(String(existing.status || ''));
      if (!terminal) {
        throw new Error(
          `BLOCKED: an execution plan for this strategy already exists (${existing.id}, status=${existing.status}). Duplicate execution is refused.`
        );
      }
      const revisions = (await brainRepository.listExecutionPlansByIdempotencyPrefix(baseKey)).length;
      idempotencyKey = `${baseKey}-r${revisions + 1}`;
      warnings.push(
        `A previous plan for this lineage (${existing.id}) ended as "${existing.status}"; revision ${idempotencyKey} supersedes it and the old plan is retained for audit.`
      );
    }

    const targetAutomation: TargetAutomation = 'generate_content';
    const target = SUPPORTED_TARGET_AUTOMATIONS[targetAutomation];

    const actionId = 'action-1-generate-content';
    const actions: GroundedExecutionPlan['actions'] = [
      {
        id: actionId,
        type: 'CONTENT_CREATE',
        description: `Produce a research-backed article on: ${topic}`,
        automationType: targetAutomation,
        permission: 'EXECUTE',
        requiresApproval: true,
        automationParams: {
          topic,
          category: deriveCategory(opportunity, strategy),
          description: (strategy.proposed_action as string) || `Execute strategy ${strategyId}`,
          contentApproach: (strategy.content_approach as string) || null,
          strategyId,
          opportunityId,
        },
        validationRules: [
          'quality_gate_not_fail',
          'article_traceability_complete',
          'public_url_http_200',
        ],
      },
      {
        id: 'action-2-publish-draft',
        type: 'CONTENT_PUBLISH',
        description: `Publish the generated draft for: ${topic} (only after the quality gate does not fail)`,
        automationType: 'publish_content',
        permission: 'PUBLISH',
        requiresApproval: true,
        automationParams: {
          dependsOn: actionId,
          strategyId,
          opportunityId,
        },
        validationRules: ['quality_result_present', 'quality_result_not_fail'],
      },
    ];

    const created = await brainRepository.createTraceableExecutionPlan({
      opportunityId,
      strategyId,
      objective: (strategy.proposed_action as string) || `Execute strategy: ${strategy.title}`,
      actions,
      requiredPermissions,
      approvalRequired,
      executionType: target.pipelineEntry,
      target: target.kind,
      targetAutomation: target.pipelineEntry,
      idempotencyKey,
      evidence: [
        {
          strategy_id: strategyId,
          opportunity_id: opportunityId,
          source_ids: (strategy.source_ids as string[]) || [],
          opportunity_external_evidence: ((opportunity.structured_observation as any)?.external_evidence) || [],
        },
      ],
      expectedOutcome: (strategy.expected_result as string) || null,
      rollbackPlan: 'Unpublish the article (status=archived) and cancel the automation job; no source records are mutated.',
      verificationPlan:
        'Direct database reads of articles + brain_quality_results + brain_verifications + an HTTP GET of the public URL.',
      correlationId: this.correlationId,
      status: 'awaiting_approval',
      provenance: 'REAL',
    });

    if (!created) {
      throw new Error('Failed to persist the execution plan');
    }

    await brainRepository.updateStrategy(strategyId, { status: 'execution_planned' });
    await brainRepository.updateOpportunity(opportunityId, {
      status: 'execution_planned',
      executionPlanId: created.id,
    });

    return {
      id: created.id,
      strategyId,
      opportunityId,
      objective: (strategy.proposed_action as string) || `Execute strategy: ${strategy.title}`,
      targetAutomation,
      requiredPermissions,
      approvalRequired,
      idempotencyKey,
      correlationId: this.correlationId,
      status: 'awaiting_approval',
      actions,
      warnings,
    };
  }
}

/**
 * Derive a concrete, niche-valid content topic from the lineage.
 *
 * A search query persisted with the research run is the most honest topic
 * available: it is what a real person typed, and it is already on record. The
 * strategy text is only a fallback, and is only used when it reads like a
 * headline rather than an instruction fragment.
 */
function deriveTopic(
  strategy: Record<string, unknown>,
  researchQuery: string
): string | null {
  const proposed = String(strategy.proposed_action || '').trim();
  const approach = String(strategy.content_approach || '').trim();
  const title = String(strategy.title || '').trim();

  // A research query is a real search intent, so it wins when present.
  if (researchQuery.length >= 8 && researchQuery.length <= 120) return researchQuery;

  const haystack = `${proposed} ${approach} ${title}`;
  if (!haystack.trim()) return null;

  // Prefer an explicit quoted subject, then an "on/about X" phrase, then the title.
  const quoted = haystack.match(/["“']([^"”']{6,120})["”']/);
  if (quoted) return quoted[1].trim();

  // Fall back to the strategy title: it is a headline, not an instruction.
  if (title.length >= 12) return title;

  if (proposed.length > 15) return proposed;
  return title || null;
}

function deriveCategory(
  opportunity: Record<string, unknown>,
  strategy: Record<string, unknown>
): string {
  const audience = String(strategy.target_audience || '').toLowerCase();
  const category = String(opportunity.category || opportunity.type || '').toLowerCase();
  if (audience.includes('creator')) return 'creator tools';
  if (audience.includes('business')) return 'business software';
  if (category.includes('seo')) return 'ai tools';
  return 'productivity tools';
}