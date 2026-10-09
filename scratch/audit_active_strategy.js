const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 8000 });

async function main() {
  const t0 = Date.now();
  const r = await pool.query('SELECT NOW() AS db_now, COUNT(*)::int AS strategies FROM brain_strategies');
  console.log('DB reachable in ' + (Date.now() - t0) + 'ms:', JSON.stringify(r.rows[0]));

  const active = await pool.query(`
    SELECT id, title, status, provenance, activated_at, created_at
    FROM brain_strategies WHERE activated_at IS NOT NULL
    ORDER BY activated_at DESC
  `);
  console.log('\n=== strategies with activated_at ===');
  active.rows.forEach(x => console.log(JSON.stringify({
    id: x.id, title: x.title, status: x.status, provenance: x.provenance,
    activated_at: x.activated_at, created_at: x.created_at,
  })));

  const cnt = await pool.query(`SELECT status, COUNT(*)::int AS n FROM brain_strategies GROUP BY status ORDER BY status`);
  console.log('\nstrategy status counts:', JSON.stringify(cnt.rows));

  await pool.end();
}
main().catch(e => { console.error('DB_UNREACHABLE: ' + e.message); process.exit(1); });
