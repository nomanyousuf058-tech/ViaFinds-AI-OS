const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

async function auditDb() {
  const env = dotenv.parse(fs.readFileSync('.env.local'));
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL successfully.\n');

    // Total database size
    const dbSize = await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) as total_db_size;");
    console.log('Total Database Size:', dbSize.rows[0].total_db_size);

    // Tables and sizes
    const tables = await client.query(`
      SELECT 
        table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
        pg_total_relation_size(quote_ident(table_name)) as bytes
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY bytes DESC;
    `);

    console.log('\n--- PUBLIC TABLES & SIZES ---');
    for (const t of tables.rows) {
      try {
        const countRes = await client.query('SELECT count(*) as count FROM "' + t.table_name + '"');
        console.log(`- ${t.table_name}: ${t.total_size} (${countRes.rows[0].count} rows)`);
      } catch (err) {
        console.log(`- ${t.table_name}: ${t.total_size} (count error: ${err.message})`);
      }
    }

    // Indexes
    const indexes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(quote_ident(indexname)::regclass)) as index_size
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log('\n--- TOTAL PUBLIC INDEXES ---', indexes.rows.length);

    await client.end();
  } catch (err) {
    console.error('Audit DB error:', err);
    process.exit(1);
  }
}

auditDb();
