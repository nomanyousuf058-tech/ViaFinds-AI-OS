const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const jobCounts = (await pool.query("SELECT status, COUNT(*)::int AS n FROM automation_jobs GROUP BY status ORDER BY status")).rows;
  console.log('automation_jobs:', JSON.stringify(jobCounts));
  const archivedJobs = (await pool.query("SELECT COUNT(*)::int AS n FROM automation_jobs WHERE status='archived'")).rows[0].n;
  console.log('archived jobs: ' + archivedJobs.n);
  const init = (await pool.query("SELECT id, status, error, data FROM brain_initialization")).rows[0];
  console.log('brain_initialization:', JSON.stringify({ status: init.status, error: init.error, firstReportId: init.data.firstReportId, baselineStrategyId: init.data.baselineStrategyId }));
  const activeStrat = (await pool.query("SELECT id, title, status, provenance FROM brain_strategies WHERE status='active'")).rows[0] || null;
  console.log('active strategy:', activeStrat ? JSON.stringify({ id: activeStrat.id.slice(0,8), title: activeStrat.title.slice(0,50), status: activeStrat.status, provenance: activeStrat.provenance }) : 'NONE');
  const scheds = (await pool.query("SELECT key, enabled, status FROM brain_schedules WHERE enabled=true")).rows;
  console.log('enabled schedules: ' + scheds.length);
  const wakeRuns = (await pool.query("SELECT run_type, status, COUNT(*)::int AS n FROM brain_runs GROUP BY run_type, status ORDER BY run_type, status")).rows;
  console.log('brain_runs:', JSON.stringify(wakeRuns));
  const dupInit = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_initialization")).rows[0].n;
  console.log('initialization rows (should be 1): ' + dupInit.n);
  const dupActive = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_strategies WHERE status='active'")).rows[0].n;
  console.log('active strategies (should be 1): ' + dupActive.n);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });