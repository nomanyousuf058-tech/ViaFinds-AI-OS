const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_strategy_evolution' ORDER BY ordinal_position");
  console.log('brain_strategy_evolution columns:', cols.rows.map(r => r.column_name).join(', '));

  const ev = await pool.query('SELECT * FROM brain_strategy_evolution ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 15');
  console.log('\n=== brain_strategy_evolution (latest 15) ===');
  ev.rows.forEach(r => console.log(JSON.stringify(r)));

  // Check how getCurrentActiveStrategy works in repo — inspect activation columns on brain_strategies
  const scols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_strategies' ORDER BY ordinal_position");
  console.log('\nbrain_strategies columns:', scols.rows.map(r => r.column_name).join(', '));

  const active = await pool.query("SELECT id, title, status, provenance, created_at, is_active FROM brain_strategies WHERE is_active = true");
  console.log('\n=== is_active=true strategies ===');
  active.rows.forEach(r => console.log(JSON.stringify(r)));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
