const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const init = (await pool.query('SELECT id, status, error, data FROM brain_initialization')).rows[0];
  console.log('brain_initialization:', JSON.stringify(init, null, 2));
  const runs = (await pool.query("SELECT run_id, run_type, trigger, status, started_at, completed_at FROM brain_runs ORDER BY started_at DESC LIMIT 3")).rows;
  console.log('\nlatest 3 runs:');
  runs.forEach(r => console.log(JSON.stringify({ run_id: r.run_id, run_type: r.run_type, trigger: r.trigger, status: r.status, started_at: r.started_at, completed_at: r.completed_at })));
  const activeStrat = (await pool.query("SELECT id, title, status, provenance, activated_at FROM brain_strategies WHERE status='active' LIMIT 1")).rows[0] || null;
  console.log('\nactive strategy:', JSON.stringify(activeStrat));
  const artCount = (await pool.query("SELECT COUNT(*)::int AS n FROM articles WHERE status != 'archived'")).rows[0];
  console.log('active (non-archived) articles:', artCount.n);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });