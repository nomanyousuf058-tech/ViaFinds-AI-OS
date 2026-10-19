import pg from 'pg';
import { validateStagingDatabase } from '../lib/db/guard.ts';
const { Client } = pg;

// Preflight database isolation check (Fail-closed)
try {
  const preflight = validateStagingDatabase(process.env, { allowLocalDev: true });
  console.log(`✓ Clean-db target verified: ${preflight.sanitizedIdentifier}`);
} catch (err) {
  console.error(`✗ Clean-db aborted by database guard: ${err.message}`);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

await client.connect();

// Drop all tables in public schema
const res = await client.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
`);

for (const row of res.rows) {
  await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
  console.log(`Dropped table: ${row.tablename}`);
}

// Drop schema_migrations schema
await client.query(`DROP SCHEMA IF EXISTS supabase_migrations CASCADE`);
console.log('Dropped schema: supabase_migrations');

await client.end();
console.log('Cleanup complete');