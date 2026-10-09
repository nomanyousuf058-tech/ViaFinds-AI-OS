import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query(`ALTER TABLE brain_sources DROP CONSTRAINT IF EXISTS brain_sources_source_id_key`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'brain_sources_research_source_uniq'
      ) THEN
        ALTER TABLE brain_sources
          ADD CONSTRAINT brain_sources_research_source_uniq UNIQUE (research_id, source_id);
      END IF;
    END $$;
  `);

  const constraints = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE conrelid = 'brain_sources'::regclass AND contype = 'u'
  `);
  console.log('UNIQUE constraints on brain_sources:');
  for (const row of constraints.rows) console.log(`  ${row.conname}: ${row.def}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
