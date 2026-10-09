const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const cons = await pool.query("SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'articles'::regclass AND contype = 'c'");
  console.log('articles CHECK constraints:', JSON.stringify(cons.rows));
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%affiliate%' ORDER BY table_name");
  console.log('affiliate tables:', tables.rows.map(r => r.table_name).join(', '));
  for (const t of tables.rows) {
    const r = await pool.query('SELECT count(*)::int AS n FROM ' + t.table_name);
    console.log('  ' + t.table_name + ' = ' + r.rows[0].n);
  }
  const auditCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs' ORDER BY ordinal_position");
  console.log('audit_logs columns:', auditCols.rows.map(r => r.column_name).join(', '));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });