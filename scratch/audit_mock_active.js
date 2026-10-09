// Mock data sweep — ACTIVE (non-archived) state only
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const TEST_TOKENS = ['test', 'mock', 'fixture', 'demo', 'dummy', 'sample', 'lorem', 'placeholder'];

function score(text) {
  const t = (text || '').toLowerCase();
  return TEST_TOKENS.filter(s => t.includes(s)).length;
}

async function audit(table, labelCol) {
  let rows;
  try {
    rows = await pool.query(`SELECT * FROM ${table} LIMIT 500`);
  } catch (e) { console.log(`${table}: ERROR ${e.message}`); return; }
  const active = rows.rows.filter(r => r.status !== 'archived' && r.status !== 'disabled');
  const counts = { test: 0, unknown: 0 };
  const samples = [];
  active.forEach(r => {
    const text = JSON.stringify(r).toLowerCase();
    const s = score(text);
    const v = s > 0 ? 'test' : 'unknown';
    counts[v]++;
    if (v === 'test' && samples.length < 8) samples.push({ id: r.id, label: r[labelCol] || r.title || r.key || '', provenance: r.provenance, status: r.status });
  });
  console.log(`${table.padEnd(28)} active=${active.length} test=${counts.test} unknown=${counts.unknown}`);
  samples.forEach(s => console.log('   sample: ' + JSON.stringify(s)));
}

async function main() {
  await audit('brain_strategies', 'title');
  await audit('brain_opportunities', 'title');
  await audit('brain_tasks', 'title');
  await audit('brain_decisions', 'title');
  await audit('brain_approvals', 'title');
  await audit('brain_experiments', 'title');
  await audit('brain_execution_plans', 'title');
  await audit('brain_quality_results', 'title');
  await audit('brain_reports', 'title');
  await audit('brain_observations', 'title');
  await audit('brain_learnings', 'title');
  await audit('brain_memory', 'summary');
  await audit('brain_research_runs', 'trigger');
  await audit('brain_initialization', 'initialization_id');
  await audit('brain_runs', 'trigger');
  await audit('brain_schedules', 'key');
  await audit('automation_jobs', 'idempotency_key');
  await audit('articles', 'title');
  await audit('affiliate_links', 'name');
  await audit('affiliate_clicks', 'id');
  await audit('affiliate_conversions', 'id');
  await audit('partner_registry', 'name');
  await audit('optimization_jobs', 'id');
  await audit('research_jobs', 'id');
  await audit('reviews', 'title');
  await audit('products', 'name');
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });