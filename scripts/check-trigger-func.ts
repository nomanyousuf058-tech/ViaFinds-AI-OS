import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query("SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%updated_at%'")
  .then(r => console.log('Functions:', r.rows))
  .finally(() => pool.end());