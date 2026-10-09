const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_initialization' ORDER BY ordinal_position");
  console.log('brain_initialization columns:', cols.rows.map(r => r.column_name).join(', '));

  const init = await pool.query('SELECT * FROM brain_initialization');
  console.log('\n=== brain_initialization ===');
  init.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

  const runCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_runs' ORDER BY ordinal_position");
  console.log('\nbrain_runs columns:', runCols.rows.map(r => r.column_name).join(', '));

  const runs = await pool.query('SELECT * FROM brain_runs ORDER BY started_at DESC NULLS LAST');
  console.log('\n=== brain_runs ===');
  runs.rows.forEach(r => console.log(JSON.stringify(r)));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
