const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function check() {
  const r = await pool.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'brain_schedules'::regclass AND contype = 'c'");
  console.log(r.rows);
  await pool.end();
}
check();