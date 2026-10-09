const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='affiliate_links' ORDER BY ordinal_position");
  console.log('affiliate_links columns:', cols.rows.map(r => r.column_name).join(', '));
  const links = await pool.query('SELECT * FROM affiliate_links');
  console.log('\n=== affiliate_links (' + links.rows.length + ') ===');
  links.rows.forEach(l => console.log(JSON.stringify(l)));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });