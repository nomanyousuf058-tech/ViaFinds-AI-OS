const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const active = await pool.query("SELECT id, title, status, provenance, activated_at FROM brain_strategies WHERE status='active' ORDER BY activated_at DESC LIMIT 5");
  console.log('active strategies:', active.rows.length);
  active.rows.forEach(r => console.log('  ' + JSON.stringify({ id: r.id, title: (r.title||'').slice(0,40), status: r.status, provenance: r.provenance })));
  const allNonArchived = await pool.query("SELECT id, title, status, provenance FROM brain_strategies WHERE status <> 'archived' ORDER BY created_at DESC LIMIT 10");
  console.log('\nnon-archived strategies:', allNonArchived.rows.length);
  allNonArchived.rows.forEach(r => console.log('  ' + JSON.stringify({ id: r.id, title: (r.title||'').slice(0,40), status: r.status, provenance: r.provenance })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });