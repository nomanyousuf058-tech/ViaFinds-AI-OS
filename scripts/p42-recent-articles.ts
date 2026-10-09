import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  const { rows } = await pool.query(
    `SELECT id, title, slug, status, provenance, brain_task_id, strategy_id, opportunity_id, created_at
     FROM articles ORDER BY created_at DESC LIMIT 10`
  );
  for (const r of rows) {
    console.log(`${r.created_at}  ${r.id}  ${r.status}  prov=${r.provenance}`);
    console.log(`    ${r.title}`);
    console.log(`    slug=${r.slug}`);
    console.log(`    task=${r.brain_task_id} strategy=${r.strategy_id} opportunity=${r.opportunity_id}`);
  }
  const counts = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE provenance='REAL')::int AS real,
            count(*) FILTER (WHERE provenance='TEST')::int AS test,
            count(*) FILTER (WHERE provenance IS NULL)::int AS unknown
     FROM articles`
  );
  console.log('\nARTICLE COUNTS:', JSON.stringify(counts.rows[0]));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
