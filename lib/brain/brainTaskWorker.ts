import crypto from 'crypto';
import { brainRepository } from '@/lib/db/repositories/brain';
import { getPool } from '@/lib/db/client';
import { automationPipeline } from '@/lib/automation/pipeline';
import { jobManager } from '@/lib/automation/job-manager';
import type { AutomationJob } from '@/lib/automation/types';
import { ApprovalWorkflow } from './permissions';
import { articleQualityGate } from './articleQualityGate';
import { DEFAULT_PERMISSION_POLICY, type Permission } from './types';
import { logger } from '@/lib/logger';

interface BrainTaskWorkerConfig {
  pollIntervalMs: number;
  batchSize: number;
  maxRetries: number;
  claimLeaseSeconds: number;
}

const DEFAULT_CONFIG: BrainTaskWorkerConfig = {
  pollIntervalMs: 10000,
  batchSize: 5,
  maxRetries: 3,
  claimLeaseSeconds: 1800,
};

export type WorkerOutcome = {
  taskId: string;
  outcome: 'completed' | 'blocked' | 'failed';
  reason?: string;
  reasons?: string[];
  automationJobId?: string;
  articleId?: string;
  qualityResultId?: string;
  publicUrl?: string;
};

/**
 * BrainTaskWorker — the single execution path from an approved brain task
 * to a published, traceable article.
 *
 * Ordering is fixed and enforced here:
 *   claim → verify lineage → verify approval (server-side) → verify
 *   permissions → consume approval → run existing AutomationPipeline →
 *   quality gate → publish (only if the gate did not fail) → verify the
 *   article exists and carries the right lineage → complete.
 *
 * Nothing is ever marked complete on the basis of caller-supplied data.
 */
export class BrainTaskWorker {
  private config: BrainTaskWorkerConfig;
  private running = false;
  private intervalHandle: NodeJS.Timeout | null = null;
  private workerId: string;

