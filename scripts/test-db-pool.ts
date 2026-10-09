import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getPool } from '@/lib/db/client';

async function main() {
  const pool = getPool();
  pool.on('error', (err) => console.error('Pool error:', err));

  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('Pool connection test:', result.rows);
  } catch (e) {
    console.error('Pool connection failed:', e);
  }
}

main();