// Controlled production Wake Up via the REAL application path.
// Calls wakeBrain() exactly as /api/brain/wake does — no shortcuts, no manual status.
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function snapshot(pool, label) {
  const init = (await pool.query('SELECT id, status, error, data FROM brain_initialization')).rows[0] || null;
  const activeStrat = (await pool.query("SELECT id, title, status, provenance, activated_at FROM brain_strategies WHERE status='active' LIMIT 1")).rows[0] || null;
  const schedCount = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_schedules WHERE enabled=true")).rows[0];
  const lastRun = (await pool.query("SELECT run_id, run_type, trigger, status, started_at, completed_at FROM brain_runs ORDER BY started_at DESC LIMIT 1")).rows[0] || null;
  console.log('--- ' + label + ' ---');
  console.log('  init:', JSON.stringify(init));
  console.log('  activeStrategy:', JSON.stringify(activeStrat));
  console.log('  enabledSchedules:', schedCount.n);
  console.log('  lastRun:', JSON.stringify(lastRun));
  return { init, activeStrat, lastRun };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  await snapshot(pool, 'BEFORE controlled Wake Up');

  // Force-load the app module graph the same way the Next.js route does.
  process.env.NODE_ENV = 'production';
  const { wakeBrain } = require('./lib/brain');
  const report = await wakeBrain('controlled production recovery wake');

  console.log('\n=== wakeBrain() RETURNED ===');
  console.log('  alreadyInitialized:', report.alreadyInitialized);
  console.log('  runId:', report.runId);
  console.log('  report.id:', report.id);
  console.log('  report.status:', report.status);
  console.log('  observations:', JSON.stringify(report.observations));

  await snapshot(pool, 'AFTER controlled Wake Up');

  // Show the wake_up run record in full
  const wakeRun = (await pool.query("SELECT * FROM brain_runs WHERE run_type='wake_up' ORDER BY started_at DESC LIMIT 1")).rows[0];
  console.log('\n=== wake_up run record ===');
  console.log(JSON.stringify(wakeRun, null, 2));

  await pool.end();
}
main().catch(e => { console.error('WAKE FAILED:', e.stack || e.message); process.exit(2); });