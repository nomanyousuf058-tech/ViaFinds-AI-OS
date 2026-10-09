import { Pool } from 'pg';

const p = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30000, max: 1, idleTimeoutMillis: 30000 });

(async () => {
  try {
    const client = await p.connect();
    try {
      const r = await client.query('SELECT 1 as test');
      console.log('Connected:', r.rows[0].test);
    } finally { client.release(); }
  } catch (e) { console.error('ERROR:', (e as Error).message); }
  await p.end();
})();