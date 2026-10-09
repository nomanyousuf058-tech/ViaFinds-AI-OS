const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function check() {
  const art = await pool.query("SELECT status, provenance, COUNT(*) FROM articles GROUP BY status, provenance");
  console.log('Articles:', art.rows);
  
  const init = await pool.query("SELECT status, COUNT(*) FROM brain_initialization GROUP BY status");
  console.log('Brain init:', init.rows);
  
  const sched = await pool.query("SELECT key, enabled, status FROM brain_schedules");
  console.log('Schedules:', sched.rows);
  
  await pool.end();
}
check();