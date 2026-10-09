const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const planCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_execution_plans' ORDER BY ordinal_position");
  console.log('brain_execution_plans columns:', planCols.rows.map(r => r.column_name).join(', '));
  const plan = (await pool.query("SELECT id, execution_type, target, status, provenance, created_at FROM brain_execution_plans WHERE opportunity_id IN (SELECT id FROM brain_opportunities WHERE id::text LIKE '65b22049%')")).rows;
  console.log('\nplans for 65b22049:');
  plan.forEach(p => console.log(JSON.stringify({ id: p.id.slice(0,8), execution_type: p.execution_type, target: (p.target||'').slice(0,40), status: p.status, provenance: p.provenance, created_at: p.created_at })));
  const strat = (await pool.query("SELECT id, title, status, provenance FROM brain_strategies WHERE opportunity_id IN (SELECT id FROM brain_opportunities WHERE id::text LIKE '65b22049%')")).rows;
  console.log('\nstrategies for 65b22049:');
  strat.forEach(s => console.log(JSON.stringify({ id: s.id.slice(0,8), title: (s.title||'').slice(0,50), status: s.status, provenance: s.provenance })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });