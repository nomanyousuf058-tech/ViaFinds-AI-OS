const pg = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
const c = new pg.Client(DATABASE_URL);

async function check() {
  await c.connect();
  const res = await c.query("SELECT action, details FROM audit_logs WHERE action LIKE '%ipn%' ORDER BY created_at DESC LIMIT 10");
  console.log('Audit logs:');
  console.log(JSON.stringify(res.rows, null, 2));
  await c.end();
}

check().catch(console.error);