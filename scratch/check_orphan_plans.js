const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const planIds = ['7e0f0da4','08c4e44f','f2c402a8','c9a824d5','509cac39','ca8e6948','e827ccf4'];
  for (const p of planIds) {
    const full = (await pool.query("SELECT id, status, provenance, started_at, completed_at, correlation_id, idempotency_key, brain_task_id, automation_job_id FROM brain_execution_plans WHERE id::text LIKE $1", [p + '%'])).rows[0];
    const tasks = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_tasks WHERE execution_plan_id IN (SELECT id FROM brain_execution_plans WHERE id::text LIKE $1)", [p + '%'])).rows[0].n;
    const quality = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_quality_results WHERE execution_plan_id IN (SELECT id FROM brain_execution_plans WHERE id::text LIKE $1)", [p + '%'])).rows[0].n;
    const learnings = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_learnings WHERE execution_plan_id IN (SELECT id FROM brain_execution_plans WHERE id::text LIKE $1)", [p + '%'])).rows[0].n;
    const jobs = (await pool.query("SELECT COUNT(*)::int AS n FROM automation_jobs WHERE idempotency_key IN (SELECT idempotency_key FROM brain_execution_plans WHERE id::text LIKE $1 AND idempotency_key IS NOT NULL)", [p + '%'])).rows[0].n;
    console.log(p + ': status=' + full.status + ' tasks=' + tasks + ' quality=' + quality + ' learnings=' + learnings + ' jobs=' + jobs + ' started=' + full.started_at);
  }
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });