import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool } from '../lib/db/client';
import crypto from 'crypto';
async function run() {
  const pool = getPool();
  const adminId = crypto.randomUUID();
  console.log('inserting...');
  await pool.query('INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)', [adminId, `test-${Date.now()}@example.com`, 'testhash', 'admin']);
  console.log('inserted');
  process.exit(0);
}
run();
