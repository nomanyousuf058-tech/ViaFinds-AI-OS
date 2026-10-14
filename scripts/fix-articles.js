const pg = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
const c = new pg.Client(DATABASE_URL);

async function fix() {
  await c.connect();
  await c.query("ALTER TABLE articles ADD COLUMN IF NOT EXISTS article_type VARCHAR(50) DEFAULT 'Standard'");
  console.log('article_type column added');
  await c.end();
}

fix().catch(console.error);