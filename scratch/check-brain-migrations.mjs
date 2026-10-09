import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });
try {
  const tables = [
    'brain_initialization', 'brain_runs', 'brain_schedules',
    'partner_registry', 'partner_compatibility_scores',
    'brain_strategies', 'brain_reports',
  ];
  const r = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
    [tables]
  );
  const found = new Set(r.rows.map(x => x.table_name));
  for (const t of tables) console.log(`${t}: ${found.has(t) ? 'EXISTS' : 'MISSING'}`);

  if (found.has('brain_reports')) {
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='brain_reports' AND column_name='correlation_id'`);
    console.log('brain_reports.correlation_id:', cols.rows.length ? 'EXISTS' : 'MISSING');
  }
  if (found.has('brain_strategies')) {
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='brain_strategies' AND column_name='activated_at'`);
    console.log('brain_strategies.activated_at:', cols.rows.length ? 'EXISTS' : 'MISSING');
    const idx = await pool.query(`SELECT indexname FROM pg_indexes WHERE tablename='brain_strategies' AND indexname='idx_brain_strategies_single_active'`);
    console.log('idx_brain_strategies_single_active:', idx.rows.length ? 'EXISTS' : 'MISSING');
    const active = await pool.query(`SELECT count(*)::int AS n FROM brain_strategies WHERE status='active'`).catch(e => ({ rows: [{ n: `ERR ${e.message}` }] }));
    console.log('active strategies:', active.rows[0].n);
  }
  if (found.has('brain_runs')) {
    const n = await pool.query(`SELECT count(*)::int AS n FROM brain_runs`).catch(e => ({ rows: [{ n: `ERR ${e.message}` }] }));
    console.log('brain_runs rows:', n.rows[0].n);
  }
  if (found.has('brain_schedules')) {
    const n = await pool.query(`SELECT count(*)::int AS n FROM brain_schedules`).catch(e => ({ rows: [{ n: `ERR ${e.message}` }] }));
    console.log('brain_schedules rows:', n.rows[0].n);
  }
  if (found.has('brain_initialization')) {
    const n = await pool.query(`SELECT status FROM brain_initialization LIMIT 1`).catch(e => ({ rows: [{ status: `ERR ${e.message}` }] }));
    console.log('brain_initialization status:', n.rows[0].status);
  }
} catch (e) {
  console.error('FAILED:', e.message);
} finally {
  await pool.end();
}
