import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name LIKE 'brain_%' AND column_name = 'updated_at' ORDER BY table_name")
  .then(r => console.log('Tables with updated_at:', r.rows))
  .finally(() => pool.end());