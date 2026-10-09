const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function check() {
  const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'brain_schedules'");
  console.log(r.rows);
  await pool.end();
}
check();