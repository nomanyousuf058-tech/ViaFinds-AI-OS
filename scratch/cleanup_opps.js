const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const GENUINE_LIVE = new Set([
  'f28e4f5f-6e2b-49eb-b389-2a6f9689c3ef',
  '0ade4ca9', '852dbb09', '31a64be2', 'b792d298',
  '691ef19e', 'c84bc66b', 'b79ad292', 'b2d970f5', 'ba53845b'
]);
async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const all = (await client.query('SELECT * FROM brain_opportunities')).rows;
    const groups = { TEST: [], STALE: [], LIVE: [], REAL: [] };
    all.forEach(row => {
      const id8 = row.id.slice(0, 8);
      if (row.provenance === 'TEST') groups.TEST.push(row);
      else if (row.provenance === 'REAL') groups.REAL.push(row);
      else if (GENUINE_LIVE.has(row.id) || GENUINE_LIVE.has(id8)) groups.LIVE.push(row);
      else groups.STALE.push(row);
    });
    console.log('Classification:', JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v]) => [k, v.length]))));
    for (const row of groups.LIVE) {
      await client.query('UPDATE brain_opportunities SET provenance = $1, updated_at = NOW() WHERE id = $2', ['REAL', row.id]);
    }
    const toArchive = [...groups.TEST, ...groups.STALE];
    for (const row of toArchive) {
      await client.query('UPDATE brain_opportunities SET status = $1, updated_at = NOW() WHERE id = $2', ['archived', row.id]);
      await client.query('INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at) VALUES ($1,$2,$3,$4,NOW())',
        ['brain_opportunity_archived', 'brain_opportunities', row.id, JSON.stringify({
          reason: row.provenance === 'TEST' ? 'test opportunity archived' : 'stale/superseded UNKNOWN-provenance opportunity archived',
          title: row.title, priorProvenance: row.provenance, archivedAt: new Date().toISOString(),
          archivedBy: 'kilo-production-cleanup'
        })]);
    }
    const orphanPlans = (await client.query("SELECT id FROM brain_execution_plans WHERE provenance='UNKNOWN' AND status='running' AND opportunity_id IS NULL AND strategy_id IS NULL")).rows;
    for (const p of orphanPlans) {
      const tasks = (await client.query("SELECT COUNT(*)::int AS n FROM brain_tasks WHERE execution_plan_id=$1", [p.id])).rows[0].n;
      const learnings = (await client.query("SELECT COUNT(*)::int AS n FROM brain_learnings WHERE execution_plan_id=$1", [p.id])).rows[0].n;
      if (tasks + learnings > 0) throw new Error('SAFETY FAIL: orphan plan ' + p.id + ' has ' + (tasks+learnings) + ' live task/learning dependencies');
      await client.query("UPDATE brain_execution_plans SET status='failed', provenance='ARCHIVED', updated_at=NOW() WHERE id=$1", [p.id]);
      await client.query('INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at) VALUES ($1,$2,$3,$4,NOW())',
        ['brain_execution_plan_resolved', 'brain_execution_plans', p.id, JSON.stringify({ reason: 'orphaned stuck running plan from failed generation; quality_results retained as historical evidence', resolvedAt: new Date().toISOString(), resolvedBy: 'kilo-production-cleanup' })]);
    }
    const dormantStrats = (await client.query("SELECT id FROM brain_strategies WHERE provenance='UNKNOWN' AND status<>'active'")).rows;
    for (const s of dormantStrats) {
      await client.query("UPDATE brain_strategies SET status='archived', updated_at=NOW() WHERE id=$1", [s.id]);
      await client.query('INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at) VALUES ($1,$2,$3,$4,NOW())',
        ['brain_strategy_archived', 'brain_strategies', s.id, JSON.stringify({ reason: 'dormant UNKNOWN-provenance strategy', archivedAt: new Date().toISOString(), archivedBy: 'kilo-production-cleanup' })]);
    }
    const dormantPlans = (await client.query("SELECT p.id FROM brain_execution_plans p JOIN brain_strategies s ON p.strategy_id = s.id WHERE s.provenance='UNKNOWN' AND s.status='archived' AND p.status='pending_approval'")).rows;
    for (const p of dormantPlans) {
      await client.query("UPDATE brain_execution_plans SET status='archived', provenance='ARCHIVED', updated_at=NOW() WHERE id=$1", [p.id]);
      await client.query('INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at) VALUES ($1,$2,$3,$4,NOW())',
        ['brain_execution_plan_archived', 'brain_execution_plans', p.id, JSON.stringify({ reason: 'dormant plan linked to archived UNKNOWN strategy', archivedAt: new Date().toISOString(), archivedBy: 'kilo-production-cleanup' })]);
    }
    await client.query('COMMIT');
    console.log('Reclassified ' + groups.LIVE.length + ' UNKNOWN->REAL');
    console.log('Archived ' + toArchive.length + ' opportunities (TEST + stale)');
    console.log('Resolved ' + orphanPlans.length + ' orphan plans');
    console.log('Archived ' + dormantStrats.length + ' dormant strategies + ' + dormantPlans.length + ' dormant plans');
  } catch (e) { await client.query('ROLLBACK'); console.error('OPP CLEANUP FAILED, rolled back:', e.message); process.exit(1); } finally { client.release(); }
  const counts = (await pool.query('SELECT provenance, status, COUNT(*)::int AS n FROM brain_opportunities GROUP BY provenance, status ORDER BY provenance, status')).rows;
  console.log('\nAFTER opportunity counts:', JSON.stringify(counts));
  const activeCount = (await pool.query("SELECT COUNT(*)::int AS n FROM brain_opportunities WHERE status NOT IN ('archived')")).rows[0].n;
  console.log('Active opportunities: ' + activeCount.n);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });