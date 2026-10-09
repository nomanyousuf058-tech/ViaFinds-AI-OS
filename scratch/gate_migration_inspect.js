const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  // 1. List migration files on disk
  const migDir = path.join(process.cwd(), 'lib/db/migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  console.log('=== Migration files on disk (' + files.length + ') ===');
  files.forEach(f => console.log('  ' + f));

  // 2. Check DB for applied-migration tracking table
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  const tableNames = tables.rows.map(r => r.table_name);
  console.log('\n=== Public tables (' + tableNames.length + ') ===');
  console.log(tableNames.join(', '));

  const migTracking = tableNames.filter(t => /migration/i.test(t));
  for (const t of migTracking) {
    const r = await pool.query(`SELECT * FROM ${t} ORDER BY 1`);
    console.log(`\n=== ${t} (${r.rowCount} rows) ===`);
    console.log(JSON.stringify(r.rows, null, 1));
  }

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
