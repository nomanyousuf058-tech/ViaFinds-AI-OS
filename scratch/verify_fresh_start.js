const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function verify() {
  const queries = [
    "SELECT 'articles' as table_name, status, COUNT(*) FROM articles GROUP BY status",
    "SELECT 'affiliate_links' as table_name, 'archived' as status, COUNT(*) FROM affiliate_links WHERE destination_url LIKE 'archived:%'",
    "SELECT 'brain_initialization' as table_name, status, COUNT(*) FROM brain_initialization GROUP BY status",
    "SELECT 'brain_runs' as table_name, status, COUNT(*) FROM brain_runs GROUP BY status",
    "SELECT 'brain_schedules' as table_name, enabled::text as status, COUNT(*) FROM brain_schedules GROUP BY enabled",
    "SELECT 'brain_strategies' as table_name, status, COUNT(*) FROM brain_strategies GROUP BY status",
    "SELECT 'brain_opportunities' as table_name, status, COUNT(*) FROM brain_opportunities GROUP BY status",
    "SELECT 'brain_tasks' as table_name, status, COUNT(*) FROM brain_tasks GROUP BY status",
    "SELECT 'brain_approvals' as table_name, status, COUNT(*) FROM brain_approvals GROUP BY status",
    "SELECT 'brain_decisions' as table_name, status, COUNT(*) FROM brain_decisions GROUP BY status",
    "SELECT 'automation_jobs' as table_name, status, COUNT(*) FROM automation_jobs GROUP BY status",
    "SELECT 'brain_reports' as table_name, 'preserved' as status, COUNT(*) FROM brain_reports",
    "SELECT 'brain_observations' as table_name, 'preserved' as status, COUNT(*) FROM brain_observations",
    "SELECT 'brain_learnings' as table_name, 'preserved' as status, COUNT(*) FROM brain_learnings",
  ];
  
  for (const q of queries) {
    const r = await pool.query(q);
    console.log(r.rows.map(row => Object.values(row).join(' | ')).join('; '));
  }
  await pool.end();
}
verify();