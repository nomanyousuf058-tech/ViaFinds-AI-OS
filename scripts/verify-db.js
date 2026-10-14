const pg = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
const c = new pg.Client(DATABASE_URL);

async function verify() {
  await c.connect();
  const tables = ['brain_initialization', 'brain_strategies', 'brain_schedules', 'brain_runs', 'brain_memory', 'brain_reports', 'brain_observations'];
  for (const table of tables) {
    try {
      const res = await c.query(`SELECT * FROM ${table}`);
      console.log(`\n=== ${table} (${res.rows.length} rows) ===`);
      console.log(JSON.stringify(res.rows, null, 2));
    } catch(e) {
      console.log(`\n=== ${table} === ERROR: ${e.message}`);
    }
  }
  await c.end();
}

verify().catch(console.error);