import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool } from '../lib/db/client';

const REQUIRED_LOGIN_TABLES = ['admin_users', 'automation_jobs'];

async function run() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [REQUIRED_LOGIN_TABLES]
  );
  const found = result.rows.map((r: { table_name: string }) => r.table_name);
  const missing = REQUIRED_LOGIN_TABLES.filter(t => !found.includes(t));
  console.log('Found:', found);
  console.log('Missing:', missing);
  console.log('Schema ready:', missing.length === 0);
  await pool.end();
  process.exit(0);
}
run();
