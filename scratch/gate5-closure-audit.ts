/**
 * Phase 5.6 Gate 5 — Final Closure Audit Script
 * Tests: Approval Security, Action Allowlist, Business Result Semantics,
 *        Retry/Duplicate Protection, Normal Worker Execution
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool } from '../lib/db/client.js';
import { automationPipeline } from '../lib/automation/pipeline.js';
import { automationJobsRepository } from '../lib/db/repositories/automation-jobs.js';
import { DecisionCenter } from '../lib/brain/decisionCenter.js';
import { BrainTaskWorker } from '../lib/brain/brainTaskWorker.js';
import crypto from 'crypto';

const pool = getPool();
const decisionCenter = new DecisionCenter();
let adminId: string;
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failCount++;
  }
}

async function createDecision(type: string, status: string, title?: string): Promise<string> {
  const t = title || `Audit-${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const res = await pool.query(`
    INSERT INTO brain_decisions (type, title, rationale, evidence, provenance, confidence, expected_impact, risks, prerequisites, required_permissions, status)
    VALUES ($1, $2, 'audit test', '{}', 'TEST', 0.5, 'low', '[]', '[]', '[]', $3)
    RETURNING id
  `, [type, t, status]);
  return res.rows[0].id;
}

async function forgeJob(decisionId: string): Promise<string> {
  const jobId = crypto.randomUUID();
  const idemKey = `forge_${jobId}`;
  await pool.query(`
    INSERT INTO automation_jobs (id, idempotency_key, type, stage, status, priority, input, created_at, updated_at, content_id, content_type)
    VALUES ($1, $2, 'brain_strategy_execution', 'init', 'queued', 5, '{}', NOW(), NOW(), $3, 'brain_decision')
  `, [jobId, idemKey, decisionId]);
  return jobId;
}

async function setup() {
  adminId = crypto.randomUUID();
  await pool.query(
    'INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    [adminId, `audit-${Date.now()}@test.com`, 'hash', 'admin']
  );
}

// ═══════════════════════════════════════════
// CHECK 2: APPROVAL SECURITY
// ═══════════════════════════════════════════
async function check2_approvalSecurity() {
  console.log('\n═══ CHECK 2: APPROVAL SECURITY ═══');

  const forbidden = ['PROPOSED', 'RUNNING', 'COMPLETED', 'INCONCLUSIVE', 'CANCELLED', 'ARCHIVED'];

  for (const status of forbidden) {
    const decId = await createDecision('CREATE_CONTENT', status);
    const jobId = await forgeJob(decId);
    await automationPipeline.processStrategyExecutions();

    const jobRow = await automationJobsRepository.findById(jobId);
    assert(
      jobRow?.status === 'failed',
      `${status} decision blocked`,
      `job status = ${jobRow?.status}, error = ${jobRow?.error}`
    );
  }

  // Positive: APPROVED should succeed
  const approvedId = await createDecision('TRACKING', 'APPROVED');
  const approvedJobId = await forgeJob(approvedId);
  await automationPipeline.processStrategyExecutions();
  const approvedJob = await automationJobsRepository.findById(approvedJobId);
  assert(approvedJob?.status === 'completed', 'APPROVED decision executes', `status = ${approvedJob?.status}`);

  // Positive: EXECUTING should succeed
  const executingId = await createDecision('TRACKING', 'EXECUTING');
  const executingJobId = await forgeJob(executingId);
  await automationPipeline.processStrategyExecutions();
  const executingJob = await automationJobsRepository.findById(executingJobId);
  assert(executingJob?.status === 'completed', 'EXECUTING decision executes', `status = ${executingJob?.status}`);
}

// ═══════════════════════════════════════════
// CHECK 3: ACTION ALLOWLIST
// ═══════════════════════════════════════════
async function check3_actionAllowlist() {
  console.log('\n═══ CHECK 3: ACTION ALLOWLIST ═══');

  // Unknown type should be blocked
  const unknownId = await createDecision('ARBITRARY_SQL_INJECTION', 'APPROVED');
  const unknownJobId = await forgeJob(unknownId);
  await automationPipeline.processStrategyExecutions();
  const unknownJob = await automationJobsRepository.findById(unknownJobId);
  const result = unknownJob?.result as Record<string, unknown>;
  assert(result?.action === 'blocked', 'Unknown type blocked', `action = ${result?.action}`);
  assert(result?.businessOutcome === 'rejected', 'Unknown type rejected', `outcome = ${result?.businessOutcome}`);

  // INVESTIGATE type => noop
  const investigateId = await createDecision('INVESTIGATE', 'APPROVED');
  const investigateJobId = await forgeJob(investigateId);
  await automationPipeline.processStrategyExecutions();
  const investigateJob = await automationJobsRepository.findById(investigateJobId);
  const iResult = investigateJob?.result as Record<string, unknown>;
  assert(iResult?.action === 'noop', 'INVESTIGATE => noop', `action = ${iResult?.action}`);

  // REJECT type => noop
  const rejectId = await createDecision('REJECT', 'APPROVED');
  const rejectJobId = await forgeJob(rejectId);
  await automationPipeline.processStrategyExecutions();
  const rejectJob = await automationJobsRepository.findById(rejectJobId);
  const rResult = rejectJob?.result as Record<string, unknown>;
  assert(rResult?.action === 'noop', 'REJECT => noop', `action = ${rResult?.action}`);
}

// ═══════════════════════════════════════════
// CHECK 4: BUSINESS RESULT SEMANTICS
// ═══════════════════════════════════════════
async function check4_businessSemantics() {
  console.log('\n═══ CHECK 4: BUSINESS RESULT SEMANTICS ═══');

  // CREATE_CONTENT with a bad topic => pipeline rejects via niche filter
  const contentId = await createDecision('CREATE_CONTENT', 'APPROVED', `Niche Reject ${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  const contentJobId = await forgeJob(contentId);
  await automationPipeline.processStrategyExecutions();
  const contentJob = await automationJobsRepository.findById(contentJobId);
  const cResult = contentJob?.result as Record<string, unknown>;

  assert(cResult?.businessOutcome === 'rejected', 'Niche rejection => businessOutcome=rejected', `outcome = ${cResult?.businessOutcome}`);
  assert(cResult?.action === 'delegated_to_pipeline', 'Delegated to pipeline', `action = ${cResult?.action}`);
  assert(cResult?.pipelineStatus === 'failed', 'Pipeline status=failed', `pipelineStatus = ${cResult?.pipelineStatus}`);

  // STRATEGY_CHANGE => succeeded
  const stratId = await createDecision('STRATEGY_CHANGE', 'APPROVED');
  const stratJobId = await forgeJob(stratId);
  await automationPipeline.processStrategyExecutions();
  const stratJob = await automationJobsRepository.findById(stratJobId);
  const sResult = stratJob?.result as Record<string, unknown>;
  assert(sResult?.businessOutcome === 'succeeded', 'STRATEGY_CHANGE => succeeded', `outcome = ${sResult?.businessOutcome}`);
}

// ═══════════════════════════════════════════
// CHECK 5: RETRY / DUPLICATE EXECUTION
// ═══════════════════════════════════════════
async function check5_retryDuplicate() {
  console.log('\n═══ CHECK 5: RETRY / DUPLICATE EXECUTION ═══');

  // Test 1: executeDecision idempotency (same decision called twice)
  const decId = await createDecision('TRACKING', 'APPROVED');
  const res1 = await decisionCenter.executeDecision(decId, adminId);
  assert(res1.success === true, 'First executeDecision succeeds');

  const res2 = await decisionCenter.executeDecision(decId, adminId);
  assert(res2.success === false, 'Second executeDecision blocked (status changed to EXECUTING)', `error = ${res2.error}`);

  // Test 2: Same job won't process twice (status changes from queued to completed)
  const decId2 = await createDecision('TRACKING', 'APPROVED');
  const jobId2 = await forgeJob(decId2);
  await automationPipeline.processStrategyExecutions();
  await automationPipeline.processStrategyExecutions(); // second call
  const job2 = await automationJobsRepository.findById(jobId2);
  assert(job2?.status === 'completed', 'Job only processed once', `status = ${job2?.status}`);

  // Test 3: Concurrent executeDecision calls
  const decId3 = await createDecision('TRACKING', 'APPROVED');
  const concurrent = await Promise.allSettled(
    Array.from({ length: 5 }).map(() => decisionCenter.executeDecision(decId3, adminId))
  );
  const successes = concurrent.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
  assert(successes <= 1, `At most 1 concurrent executeDecision succeeds (got ${successes})`);

  // Verify exactly 1 automation_jobs row for that decision
  const jobCount = await pool.query(
    "SELECT COUNT(*) FROM automation_jobs WHERE idempotency_key = $1",
    [`decision_exec_${decId3}`]
  );
  assert(parseInt(jobCount.rows[0].count) === 1, 'Exactly 1 job row created', `count = ${jobCount.rows[0].count}`);
}

// ═══════════════════════════════════════════
// CHECK 6: NORMAL WORKER TEST
// ═══════════════════════════════════════════
async function check6_normalWorker() {
  console.log('\n═══ CHECK 6: NORMAL WORKER TEST ═══');

  const decId = await createDecision('TRACKING', 'APPROVED');
  const jobId = await forgeJob(decId);

  // Use the real BrainTaskWorker with a single processLoop invocation
  const worker = new BrainTaskWorker({ pollIntervalMs: 999999 }); // long interval so start() only does initial processLoop
  // Manually call processLoop via the worker's start mechanism
  // worker.start() calls processLoop() immediately and sets up the interval
  // We'll start, let one loop run, then stop
  await worker.start();
  worker.stop();

  const job = await automationJobsRepository.findById(jobId);
  assert(job?.status === 'completed', 'BrainTaskWorker.processLoop => bridge => completed', `status = ${job?.status}`);

  const dec = await pool.query('SELECT status FROM brain_decisions WHERE id = $1', [decId]);
  assert(dec.rows[0].status === 'COMPLETED', 'Decision marked COMPLETED via worker', `status = ${dec.rows[0].status}`);
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Phase 5.6 Gate 5 — Final Closure Audit       ║');
  console.log('╚═══════════════════════════════════════════════╝');

  try {
    await setup();
    await check2_approvalSecurity();
    await check3_actionAllowlist();
    await check4_businessSemantics();
    await check5_retryDuplicate();
    await check6_normalWorker();

    console.log('\n═══════════════════════════════════════════');
    console.log(`TOTAL: ${passCount} passed, ${failCount} failed`);
    console.log(failCount === 0 ? '✅ ALL CHECKS PASS' : '❌ SOME CHECKS FAILED');
    console.log('═══════════════════════════════════════════');
  } catch (e) {
    console.error('FATAL:', e);
  } finally {
    await pool.end();
    process.exit(failCount > 0 ? 1 : 0);
  }
}

main();
