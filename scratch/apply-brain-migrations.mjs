import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['015_brain_initialization_and_runs.sql', '016_partner_registry.sql', '017_brain_schedules.sql', '018_strategy_activation.sql'];

try {
  for (const file of files) {
    const sql = readFileSync(new URL(`../lib/db/migrations/${file}`, import.meta.url), 'utf8');
    console.log(`\n=== Applying ${file} (${sql.length} chars) ===`);
    // Each migration file manages its own transaction (BEGIN/COMMIT).
    await pool.query(sql);
    console.log(`=== ${file} OK ===`);
  }

  console.log('\n=== VERIFICATION ===');
  const tables = ['brain_initialization', 'brain_runs', 'brain_schedules', 'partner_registry', 'partner_compatibility_scores'];
  const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`, [tables]);
  for (const t of tables) console.log(`${t}: ${new Set(r.rows.map(x => x.table_name)).has(t) ? 'EXISTS' : 'MISSING'}`);

  const cols = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE (table_name='brain_reports' AND column_name='correlation_id') OR (table_name='brain_strategies' AND column_name='activated_at')`);
  for (const c of cols.rows) console.log(`${c.table_name}.${c.column_name}: EXISTS`);

  const idx = await pool.query(`SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_brain_strategies_single_active','idx_brain_reports_correlation_id','prevent_duplicate_initialization')`);
  console.log('indexes/triggers:', idx.rows.map(x => x.indexname).join(', ') || '(none)');

  const sched = await pool.query(`SELECT count(*)::int AS n FROM brain_schedules`);
  console.log('seeded schedules:', sched.rows[0].n);
  const trig = await pool.query(`SELECT tgname FROM pg_trigger WHERE tgname='prevent_duplicate_initialization' AND NOT tgisinternal`);
  console.log('trigger prevent_duplicate_initialization:', trig.rows.length ? 'EXISTS' : 'MISSING');
} catch (e) {
  console.error('MIGRATION FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
