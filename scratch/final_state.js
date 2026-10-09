const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const init = (await pool.query('SELECT id, status, error, data FROM brain_initialization')).rows[0];
  console.log('brain_initialization:', init.status, '| error:', init.error ? 'SET' : 'none');
  console.log('  data.firstReportId:', init.data.firstReportId, '| baselineStrategyId:', init.data.baselineStrategyId, '| initializedAt:', init.data.initializedAt);
  const wakeRuns = (await pool.query("SELECT run_id, run_type, trigger, status FROM brain_runs WHERE run_type='wake_up' ORDER BY started_at DESC")).rows;
  console.log('\nwake_up runs: ' + wakeRuns.length);
  wakeRuns.forEach(r => console.log('  ' + r.run_id.slice(0,8) + ' ' + r.status + ' (' + r.trigger + ')'));
  const activeStrat = (await pool.query("SELECT id, title, status, provenance FROM brain_strategies WHERE status='active'")).rows[0] || null;
  console.log('\nactive strategy:', activeStrat ? JSON.stringify({ id: activeStrat.id.slice(0,8), title: activeStrat.title.slice(0,50), status: activeStrat.status, provenance: activeStrat.provenance }) : 'NONE');
  const scheds = (await pool.query("SELECT key, enabled, status FROM brain_schedules ORDER BY key")).rows;
  console.log('\nschedules (' + scheds.length + '):');
  scheds.forEach(s => console.log('  ' + s.key + ' enabled=' + s.enabled + ' status=' + s.status));
  const counts = {};
  for (const t of ['articles','brain_strategies','brain_opportunities','brain_tasks','brain_decisions','brain_approvals','brain_reports','brain_observations','brain_learnings','brain_memory','brain_research_runs','automation_jobs','affiliate_links','brain_initialization']) {
    const r = await pool.query('SELECT COUNT(*)::int AS n FROM ' + t);
    counts[t] = r.rows[0].n;
  }
  console.log('\ntable counts:', JSON.stringify(counts, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });