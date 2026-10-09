// Orphan sweep: check FK integrity across brain/CMS tables
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function q(sql, params) {
  const r = await pool.query(sql, params);
  return r.rows;
}

async function main() {
  const orphanRuns = await q(`SELECT COUNT(*)::int AS n FROM brain_runs br WHERE br.initialization_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brain_initialization bi WHERE bi.initialization_id = br.initialization_id)`);
  console.log('brain_runs dangling initialization_id:', orphanRuns[0].n);

  const orphanCorr = await q(`SELECT COUNT(*)::int AS n FROM brain_runs br WHERE br.correlation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brain_reports r WHERE r.correlation_id = br.correlation_id)`);
  console.log('brain_runs dangling correlation_id:', orphanCorr[0].n);

  const orphanParent = await q(`SELECT COUNT(*)::int AS n FROM brain_strategies s WHERE s.parent_strategy_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brain_strategies p WHERE p.id = s.parent_strategy_id)`);
  console.log('brain_strategies dangling parent_strategy_id:', orphanParent[0].n);

  const orphanTasks = await q(`SELECT COUNT(*)::int AS n FROM brain_tasks t WHERE (t.opportunity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brain_opportunities o WHERE o.id = t.opportunity_id)) OR (t.strategy_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brain_strategies s WHERE s.id = t.strategy_id))`);
  console.log('brain_tasks dangling refs:', orphanTasks[0].n);

  const orphanArtTasks = await q(`SELECT COUNT(*)::int AS n FROM articles a WHERE a.brain_task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brain_tasks t WHERE t.id = a.brain_task_id)`);
  console.log('articles dangling brain_task_id:', orphanArtTasks[0].n);
  const orphanArtJobs = await q(`SELECT COUNT(*)::int AS n FROM articles a WHERE a.automation_job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM automation_jobs j WHERE j.id = a.automation_job_id::uuid)`);
  console.log('articles dangling automation_job_id:', orphanArtJobs[0].n);

  const orphanJobs = await q(`SELECT COUNT(*)::int AS n FROM automation_jobs j WHERE j.content_id IS NOT NULL AND j.content_type = 'brain_decision' AND NOT EXISTS (SELECT 1 FROM brain_decisions d WHERE d.id = j.content_id::uuid)`);
  console.log('automation_jobs dangling brain_decision content_id:', orphanJobs[0].n);

  const dupCorr = await q(`SELECT correlation_id, COUNT(*)::int AS n FROM brain_reports WHERE correlation_id IS NOT NULL GROUP BY correlation_id HAVING COUNT(*) > 1 LIMIT 5`);
  console.log('duplicate brain_reports.correlation_id:', dupCorr);

  const initCount = await q(`SELECT COUNT(*)::int AS n FROM brain_initialization`);
  console.log('brain_initialization rows (should be 0 or 1):', initCount[0].n);

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });