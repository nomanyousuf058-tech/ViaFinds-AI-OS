import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });
try {
  const r = await pool.query(
    `SELECT title, status, created_at, updated_at FROM brain_strategies
     WHERE status IN ('approved','active') ORDER BY created_at`
  );
  console.table(r.rows);
} finally {
  await pool.end();
}
