const pg = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
const c = new pg.Client(DATABASE_URL);

async function check() {
  await c.connect();
  const res = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'articles' ORDER BY ordinal_position");
  console.log(res.rows);
  await c.end();
}

check().catch(console.error);