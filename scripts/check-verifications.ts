import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'brain_verifications' ORDER BY ordinal_position`)
  .then(r => console.log('brain_verifications columns:', r.rows))
  .finally(() => pool.end());