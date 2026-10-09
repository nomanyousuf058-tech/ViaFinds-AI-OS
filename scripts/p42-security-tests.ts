import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { SignJWT } from 'jose';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { BrainTaskWorker } from '@/lib/brain/brainTaskWorker';
import { brainRepository } from '@/lib/db/repositories/brain';
import { disconnect } from '@/lib/db/client';

/**
 * Phase 4.2 security negative tests.
 *
 * Every case asserts that a protection REJECTS an attempt. No case asserts
 * that a protected action succeeds. Nothing here writes a real article; the
 * database-level cases use temporary rows that are removed at the end.
 */

const BASE = process.env.P42_BASE_URL || 'http://localhost:3100';
const STATE = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'p42-run-state.json'), 'utf8')
) as {
  approvalId: string;
  taskId: string;
  planId: string;
  articleId: string;
  correlationId: string;
};

interface Case {
  name: string;
  expected: number | 'blocked' | 'rejected';
  actual: number | 'blocked' | 'rejected';
  note: string;
  pass: boolean;
}

const cases: Case[] = [];
function assertBlocked(name: string, actual: Case['actual'], expected: Case['expected'], note: string) {
  cases.push({ name, expected, actual, note, pass: actual === expected });
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });
  const plan = await brainRepository.getTraceableExecutionPlan(STATE.planId);

  // ── 1. Admin-only API endpoints reject unauthenticated callers ──
  const guarded = [
    '/api/brain/status',
    '/api/brain/approvals',
    '/api/brain/tasks',
    '/api/brain/strategies',
    '/api/brain/opportunities',
    '/api/brain/reports',
    '/api/brain/activity',
    '/api/brain/executions',
    '/api/brain/memory',
    '/api/brain/implementation-requests',
  ];
  for (const route of guarded) {
    const res = await fetch(`${BASE}${route}`);
    assertBlocked(`GET ${route} without a session`, res.status, 401, 'must not leak brain data anonymously');
  }

  // ── 2. A forged admin token is rejected ──
  const forged = await new SignJWT({ sub: 'attacker', email: 'attacker@example.com', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('not-the-real-admin-jwt-secret'));
  const forgedRes = await fetch(`${BASE}/api/brain/approvals`, {
    headers: { cookie: `admin_session=${forged}` },
  });
  assertBlocked('GET /api/brain/approvals with a forged JWT', forgedRes.status, 401, 'signature must be verified');

  // ── 3. A non-admin role token is rejected ──
  const realSecret = process.env.ADMIN_JWT_SECRET || '';
  const viewer = await new SignJWT({ sub: 'u1', email: 'viewer@example.com', role: 'viewer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(realSecret));
  const viewerRes = await fetch(`${BASE}/api/brain/status`, {
    headers: { cookie: `admin_session=${viewer}` },
  });
  assertBlocked('GET /api/brain/status with a non-admin role', viewerRes.status, 401, 'role must be admin');

  // ── 4. Admin login rejects bad credentials ──
  const badLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com',
      password: 'definitely-not-the-password',
    }),
  });
  assertBlocked('POST /api/auth/login with a wrong password', badLogin.status, 401, 'no session for bad credentials');

  // ── 5. Approval decision requires authentication ──
  const noAuthDecide = await fetch(`${BASE}/api/brain/approvals/${STATE.approvalId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'approved', reason: 'attempting an unauthenticated approval' }),
  });
  assertBlocked('POST approval without a session', noAuthDecide.status, 401, 'approval must require an admin session');

  // ── 6. An approval cannot be decided twice ──
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com',
      password: process.env.INITIAL_ADMIN_PASSWORD || '',
    }),
  });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  const redecide = await fetch(`${BASE}/api/brain/approvals/${STATE.approvalId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ decision: 'rejected', reason: 'second decision on an already-consumed approval' }),
  });
  assertBlocked('Re-decide an already approved approval', redecide.status, 409, 'single decision only');

  // ── 7. A decision without a real reason is rejected ──
  const noReason = await fetch(`${BASE}/api/brain/approvals/${STATE.approvalId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ decision: 'approved', reason: '' }),
  });
  assertBlocked('Approve with an empty reason', noReason.status, 400, 'a human-readable reason is mandatory');

  // ── 8. Unknown approval is a 404, not a silent success ──
  const unknown = await fetch(`${BASE}/api/brain/approvals/00000000-0000-0000-0000-000000000000`, {
    headers: { cookie },
  });
  assertBlocked('GET an unknown approval', unknown.status, 404, 'must not invent an approval');

  // ── 9/10. The publication quality trigger blocks a FAIL bypass ──
  // Uses a throwaway task so the real completed lineage is never touched.
  const tempTaskId = `99999999-0000-4000-8000-${String(Date.now()).slice(-12)}`;
  await pool.query(
    `INSERT INTO brain_tasks
       (id, type, title, goal, status, priority, strategy_id, opportunity_id, execution_plan_id, correlation_id, provenance, idempotency_key)
     VALUES ($1,'create_automation_job','security-negative-test: quality gate','n/a','queued','low',$2,$3,$4,$5,'TEST',$6)`,
    [tempTaskId, plan?.strategy_id, plan?.opportunity_id, STATE.planId, STATE.correlationId, `security-negative-${Date.now()}`]
  );

  const tempResult = await pool.query(
    `INSERT INTO brain_quality_results
       (execution_plan_id, target_id, target_type, overall_status, checks, brain_task_id, correlation_id, provenance)
     VALUES ($1,$2,'article','FAIL','[]'::jsonb,$3,$4,'TEST') RETURNING id`,
    [STATE.planId, tempTaskId, tempTaskId, STATE.correlationId]
  );
  assertBlocked(
    'A FAIL quality result can be recorded',
    tempResult.rowCount === 1 ? 'allowed' : 'blocked',
    'allowed',
    'recording a failure is required for the gate to have anything to read'
  );

  let publishBlocked = 'allowed';
  try {
    await pool.query(
      `INSERT INTO articles
         (title, slug, content, status, provenance, brain_task_id, automation_job_id, strategy_id, opportunity_id)
       VALUES ('security-negative-test', $1, '[]'::jsonb, 'published', 'TEST', $2, 'job_security_test', $3, $4)`,
      [`security-negative-test-${Date.now()}`, tempTaskId, plan?.strategy_id, plan?.opportunity_id]
    );
  } catch (e) {
    publishBlocked = `blocked: ${(e as Error).message.split('\n')[0]}`;
  }
  assertBlocked(
    'Publish an article whose latest quality result is FAIL',
    publishBlocked.startsWith('blocked') ? 'blocked' : 'allowed',
    'blocked',
    'database trigger must enforce the gate even if application code is bypassed'
  );

  // A draft (not published) row for the same task is still allowed, proving the
  // block is about publication and not about the insert itself.
  let draftBlocked = 'allowed';
  try {
    await pool.query(
      `INSERT INTO articles
         (title, slug, content, status, provenance, brain_task_id, automation_job_id, strategy_id, opportunity_id)
       VALUES ('security-negative-test', $1, '[]'::jsonb, 'draft', 'TEST', $2, 'job_security_test', $3, $4)`,
      [`security-negative-draft-${Date.now()}`, tempTaskId, plan?.strategy_id, plan?.opportunity_id]
    );
  } catch (e) {
    draftBlocked = `blocked: ${(e as Error).message.split('\n')[0]}`;
  }
  assertBlocked(
    'Create a draft while the quality result is FAIL',
    draftBlocked.startsWith('blocked') ? 'blocked' : 'allowed',
    'allowed',
    'drafting must stay possible; only publication is gated'
  );

  // ── Promote that draft to published: this must now be blocked ──
  let promoteBlocked = 'allowed';
  try {
    await pool.query(
      `UPDATE articles SET status='published' WHERE title='security-negative-test' AND status='draft'`
    );
  } catch (e) {
    promoteBlocked = `blocked: ${(e as Error).message.split('\n')[0]}`;
  }
  assertBlocked(
    'Promote a failing draft to published',
    promoteBlocked.startsWith('blocked') ? 'blocked' : 'allowed',
    'blocked',
    'the status update path must be gated as well as the insert path'
  );

  // Clean up the temporary rows
  await pool.query(`DELETE FROM articles WHERE title='security-negative-test'`);
  await pool.query(`DELETE FROM brain_quality_results WHERE brain_task_id=$1`, [tempTaskId]);
  await pool.query(`DELETE FROM brain_tasks WHERE id=$1`, [tempTaskId]);

  // ── 11. Article traceability is immutable ──
  let tamper = 'allowed';
  try {
    await pool.query(`UPDATE articles SET opportunity_id=NULL WHERE id=$1`, [STATE.articleId]);
  } catch (e) {
    tamper = `blocked: ${(e as Error).message.split('\n')[0]}`;
  }
  assertBlocked('Rewrite a published article lineage', tamper.startsWith('blocked') ? 'blocked' : 'allowed', 'blocked', 'traceability columns are immutable');

  // ── 12. The worker refuses a task with no approval ──
  const worker = new BrainTaskWorker();
  const noApprovalTask = await brainRepository.createTraceableTask({
    type: 'create_automation_job',
    title: 'security-negative-test: no approval',
    goal: 'Attempt execution without any approval record',
    priority: 'low',
    strategyId: plan?.strategy_id as string,
    opportunityId: plan?.opportunity_id as string,
    executionPlanId: STATE.planId,
    correlationId: STATE.correlationId,
    idempotencyKey: `security-negative-${Date.now()}`,
    inputs: {},
    context: {},
    provenance: 'TEST',
    initialStatus: 'queued',
  });
  let workerOutcome = 'unexpectedly completed';
  if (noApprovalTask) {
    const outcome = await worker.runTask(noApprovalTask.id);
    workerOutcome = outcome.outcome;
    await pool.query(`DELETE FROM brain_tasks WHERE id=$1`, [noApprovalTask.id]);
  }
  assertBlocked('Execute a task that has no approval', workerOutcome === 'completed' ? 'allowed' : 'rejected', 'rejected', 'execution must be approval-gated');

  // ── Report ──
  console.log('\n================ PHASE 4.2 SECURITY NEGATIVE TESTS ================');
  for (const c of cases) {
    console.log(`[${c.pass ? 'PASS' : 'FAIL'}] ${c.name}`);
    console.log(`        expected=${c.expected} actual=${String(c.actual).slice(0, 110)}`);
    console.log(`        ${c.note}`);
  }
  const failed = cases.filter((c) => !c.pass);
  console.log(`\nNEGATIVE TESTS PASSED: ${cases.length - failed.length}/${cases.length}`);
  console.log(failed.length === 0 ? 'ALL PROTECTIONS HELD' : `PROTECTION GAPS: ${failed.map((f) => f.name).join('; ')}`);

  await pool.end();
  await disconnect();
  if (failed.length > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await disconnect();
  process.exit(1);
});
