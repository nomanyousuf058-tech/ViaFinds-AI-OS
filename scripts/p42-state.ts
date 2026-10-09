import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool, disconnect } from '../lib/db/client';

async function main() {
  const pool = getPool();
  const info = await pool.query('SELECT current_database() db, current_user usr, now() ts');
  console.log('DB:', info.rows[0]);

  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  console.log('\n=== TABLES ===');
  console.log(tables.rows.map(r => r.table_name).join(', '));

  const countTables = [
    'articles', 'brain_opportunities', 'brain_strategies', 'brain_execution_plans',
    'brain_tasks', 'brain_approvals', 'brain_learnings', 'brain_quality_results',
    'brain_verifications', 'automation_jobs', 'products', 'admin_users',
  ];
  console.log('\n=== COUNTS ===');
  for (const t of countTables) {
    try {
      const r = await pool.query(`SELECT COUNT(*)::int c FROM ${t}`);
      console.log(`${t}: ${r.rows[0].c}`);
    } catch (e) {
      console.log(`${t}: ERROR ${(e as Error).message}`);
    }
  }

  for (const t of countTables.slice(0, 10)) {
    try {
      const cols = await pool.query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`\n=== COLUMNS ${t} ===`);
      console.log(cols.rows.map(c => `${c.column_name}:${c.data_type}`).join(' | '));
    } catch { /* ignore */ }
  }

  await disconnect();
}

main().catch(async (e) => { console.error(e); await disconnect(); process.exit(1); });
