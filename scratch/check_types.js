const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const tables = ['brain_tasks','brain_decisions','brain_opportunities','brain_strategies','brain_reports','brain_initialization','brain_runs','brain_observations','brain_learnings','brain_approvals','brain_execution_plans','brain_quality_results','automation_jobs','articles'];
  for (const t of tables) {
    const c = await pool.query('SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [t]);
    console.log(t + ': ' + c.rows.map(r => r.column_name + '=' + (r.udt_name||r.data_type)).join(', '));
  }
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });