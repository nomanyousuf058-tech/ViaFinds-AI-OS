import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const STATE_FILE = path.join(process.cwd(), 'data', 'p42-run-state.json');

interface RunState {
  correlationId: string;
  researchId: string;
  sourceIds: string[];
  opportunityId: string;
  strategyId: string;
  planId: string;
  idempotencyKey: string;
  taskId: string;
  approvalId: string;
  automationJobId?: string;
  articleId?: string;
  qualityResultId?: string;
  verificationId?: string;
  learningId?: string | null;
  publicUrl?: string;
}

function ok(cond: boolean): string {
  return cond ? 'PASS' : 'FAIL';
}

async function main() {
  const state: RunState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  const q = async (sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows;

  const results: Array<{ link: string; detail: string; pass: boolean }> = [];
  const record = (link: string, pass: boolean, detail: string) => results.push({ link, pass, detail });

  // 1. research run
  const [research] = await q(
    `SELECT id, query, provider, providers_used, research_confidence, result_count, status, provenance
     FROM brain_research_runs WHERE id=$1`,
    [state.researchId]
  );
  record('RESEARCH_RUN', !!research && research.provenance === 'REAL' && research.status === 'completed',
    research ? `${research.provider} / ${research.result_count} results / confidence=${research.research_confidence} / provenance=${research.provenance}` : 'missing');

  // 2. source records
  const sources = await q(
    `SELECT source_id, url, provider, provenance FROM brain_sources WHERE research_id=$1 ORDER BY rank`,
    [state.researchId]
  );
  const declared = new Set(state.sourceIds);
  const found = sources.filter((s) => declared.has(s.source_id));
  record('SOURCE_RECORDS', sources.length > 0 && found.length === declared.size && sources.every((s) => s.provenance === 'REAL'),
    `${sources.length} persisted, ${found.length}/${declared.size} cited by the opportunity, all provenance=REAL`);

  // 3. opportunity
  const [opportunity] = await q(
    `SELECT id, title, status, confidence, provenance, research_id, source_ids, correlation_id
     FROM brain_opportunities WHERE id=$1`,
    [state.opportunityId]
  );
  record('OPPORTUNITY', !!opportunity && opportunity.provenance === 'REAL' && opportunity.research_id === state.researchId,
    opportunity ? `${opportunity.title} / confidence=${opportunity.confidence} / sources=${JSON.stringify(opportunity.source_ids)}` : 'missing');

  // 4. strategy
  const [strategy] = await q(
    `SELECT id, title, status, provenance, opportunity_id, approval_required, source_ids
     FROM brain_strategies WHERE id=$1`,
    [state.strategyId]
  );
  record('STRATEGY', !!strategy && strategy.provenance === 'REAL' && strategy.opportunity_id === state.opportunityId,
    strategy ? `${strategy.title} / status=${strategy.status} / approval_required=${strategy.approval_required}` : 'missing');

  // 5. execution plan
  const [plan] = await q(
    `SELECT id, status, execution_type, target_automation, approval_required, required_permissions,
            idempotency_key, provenance, opportunity_id, strategy_id, automation_job_id, brain_task_id
     FROM brain_execution_plans WHERE id=$1`,
    [state.planId]
  );
  record('EXECUTION_PLAN', !!plan && plan.provenance === 'REAL' && plan.opportunity_id === state.opportunityId && plan.strategy_id === state.strategyId && plan.status === 'completed',
    plan ? `status=${plan.status} / ${plan.target_automation} / perms=${JSON.stringify(plan.required_permissions)} / job=${plan.automation_job_id}` : 'missing');

  // 6. brain task
  const [task] = await q(
    `SELECT id, status, approval_state, approval_id, provenance, strategy_id, opportunity_id, execution_plan_id,
            idempotency_key, claim_token, claimed_at, completed_at
     FROM brain_tasks WHERE id=$1`,
    [state.taskId]
  );
  record('BRAIN_TASK', !!task && task.provenance === 'REAL' && task.status === 'completed' && task.approval_id === state.approvalId,
    task ? `status=${task.status} / approval_state=${task.approval_state} / approval_id=${task.approval_id} / claimed=${!!task.claimed_at} / completed=${!!task.completed_at}` : 'missing');

  // 7. approval
  const [approval] = await q(
    `SELECT id, status, decision, requested_permission, decided_by, decided_at, consumed_at, consumed_by_task, provenance
     FROM brain_approvals WHERE id=$1`,
    [state.approvalId]
  );
  record('APPROVAL', !!approval && approval.status === 'approved' && approval.decision === 'approved' && !!approval.decided_at && !!approval.consumed_at && approval.consumed_by_task === state.taskId,
    approval ? `${approval.decision} by ${approval.decided_by} at ${approval.decided_at}; consumed_by_task=${approval.consumed_by_task}` : 'missing');

  // 8. automation job (file-based store)
  const jobsFile = path.join(process.cwd(), 'data', 'automation', 'jobs.json');
  let job: { id: string; status: string; input?: Record<string, unknown> } | undefined;
  if (fs.existsSync(jobsFile)) {
    const parsed = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
    job = list.find((j: { id: string }) => j.id === state.automationJobId) as typeof job;
  }
  record('AUTOMATION_JOB', !!job && job.status === 'completed' && job.input?.brainTaskId === state.taskId,
    job ? `${job.id} status=${job.status} brainTaskId=${job.input?.brainTaskId}` : 'missing');

  // 9. article
  const [article] = await q(
    `SELECT id, title, slug, status, provenance, brain_task_id, strategy_id, opportunity_id, automation_job_id, published_at
     FROM articles WHERE id=$1`,
    [state.articleId]
  );
  record('ARTICLE', !!article && article.provenance === 'REAL' && article.brain_task_id === state.taskId && article.strategy_id === state.strategyId && article.opportunity_id === state.opportunityId && article.automation_job_id === state.automationJobId,
    article ? `${article.slug} / status=${article.status} / provenance=${article.provenance} / published=${article.published_at}` : 'missing');

  // 10. quality results for the task
  const quality = await q(
    `SELECT id, target_type, target_id, overall_status, score, published, provenance, created_at
     FROM brain_quality_results
     WHERE correlation_id=$1::text
        OR article_id=$2::uuid
        OR execution_plan_id=$3::uuid
        OR brain_task_id=$4::uuid
     ORDER BY created_at`,
    [state.correlationId, state.articleId, state.planId, state.taskId]
  );
  const latestNotFail = quality.length > 0 && quality[quality.length - 1].overall_status !== 'FAIL';
  record('QUALITY_RESULTS', quality.length > 0 && latestNotFail,
    quality.map((r) => `${r.target_type}:${r.overall_status}(score=${r.score},published=${r.published})`).join(' -> '));

  // 11. verification
  const verifications = await q(
    `SELECT id, target_id, status, available_observations, limitations, provenance, created_at
     FROM brain_verifications WHERE article_id=$1 ORDER BY created_at`,
    [state.articleId]
  );
  const lastVerification = verifications[verifications.length - 1];
  const observed = (lastVerification?.available_observations as Array<{ name: string; value?: unknown }>) || [];
  record('VERIFICATION', !!lastVerification && lastVerification.status !== 'FAIL',
    lastVerification
      ? `${lastVerification.status}; observations=${observed.map((o) => `${o.name}=${JSON.stringify(o.value)}`).join(', ')}`
      : 'missing');

  // 12. learning
  const learnings = await q(
    `SELECT id, source, lesson, success, confidence, reusability, provenance FROM brain_learnings WHERE correlation_id=$1`,
    [state.correlationId]
  );
  record('LEARNING', learnings.length > 0 && state.learningId !== null,
    learnings.length > 0 ? `success=${learnings[0].success} (${learnings[0].confidence}): ${String(learnings[0].lesson).slice(0, 140)}` : 'none persisted (no legitimate lesson)');

  // 13. traceability immutability: can the lineage still be tampered with?
  let tampered = 'not tested';
  try {
    await pool.query(`UPDATE articles SET strategy_id=NULL WHERE id=$1`, [state.articleId]);
    tampered = 'MUTABLE (trigger did not block)';
  } catch (e) {
    tampered = `BLOCKED: ${(e as Error).message.split('\n')[0]}`;
  }
  record('TRACEABILITY_PROTECTION', tampered.startsWith('BLOCKED'), tampered);

  console.log('\n================ PHASE 4.2 END-TO-END TRACE ================');
  for (const r of results) {
    console.log(`[${ok(r.pass)}] ${r.link.padEnd(24)} ${r.detail}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\nLINKS VERIFIED: ${results.length - failed.length}/${results.length}`);
  console.log(failed.length === 0 ? 'TRACE COMPLETE' : `INCOMPLETE: ${failed.map((f) => f.link).join(', ')}`);

  await pool.end();
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
