import { getPool } from '@/lib/db/client';

async function main() {
  const pool = getPool();
  pool.on('error', (err) => console.error('Pool error:', err));

  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('Connection test:', result.rows);
  } catch (e) {
    console.error('Connection failed:', e);
  }
}

main();