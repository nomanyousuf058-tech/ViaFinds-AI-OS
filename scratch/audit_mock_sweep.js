// Mock data forensic sweep across all brain/CMS tables
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const TEST_TOKENS = ['test', 'mock', 'fixture', 'demo', 'dummy', 'sample', 'lorem', 'placeholder'];

function score(text) {
  const t = (text || '').toLowerCase();
  let hits = TEST_TOKENS.filter(s => t.includes(s)).length;
  return hits;
}

async function audit(table, cols, labelCol) {
  let rows;
  try {
    rows = await pool.query(`SELECT * FROM ${table} LIMIT 500`);
  } catch (e) { console.log(`${table}: ERROR ${e.message}`); return; }
  const counts = { test: 0, real: 0, unknown: 0 };
  const samples = [];
  rows.rows.forEach(r => {
    const text = JSON.stringify(r).toLowerCase();
    const s = score(text);
    const v = s > 0 ? 'test' : 'unknown';
    counts[v]++;
    if (v === 'test' && samples.length < 5) samples.push({ id: r.id, label: r[labelCol] || r.title || r.key || '', provenance: r.provenance });
  });
  console.log(`${table.padEnd(28)} total=${rows.rows.length} test=${counts.test} unknown=${counts.unknown}`);
  samples.forEach(s => console.log('   sample: ' + JSON.stringify(s)));
}

async function main() {
  await audit('brain_strategies', null, 'title');
  await audit('brain_opportunities', null, 'title');
  await audit('brain_tasks', null, 'title');
  await audit('brain_decisions', null, 'title');
  await audit('brain_approvals', null, 'title');
  await audit('brain_experiments', null, 'title');
  await audit('brain_observations', null, 'title');
  await audit('brain_learnings', null, 'title');
  await audit('brain_reports', null, 'title');
  await audit('brain_initialization', null, 'initialization_id');
  await audit('brain_runs', null, 'trigger');
  await audit('brain_schedules', null, 'key');
  await audit('brain_memory', null, 'summary');
  await audit('brain_memory_v2', null, 'summary');
  await audit('brain_research_runs', null, 'trigger');
  await audit('brain_experiment_results', null, 'title');
  await audit('brain_experiment_events', null, 'event_type');
  await audit('brain_execution_plans', null, 'title');
  await audit('brain_content_strategies', null, 'title');
  await audit('brain_quality_results', null, 'title');
  await audit('brain_verifications', null, 'title');
  await audit('brain_product_discoveries', null, 'title');
  await audit('brain_cost_decisions', null, 'title');
  await audit('brain_cost_events', null, 'event_type');
  await audit('brain_business_snapshots', null, 'title');
  await audit('brain_technology_radar', null, 'title');
  await audit('brain_implementation_requests', null, 'title');
  await audit('brain_strategy_evolution', null, 'evolution_type');
  await audit('brain_sources', null, 'name');
  await audit('brain_memory', null, 'summary');
  await audit('automation_jobs', null, 'idempotency_key');
  await audit('articles', null, 'title');
  await audit('affiliate_links', null, 'name');
  await audit('affiliate_clicks', null, 'id');
  await audit('affiliate_conversions', null, 'id');
  await audit('partner_registry', null, 'name');
  await audit('partner_compatibility_scores', null, 'id');
  await audit('optimization_jobs', null, 'id');
  await audit('research_jobs', null, 'id');
  await audit('reviews', null, 'title');
  await audit('review_comparison_products', null, 'id');
  await audit('products', null, 'name');
  await audit('article_related_articles', null, 'id');
  await audit('article_related_products', null, 'id');
  await audit('audit_logs', null, 'action');
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });