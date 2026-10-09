/**
 * PHASE 4.2 — immutability audit.
 *
 * Proves that the settled production evidence cannot be rewritten. Every probe
 * runs inside a transaction that is ALWAYS rolled back, so this audit can never
 * alter the rows it inspects — not even if a trigger is missing.
 *
 * Run: npx tsx scripts/p42-immutability.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { Pool, type PoolClient } from 'pg';

interface Probe {
  target: string;
  sql: string;
  params: unknown[];
  readback: string;
  expected: (value: unknown) => boolean;
}

async function main() {
  const state = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'p42-run-state.json'), 'utf8')
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  const before = await pool.query(
    `SELECT status, decision, consumed_by_task FROM brain_approvals WHERE id=$1`,
    [state.approvalId]
  );
  const [approvalBefore] = before.rows;
  const [articleBefore] = (
    await pool.query(`SELECT strategy_id, brain_task_id, status FROM articles WHERE id=$1`, [state.articleId])
  ).rows;

  // A valid but unrelated uuid, so these probes exercise the trigger rather
  // than a uuid cast error.
  const OTHER_UUID = '00000000-0000-4000-8000-000000000000';

  const probes: Probe[] = [
    {
      target: 'brain_approvals.status',
      sql: `UPDATE brain_approvals SET status='pending' WHERE id=$1`,
      params: [state.approvalId],
      readback: `SELECT status FROM brain_approvals WHERE id=$1`,
      expected: (v) => v === 'approved',
    },
    {
      target: 'brain_approvals.decision',
      sql: `UPDATE brain_approvals SET decision='rejected' WHERE id=$1`,
      params: [state.approvalId],
      readback: `SELECT decision FROM brain_approvals WHERE id=$1`,
      expected: (v) => v === 'approved',
    },
    {
      target: 'brain_approvals.decided_by',
      sql: `UPDATE brain_approvals SET decided_by='someone-else@example.com' WHERE id=$1`,
      params: [state.approvalId],
      readback: `SELECT decided_by FROM brain_approvals WHERE id=$1`,
      expected: (v) => v === 'admin@viafinds.com',
    },
    {
      target: 'brain_approvals.consumed_by_task',
      sql: `UPDATE brain_approvals SET consumed_by_task=$2 WHERE id=$1`,
      params: [state.approvalId, OTHER_UUID],
      readback: `SELECT consumed_by_task FROM brain_approvals WHERE id=$1`,
      expected: (v) => v === state.taskId,
    },
    {
      target: 'articles.strategy_id',
      sql: `UPDATE articles SET strategy_id=NULL WHERE id=$1`,
      params: [state.articleId],
      readback: `SELECT strategy_id FROM articles WHERE id=$1`,
      expected: (v) => v === state.strategyId,
    },
    {
      target: 'articles.brain_task_id',
      sql: `UPDATE articles SET brain_task_id=$2 WHERE id=$1`,
      params: [state.articleId, OTHER_UUID],
      readback: `SELECT brain_task_id FROM articles WHERE id=$1`,
      expected: (v) => v === state.taskId,
    },
    {
      target: 'articles.automation_job_id',
      sql: `UPDATE articles SET automation_job_id='job_tampered' WHERE id=$1`,
      params: [state.articleId],
      readback: `SELECT automation_job_id FROM articles WHERE id=$1`,
      expected: (v) => v === state.automationJobId,
    },
    {
      target: 'articles.published_at',
      sql: `UPDATE articles SET published_at=NULL WHERE id=$1`,
      params: [state.articleId],
      readback: `SELECT published_at FROM articles WHERE id=$1`,
      expected: (v) => v !== null,
    },
    {
      target: 'articles.provenance',
      sql: `UPDATE articles SET provenance='TEST' WHERE id=$1`,
      params: [state.articleId],
      readback: `SELECT provenance FROM articles WHERE id=$1`,
      expected: (v) => v === 'REAL',
    },
    {
      target: 'brain_tasks.approval_id',
      sql: `UPDATE brain_tasks SET approval_id=NULL WHERE id=$1`,
      params: [state.taskId],
      readback: `SELECT approval_id FROM brain_tasks WHERE id=$1`,
      expected: (v) => v === state.approvalId,
    },
    {
      target: 'brain_tasks.execution_plan_id',
      sql: `UPDATE brain_tasks SET execution_plan_id=$2 WHERE id=$1`,
      params: [state.taskId, OTHER_UUID],
      readback: `SELECT execution_plan_id FROM brain_tasks WHERE id=$1`,
      expected: (v) => v === state.planId,
    },
  ];

  const results: Array<{ target: string; blocked: boolean; detail: string; value: unknown }> = [];

  for (const probe of probes) {
    const client: PoolClient = await pool.connect();
    let detail = '';
    try {
      await client.query('BEGIN');
      try {
        await client.query(probe.sql, probe.params);
        detail = 'MUTABLE — the statement was accepted';
      } catch (e) {
        detail = `BLOCKED: ${(e as Error).message.split('\n')[0]}`;
      }
    } finally {
      // A failed statement aborts the transaction, so the readback has to run
      // after the rollback on a clean connection.
      await client.query('ROLLBACK');
      client.release();
    }

    const read = await pool.query(probe.readback, [probe.params[0]]);
    const value = read.rows[0] ? Object.values(read.rows[0])[0] : null;
    const intact = probe.expected(value);
    const blocked = detail.startsWith('BLOCKED');
    results.push({ target: probe.target, blocked, detail, value });
    if (!intact) {
      results[results.length - 1].detail += ` | UNEXPECTED readback: ${JSON.stringify(value)}`;
    }
  }

  const after = await pool.query(
    `SELECT status, decision, consumed_by_task FROM brain_approvals WHERE id=$1`,
    [state.approvalId]
  );
  const [articleAfter] = (
    await pool.query(`SELECT strategy_id, brain_task_id, status FROM articles WHERE id=$1`, [state.articleId])
  ).rows;

  const unchanged =
    JSON.stringify(approvalBefore) === JSON.stringify(after.rows[0]) &&
    JSON.stringify(articleBefore) === JSON.stringify(articleAfter);

  console.log('\n============== PHASE 4.2 IMMUTABILITY AUDIT ==============');
  for (const r of results) {
    console.log(`[${r.blocked ? 'PASS' : 'FAIL'}] ${r.target.padEnd(32)} ${r.detail}`);
  }
  console.log(`[${unchanged ? 'PASS' : 'FAIL'}] evidence unchanged after rollback`);
  console.log(`approval row now: ${JSON.stringify(after.rows[0])}`);
  console.log(`article row now:  ${JSON.stringify(articleAfter)}`);

  const failed = results.filter((r) => r.blocked);
  console.log(`\nBLOCKED: ${results.length - failed.length}/${results.length}`);
  await pool.end();
  if (failed.length > 0 || !unchanged) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
