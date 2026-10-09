require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const dbUrl = process.env.DATABASE_URL || '';
const url = new URL(dbUrl);
const pool = new Pool({
  host: url.hostname, port: parseInt(url.port) || 5432,
  database: url.pathname.substring(1),
  user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  connectionTimeoutMillis: 30000, max: 1,
});
(async () => {
  // Check experiment tables
  const tables = ['brain_experiments', 'brain_experiment_events', 'brain_experiment_results'];
  for (const t of tables) {
    const exists = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [t]);
    console.log(t + ' exists: ' + exists.rows[0].exists);
    if (exists.rows[0].exists) {
      const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t]);
      console.log('  Columns (' + cols.rows.length + '):');
      cols.rows.forEach(r => console.log('    ' + r.column_name + ' (' + r.data_type + ') ' + (r.is_nullable === 'NO' ? 'NOT NULL' : 'nullable')));
      const count = await pool.query('SELECT COUNT(*) as c FROM ' + t);
      console.log('  Rows: ' + count.rows[0].c);
      const rls = await pool.query("SELECT rowsecurity FROM pg_tables WHERE tablename = $1", [t]);
      console.log('  RLS: ' + rls.rows[0].rowsecurity);
    }
  }
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });