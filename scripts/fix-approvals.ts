import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query("ALTER TABLE brain_approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
  .then(r => console.log('Added updated_at to brain_approvals'))
  .catch(e => console.error('Error:', e.message))
  .finally(() => pool.end());