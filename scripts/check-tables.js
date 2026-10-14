import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

await client.connect();
const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
console.log('Tables:', res.rows.map(x => x.tablename).join(', '));
await client.end();