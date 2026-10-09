const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const strats = (await pool.query("SELECT id, title, status, provenance, activated_at, opportunity_id FROM brain_strategies WHERE provenance='UNKNOWN' ORDER BY created_at DESC")).rows;
  console.log('=== UNKNOWN strategies (' + strats.length + ') ===');
  strats.forEach(s => console.log(JSON.stringify({ id: s.id.slice(0,8), title: (s.title||'').slice(0,55), status: s.status, activated: s.activated_at, opp: s.opportunity_id ? s.opportunity_id.slice(0,8) : null })));
  const plans = (await pool.query("SELECT id, execution_type, status, provenance, opportunity_id, strategy_id FROM brain_execution_plans WHERE provenance='UNKNOWN' ORDER BY created_at DESC")).rows;
  console.log('\n=== UNKNOWN plans (' + plans.length + ') ===');
  plans.forEach(p => console.log(JSON.stringify({ id: p.id.slice(0,8), execution_type: p.execution_type, status: p.status, opp: p.opportunity_id ? p.opportunity_id.slice(0,8) : null, strat: p.strategy_id ? p.strategy_id.slice(0,8) : null })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });