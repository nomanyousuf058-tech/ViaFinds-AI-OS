import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query("SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table LIKE 'brain_%'")
  .then(r => console.log('Triggers:', r.rows))
  .finally(() => pool.end());