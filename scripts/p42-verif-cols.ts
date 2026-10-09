import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });
  const tables = ['brain_verifications', 'brain_quality_results', 'brain_learnings'];
  for (const t of tables) {
    const r = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n== ${t} ==`);
    console.log(r.rows.map((x) => `  ${x.column_name}: ${x.data_type}`).join('\n'));
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
