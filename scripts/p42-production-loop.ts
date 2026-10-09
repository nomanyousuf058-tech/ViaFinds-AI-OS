import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';

import { ResearchEngine } from '@/lib/brain/researchEngine';
import { OpportunityEngine } from '@/lib/brain/opportunityEngine';
import { StrategyEngine } from '@/lib/brain/strategyEngine';
import { ExecutionPlanner } from '@/lib/brain/executionPlanner';
import { ApprovalWorkflow } from '@/lib/brain/permissions';
import { BrainTaskWorker } from '@/lib/brain/brainTaskWorker';
import { LearningEngine } from '@/lib/brain/learningEngine';
import { publicationVerifier } from '@/lib/brain/publicationVerification';
import { brainRepository } from '@/lib/db/repositories/brain';
import { generateCorrelationId } from '@/lib/brain/types';
import { disconnect } from '@/lib/db/client';

const STATE_FILE = path.join(process.cwd(), 'data', 'p42-run-state.json');

interface RunState {
  correlationId: string;
  researchId: string;
  query: string;
  sourceIds: string[];
  opportunityId: string;
  strategyId: string;
  planId: string;
  idempotencyKey: string;
  taskId: string;
  approvalId: string;
  approvedBy?: string;
  approvedVia?: string;
  automationJobId?: string;
  articleId?: string;
  qualityResultId?: string;
  verificationId?: string;
  learningId?: string | null;
  learningDecision?: string;
  publicUrl?: string;
  deviations?: string[];
  log: string[];
}

