import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'brain_%' ORDER BY table_name`)
  .then(r => console.log('Brain tables:', r.rows))
  .finally(() => pool.end());