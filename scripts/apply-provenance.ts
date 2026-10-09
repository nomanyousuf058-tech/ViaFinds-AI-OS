import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const fs = require('fs');
const sql = fs.readFileSync('lib/db/migrations/004_provenance_tracking.sql', 'utf8');
pool.query(sql)
  .then(r => console.log('Migration applied successfully'))
  .catch(e => console.error('Migration error:', e.message))
  .finally(() => pool.end());