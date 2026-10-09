const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const c1 = await pool.query("SELECT COUNT(*) AS n FROM brain_opportunities WHERE status <> 'archived'");
  console.log('status<>archived:', c1.rows[0].n);
  const c3 = await pool.query("SELECT provenance, status, COUNT(*) AS n FROM brain_opportunities GROUP BY provenance, status ORDER BY provenance, status");
  console.log('breakdown:', JSON.stringify(c3.rows));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });