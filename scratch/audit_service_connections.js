const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='service_connections' ORDER BY ordinal_position");
  console.log('service_connections columns:', cols.rows.map(r => r.column_name).join(', '));
  const rows = await pool.query('SELECT * FROM service_connections');
  console.log('\nservice_connections rows:', rows.rowCount);
  rows.rows.forEach(r => console.log(JSON.stringify(r)));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
