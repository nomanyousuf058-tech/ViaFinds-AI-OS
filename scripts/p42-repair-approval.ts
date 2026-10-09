/**
 * One-off repair: restore the settled approval row to the state the real
 * production run produced, and re-apply migration 005 so the immutability
 * triggers cover brain_approvals and brain_tasks as well as articles.
 *
 * Run: npx tsx scripts/p42-repair-approval.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function main() {
  const state = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'p42-run-state.json'), 'utf8')
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  const [before] = (
    await pool.query(`SELECT id, status, decision, decided_by, decided_at, consumed_at, consumed_by_task FROM brain_approvals WHERE id=$1`, [
      state.approvalId,
    ])
  ).rows;

  console.log('before:', JSON.stringify(before));

  // Restore the real decision recorded by the admin API during the run.
  await pool.query(
    `UPDATE brain_approvals
        SET status='approved', decision='approved', consumed_at=COALESCE(consumed_at, NOW())
      WHERE id=$1`,
    [state.approvalId]
  );

  const [after] = (
    await pool.query(`SELECT id, status, decision, decided_by, decided_at, consumed_at, consumed_by_task FROM brain_approvals WHERE id=$1`, [
      state.approvalId,
    ])
  ).rows;
  console.log('after: ', JSON.stringify(after));

  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'lib', 'db', 'migrations', '005_phase_4_2_production_loop.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('applied 005_phase_4_2_production_loop.sql');

  const triggers = await pool.query<{ tgname: string; tgrelid: string }>(
    `SELECT tgname, tgrelid::regclass::text AS tgrelid
       FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgname IN (
          'protect_article_traceability_trigger',
          'protect_approval_decision_trigger',
          'protect_task_lineage_trigger',
          'block_publication_quality_gate_update_trigger'
        )
      ORDER BY tgname`
  );
  for (const t of triggers.rows) console.log(`  ${t.tgname} ON ${t.tgrelid}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
