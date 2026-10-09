import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
if (!dbUrl) { console.error('DATABASE_URL not found in .env.local'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });
try {
  await pool.query('SELECT 1');
  console.log('CONNECT: OK');
  const r = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('admin_users','automation_jobs') ORDER BY table_name`
  );
  console.log('TABLES FOUND:', r.rows.map(x => x.table_name).join(', ') || '(none)');
  const all = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  console.log('ALL PUBLIC TABLES:', all.rows.map(x => x.table_name).join(', ') || '(none)');
  const admins = await pool.query(`SELECT count(*)::int AS n FROM admin_users`).catch(e => ({ rows: [{ n: `ERR: ${e.message}` }] }));
  console.log('ADMIN_USERS COUNT:', admins.rows[0].n);
} catch (e) {
  console.error('CONNECT/QUERY FAILED:', e.message);
} finally {
  await pool.end();
}
