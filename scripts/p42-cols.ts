import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  const tables = [
    'brain_opportunities',
    'brain_strategies',
    'brain_execution_plans',
    'brain_tasks',
    'brain_approvals',
    'brain_learnings',
    'brain_quality_results',
    'brain_verifications',
    'brain_research_runs',
    'brain_sources',
  ];
  const result = await pool.query(
    `SELECT table_name, column_name, data_type, character_maximum_length
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name = ANY($1)
       AND character_maximum_length IS NOT NULL AND character_maximum_length < 500
     ORDER BY table_name, character_maximum_length`,
    [tables]
  );
  for (const r of result.rows) {
    console.log(`${r.table_name}.${r.column_name} ${r.data_type}(${r.character_maximum_length})`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