function save(state: RunState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function load(): RunState {
  if (!fs.existsSync(STATE_FILE)) throw new Error(`No run state at ${STATE_FILE}. Run "prepare" first.`);
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as RunState;
}

function log(state: RunState, line: string): void {
  state.log.push(line);
  console.log(line);
  save(state);
}

// ─────────────────────────────────────────────────────────────
// Steps [4/7] → [6/7]: execution plan → brain task → pending approval.
// Shared by a fresh `prepare` and by `resume-plan`, which continues an
// already-persisted opportunity/strategy lineage instead of creating a
// duplicate one.
// ─────────────────────────────────────────────────────────────
async function planAndRequestApproval(input: {
  correlationId: string;
  researchId: string;
  opportunityId: string;
  strategyId: string;
  sourceIds: string[];
  opportunityConfidence: string;
  query?: string;
  startAt: number;
}): Promise<void> {
  const { correlationId, opportunityId, strategyId, startAt } = input;
  const strategyRow = await brainRepository.getTraceableStrategy(strategyId);
  if (!strategyRow) throw new Error(`Strategy ${strategyId} not found`);
  const title = String(strategyRow.title);

  const planner = new ExecutionPlanner(correlationId);
  console.log(`\n[${startAt}/7] Creating the real execution plan...`);
  const plan = await planner.createPlanFromStrategy(strategyId);
  console.log(`      EXECUTION_PLAN_ID : ${plan.id}`);
  console.log(`      status            : ${plan.status}`);
  console.log(`      target_automation : ${plan.targetAutomation}`);
  console.log(`      requiredPermissions: ${plan.requiredPermissions.join(', ')}`);
  console.log(`      approval_required : ${plan.approvalRequired}`);
  console.log(`      idempotency_key   : ${plan.idempotencyKey}`);
  for (const a of plan.actions) {
    console.log(`        - ${a.id} [${a.permission}] ${a.automationType}: ${a.description}`);
  }

  console.log(`\n[${startAt + 1}/7] Creating the brain task in AWAITING_APPROVAL...`);
  // Keyed by plan, so a re-planned lineage (a superseding plan) gets its own
  // task instead of colliding with the task of the plan it replaces.
  const taskKey = `task-${plan.id}`;
  const existingTask = await brainRepository.findTaskByIdempotencyKey(taskKey);
  if (existingTask) {
    throw new Error(`Duplicate execution refused: a task already exists for this lineage (${existingTask.id})`);
  }
  const generateAction = plan.actions.find((a) => a.automationType === 'generate_content')!;
  const task = await brainRepository.createTraceableTask({
    type: 'create_automation_job',
    title: `Execute: ${title}`,
    goal: generateAction.description,
    priority: 'high',
    strategyId,
    opportunityId,
    executionPlanId: plan.id,
    correlationId,
    idempotencyKey: taskKey,
    inputs: { automationType: generateAction.automationType, automationParams: generateAction.automationParams },
    context: { correlationId, planId: plan.id },
    provenance: 'REAL',
    initialStatus: 'awaiting_approval',
  });
  if (!task) throw new Error('Failed to create brain task');
  console.log(`      BRAIN_TASK_ID : ${task.id}`);
  console.log(`      status        : awaiting_approval`);
  console.log(`      idempotency   : ${taskKey}`);

  console.log(`\n[${startAt + 2}/7] Requesting approval (status = pending)...`);
  const approvals = new ApprovalWorkflow(correlationId);
  const approval = await approvals.requestExecutionApproval({
    taskId: task.id,
    strategyId,
    executionPlanId: plan.id,
    requiredPermission: 'EXECUTE',
    targetAutomation: 'AutomationPipeline.runDirect + runPublishDraft',
    proposedAction: {
      description: generateAction.description,
      topic: generateAction.automationParams.topic,
      category: generateAction.automationParams.category,
    },
    evidence: {
      opportunityId,
      strategyId,
      executionPlanId: plan.id,
      sourceIds: input.sourceIds,
      researchId: input.researchId,
      confidence: input.opportunityConfidence,
    },
  });
  if (!approval) throw new Error('Failed to create approval record');
  await brainRepository.updateTask(task.id, {
    status: 'awaiting_approval',
    approval_state: 'pending',
    approval_id: approval.id,
  });
  console.log(`      APPROVAL_ID  : ${approval.id}`);
  console.log(`      status       : ${approval.status}`);
  console.log(`      created_at   : ${approval.createdAt}`);
  console.log(`      permission   : EXECUTE`);

  const state: RunState = {
    correlationId,
    researchId: input.researchId,
    query: input.query || String(strategyRow.title ?? ''),
    sourceIds: input.sourceIds,
    opportunityId,
    strategyId,
    planId: plan.id,
    idempotencyKey: plan.idempotencyKey,
    taskId: task.id,
    approvalId: approval.id,
    log: [],
  };
  save(state);
  log(state, `\nPREPARE COMPLETE. Approve the request, then run: p42-production-loop execute`);
}

/**
 * Retry a failed execution on the same approved plan.
 *
 * A retry is a NEW task and a NEW approval request: the previous approval was
 * already consumed by the failed attempt and is never reused. The plan is
 * re-opened from `failed` back to `awaiting_approval` so a human must decide
 * again before anything executes.
 */
async function retryTask(previousTaskId: string): Promise<void> {
  const state = load();
  console.log(`\n=== PHASE 4.2 — RETRY OF FAILED TASK ${previousTaskId} ===`);

  const previous = await brainRepository.getTask(previousTaskId);
  if (!previous) throw new Error(`Task ${previousTaskId} not found`);
  if (previous.status !== 'failed' && previous.status !== 'cancelled') {
    throw new Error(
      `Only a failed or cancelled task may be retried; task ${previousTaskId} is "${previous.status}"`
    );
  }

  const planId = String(previous.execution_plan_id);
  const plan = await brainRepository.getTraceableExecutionPlan(planId);
  if (!plan) throw new Error(`Execution plan ${planId} not found`);

  const actions = (plan.actions as Array<{ id: string; automationType: string; description: string; automationParams: Record<string, unknown> }>) || [];
  const generateAction = actions.find((a) => a.automationType === 'generate_content');
  if (!generateAction) throw new Error(`Plan ${planId} has no generate_content action`);

  await brainRepository.setExecutionPlanState(planId, 'awaiting_approval');
  console.log(`PLAN_STATUS  : ${planId} -> awaiting_approval`);

  const retryPrefix = `task-${planId}-retry`;
  const existingRetries = (await brainRepository.listTasks(500)).filter(
    (t) => String(t.idempotency_key || '').startsWith(retryPrefix)
  );
  const attempt = existingRetries.length + 1;
  const taskKey = `${retryPrefix}${attempt}`;

  const task = await brainRepository.createTraceableTask({
    type: 'create_automation_job',
    title: `Retry: ${String((await brainRepository.getTraceableStrategy(state.strategyId))?.title ?? '')}`,
    goal: generateAction.description,
    priority: 'high',
    strategyId: state.strategyId,
    opportunityId: state.opportunityId,
    executionPlanId: planId,
    correlationId: state.correlationId,
    idempotencyKey: taskKey,
    inputs: { automationType: generateAction.automationType, automationParams: generateAction.automationParams },
    context: { correlationId: state.correlationId, planId, retryOf: previousTaskId },
    provenance: 'REAL',
    initialStatus: 'awaiting_approval',
  });
  if (!task) throw new Error('Failed to create retry task');
  console.log(`BRAIN_TASK_ID: ${task.id} (retry of ${previousTaskId})`);

  const approvals = new ApprovalWorkflow(state.correlationId);
  const approval = await approvals.requestExecutionApproval({
    taskId: task.id,
    strategyId: state.strategyId,
    executionPlanId: planId,
    requiredPermission: 'EXECUTE',
    targetAutomation: 'AutomationPipeline.runDirect + runPublishDraft',
    proposedAction: {
      description: generateAction.description,
      topic: generateAction.automationParams.topic,
      category: generateAction.automationParams.category,
    },
    evidence: {
      opportunityId: state.opportunityId,
      strategyId: state.strategyId,
      executionPlanId: planId,
      sourceIds: state.sourceIds,
      researchId: state.researchId,
      retryOf: previousTaskId,
    },
  });
  if (!approval) throw new Error('Failed to create retry approval');
  await brainRepository.updateTask(task.id, {
    status: 'awaiting_approval',
    approval_state: 'pending',
    approval_id: approval.id,
  });
  console.log(`APPROVAL_ID  : ${approval.id} (status=${approval.status})`);

  state.taskId = task.id;
  state.approvalId = approval.id;
  state.approvedBy = undefined;
  state.approvedVia = undefined;
  state.automationJobId = undefined;
  state.articleId = undefined;
  state.qualityResultId = undefined;
  state.verificationId = undefined;
  state.learningId = null;
  state.learningDecision = undefined;
  state.publicUrl = undefined;
  state.deviations = undefined;
  log(state, `retry attempt ${attempt}: new task ${task.id} awaiting a fresh approval`);
  printTrace(state);
}

// ─────────────────────────────────────────────────────────────
// PHASE 1: research → sources → opportunity → strategy → plan
//          → task → approval request (pending)
// ─────────────────────────────────────────────────────────────
async function prepare(query: string): Promise<void> {
  const correlationId = generateCorrelationId();
  console.log(`\n=== PHASE 4.2 PRODUCTION LOOP — PREPARE ===`);
  console.log(`CORRELATION_ID: ${correlationId}`);
  console.log(`RESEARCH QUERY : ${query}\n`);

  const researchEngine = new ResearchEngine(correlationId);
  console.log('[1/7] Running REAL research through SearchRouter...');
  const research = await researchEngine.research(query, { numResults: 10 });
  console.log(`      provider=${research.provider} providers=${research.providers_used.join(',')}`);
  console.log(`      research_confidence=${research.research_confidence}`);
  console.log(`      persisted source records=${research.sources.length}`);
  for (const s of research.sources) {
    console.log(`        ${s.source_id}  ${s.provider}  ${s.url}`);
  }
  if (research.sources.length === 0) throw new Error('No source records persisted — aborting');

  const opportunityEngine = new OpportunityEngine(correlationId);
  console.log('\n[2/7] Deriving ONE evidence-grounded opportunity...');
  const opportunity = await opportunityEngine.detectFromResearch(research);
  console.log(`      OPPORTUNITY_ID: ${opportunity.id}`);
  console.log(`      title        : ${opportunity.title}`);
  console.log(`      type/category: ${opportunity.type}`);
  console.log(`      confidence   : ${opportunity.confidence} (score ${opportunity.confidenceScore})`);
  console.log(`      impact       : ${opportunity.impact} (brain inference, not an external measurement)`);
  console.log(`      source_ids   : ${opportunity.sourceIds.join(', ')}`);
  console.log(`      EXTERNAL_EVIDENCE (${opportunity.structuredObservation.external_evidence.length}):`);
  for (const e of opportunity.structuredObservation.external_evidence) {
    console.log(`        [${e.source_id}] ${e.claim}`);
    console.log(`            quote: "${e.quote.slice(0, 140)}"`);
  }
  console.log(`      BRAIN_INFERENCE (${opportunity.structuredObservation.brain_inference.length}):`);
  for (const i of opportunity.structuredObservation.brain_inference) {
    console.log(`        - ${i.statement} [impact=${i.impact}]`);
  }
  console.log(`      RECOMMENDATION (${opportunity.structuredObservation.recommendation.length}):`);
  for (const r of opportunity.structuredObservation.recommendation) console.log(`        - ${r.action}`);
  console.log(`      ASSUMPTION (${opportunity.structuredObservation.assumptions.length}):`);
  for (const a of opportunity.structuredObservation.assumptions) console.log(`        - ${a.assumption}`);
  if (opportunity.rejected.length > 0) {
    console.log(`      REJECTED CLAIMS (${opportunity.rejected.length}) — not presented as external facts:`);
    for (const r of opportunity.rejected) console.log(`        - "${r.claim}": ${r.reason}`);
  }

  const strategyEngine = new StrategyEngine(correlationId);
  console.log('\n[3/7] Creating ONE real strategy bound to that opportunity...');
  const sources = await researchEngine.loadSources(research.research_id);
  const strategy = await strategyEngine.createStrategyFromOpportunity(opportunity.id, sources);
  if (!strategy) throw new Error('Strategy creation returned null');
  const strategyRow = await brainRepository.getTraceableStrategy(strategy.id);
  console.log(`      STRATEGY_ID  : ${strategy.id}`);
  console.log(`      title       : ${strategyRow?.title}`);
  console.log(`      businessGoal: ${strategyRow?.business_goal}`);
  console.log(`      proposedAction: ${strategyRow?.proposed_action}`);
  console.log(`      contentApproach: ${String(strategyRow?.content_approach).slice(0, 220)}`);
  console.log(`      risks       : ${JSON.stringify(strategyRow?.risks)}`);
  console.log(`      dependencies: ${JSON.stringify(strategyRow?.dependencies)}`);
  console.log(`      executionRequirements: ${JSON.stringify(strategyRow?.execution_requirements)}`);
  console.log(`      approval_required: ${strategyRow?.approval_required}`);
  console.log(`      warnings    : ${strategy.warnings.join(' | ') || 'none'}`);

  const planner = new ExecutionPlanner(correlationId);
  void planner;
  await planAndRequestApproval({
    correlationId,
    researchId: research.research_id,
    opportunityId: opportunity.id,
    strategyId: strategy.id,
    sourceIds: opportunity.sourceIds,
    opportunityConfidence: opportunity.confidence,
    startAt: 4,
  });
}

/** Continue an already-persisted opportunity/strategy lineage at the plan step. */
async function resumePlan(strategyId: string): Promise<void> {
  console.log(`\n=== PHASE 4.2 PRODUCTION LOOP — RESUME PLAN (no new research) ===`);
  const strategyRow = await brainRepository.getTraceableStrategy(strategyId);
  if (!strategyRow) throw new Error(`Strategy ${strategyId} not found`);
  const correlationId = String(strategyRow.correlation_id);
  const opportunityId = String(strategyRow.opportunity_id);
  const opportunity = await brainRepository.getTraceableOpportunity(opportunityId);
  if (!opportunity) throw new Error(`Opportunity ${opportunityId} not found`);
  const sourceIds = (opportunity.source_ids as string[]) || [];
  const researchId = String(opportunity.research_id);
  const researchRun = researchId ? await brainRepository.getResearchRun(researchId) : null;
  const query = String(researchRun?.query ?? opportunity.title ?? '');
  console.log(`CORRELATION_ID: ${correlationId}`);
  console.log(`OPPORTUNITY_ID: ${opportunityId}`);
  console.log(`STRATEGY_ID  : ${strategyId}`);
  console.log(`SOURCE_IDS   : ${sourceIds.join(', ')}`);

  await planAndRequestApproval({
    correlationId,
    researchId: String(opportunity.research_id),
    opportunityId,
    strategyId,
    sourceIds,
    opportunityConfidence: String(opportunity.confidence),
    query,
    startAt: 4,
  });
}

// ─────────────────────────────────────────────────────────────
// PHASE 2: real admin approval through the HTTP API
// ─────────────────────────────────────────────────────────────
async function approve(baseUrl: string): Promise<void> {
  const state = load();
  console.log(`\n=== PHASE 4.2 — ADMIN APPROVAL VIA API (${baseUrl}) ===`);

  const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password) throw new Error('INITIAL_ADMIN_PASSWORD is not set; cannot perform a real admin login');

  console.log(`[1] POST ${baseUrl}/api/auth/login as ${email}`);
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = login.headers.get('set-cookie') || '';
  if (!login.ok) {
    throw new Error(`Admin login failed: HTTP ${login.status} ${await login.text()}`);
  }
  const cookie = setCookie.split(';')[0];
  console.log(`    HTTP ${login.status}; session cookie acquired: ${cookie.split('=')[0]}=<redacted>`);

  console.log(`[2] GET ${baseUrl}/api/brain/approvals?status=pending`);
  const listRes = await fetch(`${baseUrl}/api/brain/approvals?status=pending&limit=200`, {
    headers: { cookie },
  });
  const listBody = (await listRes.json()) as { approvals?: Array<{ id: string }> };
  console.log(`    HTTP ${listRes.status}; pending approvals: ${listBody.approvals?.length ?? 0}`);
  if (!listBody.approvals?.some((a) => a.id === state.approvalId)) {
    throw new Error(`Approval ${state.approvalId} is not in the pending list returned by the API`);
  }

  console.log(`[3] POST ${baseUrl}/api/brain/approvals/${state.approvalId} {decision: approved}`);
  const decideRes = await fetch(`${baseUrl}/api/brain/approvals/${state.approvalId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      decision: 'approved',
      reason: 'Evidence-grounded strategy from persisted source records; execution plan targets the existing AutomationPipeline only.',
    }),
  });
  const decideBody = (await decideRes.json()) as { success?: boolean; error?: string; approval?: Record<string, unknown> };
  if (!decideRes.ok || !decideBody.success) {
    throw new Error(`Approval failed: HTTP ${decideRes.status} ${decideBody.error ?? ''}`);
  }
  console.log(`    HTTP ${decideRes.status}; status=${decideBody.approval?.status} decided_by=${decideBody.approval?.decided_by}`);

  state.approvedBy = String(decideBody.approval?.decided_by ?? '');
  state.approvedVia = `${baseUrl}/api/brain/approvals/${state.approvalId}`;
  save(state);
  log(state, `\nAPPROVAL COMPLETE via the real admin API.`);
}

// ─────────────────────────────────────────────────────────────
// PHASE 3: worker execution → quality → verification → learning
// ─────────────────────────────────────────────────────────────
async function execute(): Promise<void> {
  const state = load();
  console.log(`\n=== PHASE 4.2 — WORKER EXECUTION ===`);
  console.log(`BRAIN_TASK_ID: ${state.taskId}\n`);

  const worker = new BrainTaskWorker();
  const outcome = await worker.runTask(state.taskId);

  const task = await brainRepository.getTask(state.taskId);
  const plan = await brainRepository.getTraceableExecutionPlan(state.planId);
  console.log(`\nworker outcome : ${outcome.outcome}`);
  if (outcome.reason) console.log(`reason         : ${outcome.reason}`);
  console.log(`task status    : ${task?.status}`);
  console.log(`approval_state : ${task?.approval_state}`);
  console.log(`plan status    : ${plan?.status}`);

  if (outcome.outcome !== 'completed') {
    state.automationJobId = outcome.automationJobId;
    save(state);
    log(state, `\nEXECUTION DID NOT COMPLETE. Verification and learning are not run.`);
    process.exitCode = 1;
    return;
  }

  state.automationJobId = outcome.automationJobId;
  state.articleId = outcome.articleId;
  state.qualityResultId = outcome.qualityResultId;
  state.publicUrl = outcome.publicUrl;

  // ── Verification ──
  console.log(`\n[verification] Probing the public URL and analytics integrations...`);
  const verification = await publicationVerifier.verify({
    articleId: outcome.articleId!,
    correlationId: state.correlationId,
    publicUrl: outcome.publicUrl!,
    expectedOutcome: 'Article is publicly reachable and carries the full execution lineage',
  });
  const verificationId = await publicationVerifier.persist(verification);
  state.verificationId = verificationId ?? undefined;
  console.log(`  status        : ${verification.status}`);
  console.log(`  http          : ${verification.httpStatus}`);
  console.log(`  observations  : ${verification.availableObservations.map((o) => o.name).join(', ')}`);
  console.log(`  unavailable   : ${verification.unavailableProbes.map((o) => o.name).join(', ')}`);
  for (const l of verification.limitations) console.log(`  limitation    : ${l}`);

  // ── Learning (only if a legitimate reusable lesson exists) ──
  console.log(`\n[learning] Asking the Learning Engine whether a reusable lesson exists...`);
  const evidence = (task?.evidence as Record<string, unknown>) || {};
  const qualityBlock = (evidence.quality as Record<string, any>) || {};
  const warnings: string[] = [
    ...((qualityBlock.postPublication?.warnings as string[]) || []),
  ];
  const deviations: string[] = [];
  if (qualityBlock.prePublication && qualityBlock.postPublication) {
    if (qualityBlock.prePublication.status !== 'PASS') {
      deviations.push(`pre-publication quality gate returned ${qualityBlock.prePublication.status} (score ${qualityBlock.prePublication.score})`);
    }
  }
  if (warnings.length > 0) {
    deviations.push(`${warnings.length} post-publication quality warning(s) were accepted without remediation`);
  }

  const learningEngine = new LearningEngine(state.correlationId);
  const learning = await learningEngine.considerExecutionLearning({
    correlationId: state.correlationId,
    sourceEvent: 'approved brain task → article publication',
    taskId: state.taskId,
    strategyId: state.strategyId,
    executionPlanId: state.planId,
    opportunityId: state.opportunityId,
    articleId: outcome.articleId,
    expected: 'A task with a valid approval publishes a fully traceable article',
    actual: `Published article ${outcome.articleId} from job ${outcome.automationJobId}`,
    success: true,
    evidence: { quality: qualityBlock, verificationStatus: verification.status, httpStatus: verification.httpStatus },
    deviations,
    qualityWarnings: warnings,
  });
  state.learningId = learning.persisted ? learning.id ?? null : null;
  state.learningDecision = learning.reason;
  state.deviations = deviations;
  console.log(`  persisted     : ${learning.persisted}`);
  console.log(`  decision      : ${learning.reason}`);
  if (learning.lesson) console.log(`  lesson        : ${learning.lesson}`);

  save(state);
  printTrace(state);
}

/**
 * Re-run verification (and the learning decision) for an already published
 * article. Used when the first verification attempt could not form a public
 * URL; the article is NOT republished and no state is forced.
 */
async function verify(): Promise<void> {
  const state = load();
  if (!state.articleId) throw new Error('No article recorded in the run state; run execute first');

  const article = await brainRepository.getArticle(state.articleId);
  if (!article) throw new Error(`Article ${state.articleId} is not in the database`);

  const slug = String(article.slug || '');
  const publicUrl = slug.startsWith('http') ? slug : `https://viafinds.com/articles/${slug}`;
  state.publicUrl = publicUrl;
  console.log(`\n=== PHASE 4.2 — VERIFICATION RE-RUN ===`);
  console.log(`ARTICLE_ID : ${state.articleId}`);
  console.log(`SLUG       : ${slug}`);
  console.log(`PUBLIC_URL : ${publicUrl}\n`);

  const verification = await publicationVerifier.verify({
    articleId: state.articleId,
    correlationId: state.correlationId,
    publicUrl,
    expectedOutcome: 'Article is publicly reachable and carries the full execution lineage',
  });
  const verificationId = await publicationVerifier.persist(verification);
  state.verificationId = verificationId ?? undefined;
  console.log(`  status        : ${verification.status}`);
  console.log(`  http          : ${verification.httpStatus}`);
  console.log(`  observations  : ${verification.availableObservations.map((o) => o.name).join(', ')}`);
  console.log(`  unavailable   : ${verification.unavailableProbes.map((o) => o.name).join(', ')}`);
  for (const l of verification.limitations) console.log(`  limitation    : ${l}`);

  save(state);
  printTrace(state);
}

function printTrace(state: RunState): void {
  console.log(`\n=== FINAL CORRELATION TRACE ===`);
  console.log(`CORRELATION_ID: ${state.correlationId}`);
  console.log(`SOURCE_IDS: ${state.sourceIds.join(', ')}`);
  console.log(`RESEARCH_ID: ${state.researchId}`);
  console.log(`OPPORTUNITY_ID: ${state.opportunityId}`);
  console.log(`STRATEGY_ID: ${state.strategyId}`);
  console.log(`EXECUTION_PLAN_ID: ${state.planId}`);
  console.log(`APPROVAL_ID: ${state.approvalId}`);
  console.log(`BRAIN_TASK_ID: ${state.taskId}`);
  console.log(`AUTOMATION_JOB_ID: ${state.automationJobId ?? 'NONE'}`);
  console.log(`ARTICLE_ID: ${state.articleId ?? 'NONE'}`);
  console.log(`QUALITY_RESULT_ID: ${state.qualityResultId ?? 'NONE'}`);
  console.log(`VERIFICATION_ID: ${state.verificationId ?? 'NONE'}`);
  console.log(`LEARNING_ID: ${state.learningId ?? 'NOT CREATED (no legitimate lesson)'}`);
  console.log(`PUBLIC_URL: ${state.publicUrl ?? 'NONE'}`);
  console.log(`APPROVED_VIA: ${state.approvedVia ?? 'n/a'}`);
}

// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'prepare':
      await prepare(args[0] || 'best AI note-taking app comparison 2026');
      break;
    case 'resume-plan':
      if (!args[0]) throw new Error('resume-plan requires a strategy id');
      await resumePlan(args[0]);
      break;
    case 'approve':
      await approve(args[0] || 'http://localhost:3100');
      break;
    case 'retry':
      if (!args[0]) throw new Error('retry requires the failed task id');
      await retryTask(args[0]);
      break;
    case 'execute':
      await execute();
      break;
    case 'verify':
      await verify();
      break;
    case 'trace':
      printTrace(load());
      break;
    default:
      console.log(
        'Usage: p42-production-loop <prepare [query] | resume-plan <strategyId> | retry <failedTaskId> | approve [baseUrl] | execute | verify | trace>'
      );
      process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('\nPHASE 4.2 FAILED:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
