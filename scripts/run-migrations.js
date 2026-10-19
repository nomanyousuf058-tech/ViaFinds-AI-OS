import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { validateStagingDatabase } from '../lib/db/guard.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Preflight database isolation check (Fail-closed)
let preflight;
try {
  preflight = validateStagingDatabase(process.env);
  console.log(`✓ Staging database isolation verified (Target: ${preflight.sanitizedIdentifier})`);
} catch (err) {
  console.error(`✗ Migration aborted by database guard: ${err.message}`);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
const { Client } = pg;

const client = new Client({
  connectionString: DATABASE_URL,
});

async function runMigrations() {
  await client.connect();
  console.log('Connected to staging database');

  // Create schema_migrations table if not exists
  await client.query(`CREATE SCHEMA IF NOT EXISTS supabase_migrations;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // First, run base schema.sql
  console.log('Applying base schema.sql...');
  const baseSchema = fs.readFileSync(path.join(__dirname, '../lib/db/schema.sql'), 'utf-8');
  try {
    await client.query(baseSchema);
    console.log('✓ Base schema applied');
  } catch (err) {
    console.error('✗ Base schema failed:', err.message);
    throw err;
  }

  const migrationsDir = path.join(__dirname, '../lib/db/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.split('_')[0];
    const name = file.replace('.sql', '');

    // Check if already applied
    const check = await client.query(
      'SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = $1',
      [version]
    );

    if (check.rows.length > 0) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)',
        [version, name]
      );
      console.log(`✓ ${file} applied`);
    } catch (err) {
      // Handle "already exists" errors for constraints, indexes, etc.
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
        console.log(`⊘ ${file} skipped (already exists): ${err.message.split('\n')[0]}`);
        await client.query(
          'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)',
          [version, name]
        );
      } else {
        console.error(`✗ ${file} failed:`, err.message);
        throw err;
      }
    }
  }

  console.log('All migrations applied successfully');
  await client.end();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});