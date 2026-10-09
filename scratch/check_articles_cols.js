// Inspect articles table columns
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='articles' ORDER BY ordinal_position");
  console.log('articles columns:', cols.rows.map(r => r.column_name).join(', '));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });