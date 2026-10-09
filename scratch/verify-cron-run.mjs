import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });
try {
  const run = await pool.query(
    `SELECT run_type, trigger, status, started_at, completed_at, observations, results
     FROM brain_runs ORDER BY created_at DESC LIMIT 3`
  );
  console.log('RECENT RUNS:');
  for (const r of run.rows) {
    const obs = Array.isArray(r.observations) ? r.observations.length : -1;
    const res = r.results && typeof r.results === 'object' ? Object.keys(r.results).length : -1;
    console.log(`- ${r.run_type} trigger=${r.trigger} status=${r.status} obs=${obs} results=${res} started=${r.started_at}`);
  }

  const sched = await pool.query(
    `SELECT key, status, last_run, next_run FROM brain_schedules ORDER BY key`
  );
  console.log('SCHEDULES:');
  console.table(sched.rows);

  const meta = await pool.query(
    `SELECT metadata FROM brain_schedules WHERE key='daily_opportunity_scan'`
  );
  console.log('daily_opportunity_scan metadata:', JSON.stringify(meta.rows[0]?.metadata, null, 2));
} finally {
  await pool.end();
}
