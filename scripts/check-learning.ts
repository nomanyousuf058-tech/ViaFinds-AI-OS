import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query(`SELECT id, lesson, reusable, success, source FROM brain_learnings WHERE id = '8eca2f01-c1e4-47fc-8fd9-2e26be75a19c'`)
  .then(r => console.log('Learning:', r.rows[0]))
  .finally(() => pool.end());