  constructor(config: Partial<BrainTaskWorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workerId = `brain-worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  }

  async start(): Promise<void> {
    if (this.running) {
      logger.warn('BrainTaskWorker already running');
      return;
    }
    this.running = true;
    logger.info('BrainTaskWorker starting', {
      pollIntervalMs: this.config.pollIntervalMs,
      workerId: this.workerId,
    });
    this.intervalHandle = setInterval(() => void this.processLoop(), this.config.pollIntervalMs);
    await this.processLoop();
  }

  stop(): void {
    this.running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    logger.info('BrainTaskWorker stopped');
  }

  private async processLoop(): Promise<void> {
    if (!this.running) return;
    try {
      // 1. Process Postgres brain_strategy_execution jobs (Gate 5 execution bridge)
      await automationPipeline.processStrategyExecutions();

      // 2. Process Brain Tasks
      const tasks = await this.fetchEligibleTasks();
      if (tasks.length === 0) return;
      logger.info(`BrainTaskWorker found ${tasks.length} eligible task(s)`);
      for (const task of tasks) {
        if (!this.running) break;
        await this.runTask(task.id as string);
      }
    } catch (error) {
      logger.error(
        'BrainTaskWorker processLoop error',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async fetchEligibleTasks(): Promise<Array<Record<string, unknown>>> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT * FROM brain_tasks
          WHERE type = 'create_automation_job'
            AND status IN ('queued','awaiting_approval','approved')
            AND (claim_token IS NULL OR claimed_at IS NULL OR claimed_at < NOW() - ($1 || ' seconds')::interval)
          ORDER BY
            CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
            created_at ASC
          LIMIT $2`,
        [String(this.config.claimLeaseSeconds), this.config.batchSize]
      );
      return result.rows;
    } catch (error) {
      logger.error(
        'Failed to fetch eligible brain_tasks',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /** Execute one brain task. Safe to call concurrently: the claim is atomic. */
  async runTask(taskId: string): Promise<WorkerOutcome> {
    const claimToken = crypto.randomUUID();
    const claimedId = await brainRepository.claimTask(
      taskId,
      claimToken,
      this.workerId,
      this.config.claimLeaseSeconds
    );

    if (!claimedId) {
      const existing = await brainRepository.getTask(taskId);
      if (!existing) {
        return { taskId, outcome: 'blocked', reason: 'Task not found' };
      }
      return {
        taskId,
        outcome: 'blocked',
        reason: `Task is not claimable (status=${existing.status}, claimed_by=${existing.claimed_by ?? 'none'})`,
      };
    }

    try {
      return await this.executeClaimedTask(taskId, claimToken);
    } finally {
      // A completed/failed task keeps its claim as an audit trail; only
      // interrupted work releases the lease.
    }
  }

  private async executeClaimedTask(taskId: string, claimToken: string): Promise<WorkerOutcome> {
    const pool = getPool();
    const taskResult = await pool.query('SELECT * FROM brain_tasks WHERE id=$1', [taskId]);
    const task = taskResult.rows[0];
    if (!task) {
      return { taskId, outcome: 'blocked', reason: 'Task vanished after claim' };
    }

    const correlationId = (task.correlation_id as string) || null;
    if (!correlationId) {
      return this.failTask(taskId, claimToken, 'BLOCKED: task has no correlation_id and cannot be traced');
    }

    // ── Step 1: lineage integrity ──
    const strategyId = task.strategy_id as string | null;
    const opportunityId = task.opportunity_id as string | null;
    const planId = task.execution_plan_id as string | null;
    const approvalId = task.approval_id as string | null;

    if (!strategyId || !opportunityId || !planId) {
      return this.failTask(
        taskId,
        claimToken,
        'BLOCKED: task is missing strategy_id, opportunity_id or execution_plan_id'
      );
    }

    const [strategyRes, opportunityRes, planRes] = await Promise.all([
      pool.query('SELECT * FROM brain_strategies WHERE id=$1', [strategyId]),
      pool.query('SELECT * FROM brain_opportunities WHERE id=$1', [opportunityId]),
      pool.query('SELECT * FROM brain_execution_plans WHERE id=$1', [planId]),
    ]);

    if (strategyRes.rows.length === 0) {
      return this.failTask(taskId, claimToken, `BLOCKED: strategy ${strategyId} does not exist`);
    }
    if (opportunityRes.rows.length === 0) {
      return this.failTask(taskId, claimToken, `BLOCKED: opportunity ${opportunityId} does not exist`);
    }
    if (planRes.rows.length === 0) {
      return this.failTask(taskId, claimToken, `BLOCKED: execution plan ${planId} does not exist`);
    }

    const strategy = strategyRes.rows[0];
    const plan = planRes.rows[0];

    if (plan.strategy_id !== strategyId) {
      return this.failTask(taskId, claimToken, 'BLOCKED: execution plan does not belong to the task strategy');
    }
    if (strategy.opportunity_id !== opportunityId) {
      return this.failTask(taskId, claimToken, 'BLOCKED: strategy does not belong to the task opportunity');
    }

    // ── Step 2: permission validation ──
    const requiredPermissions = Array.isArray(plan.required_permissions)
      ? (plan.required_permissions as string[])
      : [];
    if (requiredPermissions.length === 0) {
      return this.failTask(taskId, claimToken, 'BLOCKED: execution plan declares no required permissions');
    }
    for (const permission of requiredPermissions) {
      const policy = DEFAULT_PERMISSION_POLICY[permission as Permission];
      if (!policy) {
        return this.failTask(taskId, claimToken, `BLOCKED: execution plan requires unknown permission "${permission}"`);
      }
      if (policy !== 'approval_required') {
        return this.failTask(
          taskId,
          claimToken,
          `BLOCKED: permission "${permission}" is not approval_required, so it cannot be authorised by an approval record`
        );
      }
    }

    const primaryPermission = requiredPermissions[0] as Permission;

    // ── Step 3: server-side approval verification ──
    const approvals = new ApprovalWorkflow(correlationId);
    const decision = await approvals.authorizeExecution({
      taskId,
      strategyId,
      executionPlanId: planId,
      requiredPermission: primaryPermission,
      approvalId,
    });

    if (!decision.allowed) {
      const reason = `BLOCKED: approval verification failed — ${decision.reasons.join('; ')}`;
      await brainRepository.updateClaimedTask(taskId, claimToken, {
        status: 'awaiting_approval',
        approvalState: decision.reasons.some((r) => r.includes('does not exist')) ? 'rejected' : 'pending',
        recommendation: reason,
        evidence: {
          approvalId: approvalId ?? null,
          approvalVerification: { allowed: false, reasons: decision.reasons },
          blockedAt: 'approval_verification',
          blockedAtIso: new Date().toISOString(),
        },
      });
      await brainRepository.releaseTaskClaim(taskId, claimToken);
      return { taskId, outcome: 'blocked', reason, reasons: decision.reasons };
    }

    // ── Step 4: consume the approval exactly once ──
    const consumed = await brainRepository.consumeApproval(decision.approvalId!, taskId);
    if (!consumed) {
      const reason = 'BLOCKED: approval could not be consumed (already consumed or not approved)';
      await brainRepository.updateClaimedTask(taskId, claimToken, {
        status: 'awaiting_approval',
        approvalState: 'pending',
        recommendation: reason,
        evidence: {
          approvalId: decision.approvalId,
          approvalVerification: { allowed: true, consumed: false },
          blockedAt: 'approval_consumption',
          blockedAtIso: new Date().toISOString(),
        },
      });
      await brainRepository.releaseTaskClaim(taskId, claimToken);
      return { taskId, outcome: 'blocked', reason };
    }

    await brainRepository.updateClaimedTask(taskId, claimToken, {
      status: 'approved',
      approvalState: 'approved',
    });

    // ── Step 5: run the EXISTING automation pipeline ──
    const actions = Array.isArray(plan.actions) ? (plan.actions as Array<Record<string, unknown>>) : [];
    const generateAction = actions.find((a) => a.automationType === 'generate_content');
    if (!generateAction) {
      await brainRepository.releaseApprovalConsumption(decision.approvalId!);
      return this.failTask(taskId, claimToken, 'BLOCKED: execution plan has no generate_content action');
    }

    const params = (generateAction.automationParams as Record<string, unknown>) || {};
    const topic = String(params.topic || '').trim();
    const category = String(params.category || '').trim();
    if (!topic) {
      await brainRepository.releaseApprovalConsumption(decision.approvalId!);
      return this.failTask(taskId, claimToken, 'BLOCKED: generate_content action has no topic');
    }

    await brainRepository.updateClaimedTask(taskId, claimToken, { status: 'in_progress' });
    await brainRepository.setExecutionPlanState(planId, 'executing', { brainTaskId: taskId, startedAt: new Date().toISOString() });
    await brainRepository.updateStrategy(strategyId, { status: 'executing' });

    let job: AutomationJob | null = null;
    try {
      job = await automationPipeline.runDirect(`brain_${taskId}`, {
        topic,
        category,
        brainTaskId: taskId,
        strategyId,
        opportunityId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await brainRepository.releaseApprovalConsumption(decision.approvalId!);
      return this.failTask(taskId, claimToken, `Automation pipeline threw: ${message}`);
    }

    if (!job) {
      await brainRepository.releaseApprovalConsumption(decision.approvalId!);
      return this.failTask(taskId, claimToken, 'Automation pipeline returned no job');
    }

    const jobId = job.id;
    await brainRepository.setExecutionPlanState(planId, 'executing', { automationJobId: jobId, brainTaskId: taskId });

    if (job.status === 'failed') {
      const reason = `Automation job ${jobId} failed: ${job.error || 'unknown pipeline error'}`;
      await this.recordEvidence(taskId, claimToken, {
        approvalId: decision.approvalId,
        automationJobId: jobId,
        jobStatus: job.status,
        jobError: job.error || null,
        blockedAt: 'pipeline',
      });
      await brainRepository.setExecutionPlanState(planId, 'failed', { completedAt: new Date().toISOString() });
      return this.failTask(taskId, claimToken, reason);
    }

    if (job.status !== 'awaiting_approval' || !job.result?.draft) {
      const reason = `Automation job ${jobId} ended in unexpected state "${job.status}" with no draft`;
      await this.recordEvidence(taskId, claimToken, {
        approvalId: decision.approvalId,
        automationJobId: jobId,
        jobStatus: job.status,
        blockedAt: 'pipeline_state',
      });
      return this.failTask(taskId, claimToken, reason);
    }

    // ── Step 6: quality gate on the draft (pre-publication) ──
    const draft = job.result.draft as Record<string, unknown>;
    const pipelineQuality = (job.result.qualityResult as Record<string, unknown>) || null;
    const assessment = articleQualityGate.assessDraft({
      jobId,
      draft,
      pipelineQualityResult: pipelineQuality as { status?: string } | null,
    });

    const preQuality = await brainRepository.createTraceableQualityResult({
      executionPlanId: planId,
      articleId: null,
      brainTaskId: taskId,
      automationJobId: jobId,
      strategyId,
      opportunityId,
      correlationId,
      targetId: jobId,
      targetType: 'draft_prepublication',
      overallStatus: assessment.overallStatus,
      score: assessment.score,
      checks: assessment.checks,
      warnings: assessment.warnings,
      failures: assessment.failures,
      failureReason: assessment.failureReason,
      recommendedFix: assessment.recommendedFix,
      published: false,
      publicationBlockedReason:
        assessment.overallStatus === 'FAIL' ? 'Quality gate failed before publication' : null,
      provenance: 'REAL',
    });

    if (assessment.overallStatus === 'FAIL') {
      const reason = `BLOCKED: pre-publication quality gate FAIL (score ${assessment.score}): ${assessment.failureReason}`;
      await this.recordEvidence(taskId, claimToken, {
        approvalId: decision.approvalId,
        automationJobId: jobId,
        jobStatus: job.status,
        qualityResultId: preQuality?.id ?? null,
        quality: { overallStatus: assessment.overallStatus, score: assessment.score, failures: assessment.failures },
        blockedAt: 'quality_gate',
      });
      jobManager.updateJobStatus(jobId, 'failed', 'quality_gate', reason);
      await brainRepository.setExecutionPlanState(planId, 'failed', { completedAt: new Date().toISOString() });
      return this.failTask(taskId, claimToken, reason);
    }

    // ── Step 7: publish (blocked server-side if the gate failed) ──
    let publishedJob: AutomationJob | null = null;
    try {
      publishedJob = await automationPipeline.runPublishDraft(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordEvidence(taskId, claimToken, {
        approvalId: decision.approvalId,
        automationJobId: jobId,
        jobStatus: 'failed',
        qualityResultId: preQuality?.id ?? null,
        publishError: message,
        blockedAt: 'publishing',
      });
      await brainRepository.setExecutionPlanState(planId, 'failed', { completedAt: new Date().toISOString() });
      return this.failTask(taskId, claimToken, `Publishing failed: ${message}`);
    }

    if (!publishedJob || publishedJob.status !== 'completed' || !publishedJob.result?.articleId) {
      const reason = `Publishing did not complete (status=${publishedJob?.status ?? 'null'})`;
      await this.recordEvidence(taskId, claimToken, {
        approvalId: decision.approvalId,
        automationJobId: jobId,
        jobStatus: publishedJob?.status ?? 'null',
        qualityResultId: preQuality?.id ?? null,
        blockedAt: 'publishing',
      });
      await brainRepository.setExecutionPlanState(planId, 'failed', { completedAt: new Date().toISOString() });
      return this.failTask(taskId, claimToken, reason);
    }

    const articleId = publishedJob.result.articleId as string;
    // runPublishDraft records the slug as `publishedUrl`; older job shapes use
    // `slug`. Read both so a real URL is always available for verification.
    const slug = String(publishedJob.result.publishedUrl || publishedJob.result.slug || '');
    const publicUrl = slug
      ? slug.startsWith('http')
        ? slug
        : `https://viafinds.com/articles/${slug}`
      : undefined;

    // ── Step 8: verify the article really exists with the right lineage ──
    const article = await brainRepository.getArticle(articleId);
    if (!article) {
      return this.failTask(
        taskId,
        claimToken,
        `Article ${articleId} was reported by the pipeline but is not in the database`
      );
    }

    const lineageProblems: string[] = [];
    if (String(article.brain_task_id) !== taskId) lineageProblems.push(`article.brain_task_id=${article.brain_task_id}`);
    if (String(article.automation_job_id) !== jobId) lineageProblems.push(`article.automation_job_id=${article.automation_job_id}`);
    if (String(article.strategy_id) !== strategyId) lineageProblems.push(`article.strategy_id=${article.strategy_id}`);
    if (String(article.opportunity_id) !== opportunityId) lineageProblems.push(`article.opportunity_id=${article.opportunity_id}`);

    if (lineageProblems.length > 0) {
      return this.failTask(
        taskId,
        claimToken,
        `Article lineage verification failed: ${lineageProblems.join(', ')}`
      );
    }

    // ── Step 9: quality gate on the persisted article ──
    const postAssessment = await articleQualityGate.assess({
      articleId,
      expected: { brainTaskId: taskId, automationJobId: jobId, strategyId, opportunityId, executionPlanId: planId },
    });

    const postQuality = await brainRepository.createTraceableQualityResult({
      executionPlanId: planId,
      articleId,
      brainTaskId: taskId,
      automationJobId: jobId,
      strategyId,
      opportunityId,
      correlationId,
      targetId: articleId,
      targetType: 'article',
      overallStatus: postAssessment.overallStatus,
      score: postAssessment.score,
      checks: postAssessment.checks,
      warnings: postAssessment.warnings,
      failures: postAssessment.failures,
      failureReason: postAssessment.failureReason,
      recommendedFix: postAssessment.recommendedFix,
      published: article.status === 'published',
      publicationBlockedReason: null,
      provenance: 'REAL',
    });

    if (postAssessment.overallStatus === 'FAIL') {
      const reason = `Post-publication quality gate FAIL (score ${postAssessment.score}): ${postAssessment.failureReason}`;
      await this.recordEvidence(taskId, claimToken, {
        approvalId: decision.approvalId,
        automationJobId: jobId,
        articleId,
      qualityResultId: postQuality?.id ?? undefined,
        quality: { overallStatus: postAssessment.overallStatus, score: postAssessment.score },
      });
      await brainRepository.setExecutionPlanState(planId, 'failed', { completedAt: new Date().toISOString() });
      return this.failTask(taskId, claimToken, reason);
    }

    // ── Step 10: complete ──
    await this.recordEvidence(taskId, claimToken, {
      approvalId: decision.approvalId,
      approvalDecidedBy: decision.decidedBy,
      approvalDecidedAt: decision.decidedAt,
      automationJobId: jobId,
      articleId,
      publicUrl,
      slug,
      prePublicationQualityResultId: preQuality?.id ?? null,
      qualityResultId: postQuality?.id ?? null,
      quality: {
        prePublication: { status: assessment.overallStatus, score: assessment.score },
        postPublication: { status: postAssessment.overallStatus, score: postAssessment.score },
      },
      correlationId,
    });

    await brainRepository.updateClaimedTask(taskId, claimToken, {
      status: 'completed',
      recommendation: `Published article ${articleId} from automation job ${jobId} under approval ${decision.approvalId}`,
      completedAt: true,
    });

    await brainRepository.setExecutionPlanState(planId, 'completed', { completedAt: new Date().toISOString() });
    await brainRepository.updateStrategy(strategyId, { status: 'completed' });
    await brainRepository.updateOpportunity(opportunityId, { status: 'executed' });

    return {
      taskId,
      outcome: 'completed',
      automationJobId: jobId,
      articleId,
      qualityResultId: postQuality?.id ?? undefined,
      publicUrl,
    };
  }

  private async recordEvidence(taskId: string, claimToken: string, evidence: Record<string, unknown>): Promise<void> {
    await brainRepository.updateClaimedTask(taskId, claimToken, { evidence });
  }

  private async failTask(taskId: string, claimToken: string, reason: string): Promise<WorkerOutcome> {
    logger.error(`BrainTask ${taskId} failed: ${reason}`);
    await brainRepository.updateClaimedTask(taskId, claimToken, {
      status: 'failed',
      recommendation: reason,
      completedAt: true,
    });
    return { taskId, outcome: 'failed', reason };
  }

  /** Backwards-compatible entry point. Returns the worker outcome verbatim. */
  async processSingleTask(taskId: string): Promise<{ success: boolean; error?: string; outcome?: WorkerOutcome }> {
    const outcome = await this.runTask(taskId);
    return {
      success: outcome.outcome === 'completed',
      error: outcome.outcome === 'completed' ? undefined : outcome.reason,
      outcome,
    };
  }

  getWorkerId(): string {
    return this.workerId;
  }

  getClaimLeaseSeconds(): number {
    return this.config.claimLeaseSeconds;
  }
}

export const brainTaskWorker = new BrainTaskWorker();
