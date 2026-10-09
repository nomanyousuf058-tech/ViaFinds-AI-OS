const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  // RLS status on all tables
  const rls = await pool.query(`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname='public' ORDER BY tablename
  `);
  const withRls = rls.rows.filter(r => r.rowsecurity);
  console.log('=== RLS ===');
  console.log('Tables with RLS enabled: ' + withRls.length + ' / ' + rls.rows.length);
  console.log(withRls.map(r => r.tablename).join(', ') || '(none)');

  // Constraints count per key table
  const cons = await pool.query(`
    SELECT conrelid::regclass AS tbl, conname, contype
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY tbl::text
  `);
  console.log('\n=== Constraints: ' + cons.rowCount + ' total ===');
  const byTable = {};
  cons.rows.forEach(r => { byTable[r.tbl] = (byTable[r.tbl]||0)+1; });
  console.log(JSON.stringify(byTable, null, 1));

  // Indexes on key tables
  const idx = await pool.query(`
    SELECT tablename, indexname FROM pg_indexes
    WHERE schemaname='public' AND tablename IN (
      'articles','affiliate_links','affiliate_clicks','affiliate_conversions',
      'brain_runs','brain_schedules','brain_strategies','brain_opportunities',
      'brain_tasks','brain_decisions','brain_approvals','brain_experiments',
      'brain_learnings','brain_observations','automation_jobs','admin_users','audit_logs'
    ) ORDER BY tablename, indexname
  `);
  console.log('\n=== Indexes on key tables ===');
  idx.rows.forEach(r => console.log('  ' + r.tablename + ' :: ' + r.indexname));

  // Fresh-live state verification
  console.log('\n=== Fresh-live state ===');
  const q = async (label, sql) => {
    const r = await pool.query(sql);
    console.log(label + ': ' + JSON.stringify(r.rows[0] || {}));
  };
  await q('active articles (non-archived)', "SELECT COUNT(*)::int AS n FROM articles WHERE status <> 'archived'");
  await q('active strategies', "SELECT COUNT(*)::int AS n FROM brain_strategies WHERE status <> 'archived'");
  await q('active opportunities', "SELECT COUNT(*)::int AS n FROM brain_opportunities WHERE status <> 'archived'");
  await q('active schedules', "SELECT COUNT(*)::int AS n FROM brain_schedules WHERE enabled = true");
  await q('real evidence: reports', "SELECT COUNT(*)::int AS n FROM brain_reports");
  await q('real evidence: observations', "SELECT COUNT(*)::int AS n FROM brain_observations");
  await q('real evidence: learnings', "SELECT COUNT(*)::int AS n FROM brain_learnings");
  await q('affiliate links', "SELECT COUNT(*)::int AS n FROM affiliate_links");
  await q('conversions', "SELECT COUNT(*)::int AS n FROM affiliate_conversions");
  await q('initialization rows', "SELECT COUNT(*)::int AS n FROM brain_initialization");

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
