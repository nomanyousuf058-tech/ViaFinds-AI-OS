const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const refs = await pool.query("SELECT conname, conrelid::regclass AS tbl FROM pg_constraint WHERE confrelid = 'brain_opportunities'::regclass AND contype = 'f'");
  console.log('FKs referencing brain_opportunities:', refs.rows.map(r => r.tbl + '(' + r.conname + ')').join(', ') || '(none)');
  const stale = ['cca1c3f3','e38ac16d','4b41972b','2eff2eb3','65b22049','0eb354a6','8cdb98dd','49d5fdf5','3604bb2c','ca719535','53f7c794'];
  const live = ['f28e4f5f','0ade4ca9','852dbb09','31a64be2','b792d298','691ef19e','c84bc66b','b79ad292','b2d970f5','ba53845b'];
  for (const prefix of [...stale, ...live]) {
    const tasks = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_tasks WHERE opportunity_id IN (SELECT id FROM brain_opportunities WHERE id::text LIKE $1)", [prefix + '%'])).rows[0].n;
    const plans = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_execution_plans WHERE opportunity_id IN (SELECT id FROM brain_opportunities WHERE id::text LIKE $1)", [prefix + '%'])).rows[0].n;
    const strats = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_strategies WHERE opportunity_id IN (SELECT id FROM brain_opportunities WHERE id::text LIKE $1)", [prefix + '%'])).rows[0].n;
    if (tasks + plans + strats > 0) console.log(prefix + (stale.includes(prefix) ? ' STALE' : ' LIVE') + ': tasks=' + tasks + ' plans=' + plans + ' strats=' + strats);
  }
  console.log('dependency check done');
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });