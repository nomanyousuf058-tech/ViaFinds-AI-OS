const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const active = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_opportunities WHERE status <> 'archived'")).rows[0].n;
  console.log('Active opportunities: ' + active.n);
  const realActive = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_opportunities WHERE provenance='REAL' AND status <> 'archived'")).rows[0].n;
  console.log('Active REAL: ' + realActive.n);
  const unknownActive = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_opportunities WHERE provenance='UNKNOWN' AND status <> 'archived'")).rows[0].n;
  console.log('Active UNKNOWN: ' + unknownActive.n);
  const approvals = (await pool.query("SELECT id, task_id, strategy_id, execution_plan_id, proposed_action, requested_permission, required_permission, evidence, status, decision, created_at FROM brain_approvals ORDER BY created_at DESC LIMIT 20")).rows;
  console.log('\n=== brain_approvals (' + approvals.length + ') ===');
  approvals.forEach(a => {
    const pa = a.proposed_action;
    const paStr = typeof pa === 'object' ? JSON.stringify(pa) : String(pa || '');
    console.log(JSON.stringify({ id: a.id.slice(0,8), status: a.status, decision: a.decision, proposed_action: paStr.slice(0,80), requested_permission: a.requested_permission }));
  });
  const risky = approvals.filter(a => typeof a.proposed_action === 'object' && a.proposed_action !== null);
  console.log('\napprovals with object proposed_action: ' + risky.length);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });