// Apply migration 022 directly to the production database (additive, idempotent).
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db', 'migrations', '022_brain_initialization_updated_at.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration 022 applied OK');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration 022 FAILED:', e.message);
    process.exit(1);
  } finally {
    client.release();
  }

  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_initialization' ORDER BY ordinal_position");
  console.log('brain_initialization columns now:', cols.rows.map(r => r.column_name).join(', '));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });