import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'articles'`)
  .then(r => console.log('Articles columns:', r.rows.map(x => x.column_name)))
  .finally(() => pool.end());