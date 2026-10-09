import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool, disconnect } from '../lib/db/client';

async function main() {
  const pool = getPool();
  const a = await pool.query(`
    SELECT id, title, slug, status, brain_task_id, automation_job_id, strategy_id, opportunity_id,
           affiliate_url, provenance, created_at, published_at
    FROM articles ORDER BY created_at DESC LIMIT 12`);
  console.log('=== RECENT ARTICLES ===');
  for (const r of a.rows) {
    console.log(`\n${r.created_at} | ${r.status} | prov=${r.provenance}`);
    console.log(`  id=${r.id} slug=${r.slug}`);
    console.log(`  title=${String(r.title).slice(0, 80)}`);
    console.log(`  task=${r.brain_task_id} job=${r.automation_job_id} strat=${r.strategy_id} opp=${r.opportunity_id}`);
    console.log(`  affiliate=${r.affiliate_url}`);
  }

  console.log('\n=== ARTICLE TRACEABILITY AGGREGATE ===');
  const agg = await pool.query(`
    SELECT COUNT(*)::int total,
      COUNT(brain_task_id)::int with_task,
      COUNT(automation_job_id)::int with_job,
      COUNT(strategy_id)::int with_strategy,
      COUNT(opportunity_id)::int with_opportunity,
      COUNT(affiliate_url)::int with_affiliate,
      COUNT(*) FILTER (WHERE provenance='REAL')::int prov_real,
      COUNT(*) FILTER (WHERE provenance='TEST')::int prov_test,
      COUNT(*) FILTER (WHERE provenance='FIXTURE')::int prov_fixture,
      COUNT(*) FILTER (WHERE provenance='UNKNOWN')::int prov_unknown
    FROM articles`);
  console.log(agg.rows[0]);

  console.log('\n=== TASKS (recent) ===');
  const t = await pool.query(`SELECT id,type,title,status,approval_state,strategy_id,opportunity_id,provenance,created_at,evidence,recommendation FROM brain_tasks ORDER BY created_at DESC LIMIT 12`);
  for (const r of t.rows) {
    console.log(`\n${r.created_at} | ${r.status} | approval=${r.approval_state} | prov=${r.provenance} | ${r.id}`);
    console.log(`  ${r.type} :: ${r.title}`);
    console.log(`  strat=${r.strategy_id} opp=${r.opportunity_id}`);
    console.log(`  evidence=${JSON.stringify(r.evidence)}`);
    if (r.recommendation) console.log(`  rec=${String(r.recommendation).slice(0,160)}`);
  }

  console.log('\n=== OPPORTUNITIES ===');
  const o = await pool.query(`SELECT id,title,category,status,provenance,created_at,strategy_id,execution_plan_id,source FROM brain_opportunities ORDER BY created_at DESC LIMIT 12`);
  for (const r of o.rows) {
    console.log(`${r.created_at} | ${r.status} | prov=${r.provenance} | ${r.id} | ${r.category} | ${String(r.title).slice(0,70)} | strat=${r.strategy_id}`);
  }

  console.log('\n=== STRATEGIES ===');
  const s = await pool.query(`SELECT id,title,status,provenance,created_at,opportunity_id,approval_required FROM brain_strategies ORDER BY created_at DESC LIMIT 12`);
  for (const r of s.rows) {
    console.log(`${r.created_at} | ${r.status} | prov=${r.provenance} | approval_required=${r.approval_required} | ${r.id} | opp=${r.opportunity_id} | ${String(r.title).slice(0,60)}`);
  }

  console.log('\n=== EXECUTION PLANS ===');
  const p = await pool.query(`SELECT id,task_id,strategy_id,opportunity_id,status,provenance,created_at,correlation_id,automation_job_id,required_permissions FROM brain_execution_plans ORDER BY created_at DESC LIMIT 12`);
  for (const r of p.rows) {
    console.log(`${r.created_at} | ${r.status} | prov=${r.provenance} | ${r.id} | strat=${r.strategy_id} | task=${r.task_id} | corr=${r.correlation_id} | job=${r.automation_job_id} | perms=${JSON.stringify(r.required_permissions)}`);
  }

  console.log('\n=== APPROVALS ===');
  const ap = await pool.query(`SELECT * FROM brain_approvals ORDER BY created_at DESC`);
  for (const r of ap.rows) console.log(JSON.stringify(r, null, 2));

  console.log('\n=== AUTOMATION JOBS ===');
  const j = await pool.query(`SELECT id,idempotency_key,type,status,content_id,provider,model,created_at,completed_at,error FROM automation_jobs ORDER BY created_at DESC LIMIT 10`);
  for (const r of j.rows) console.log(`${r.created_at} | ${r.status} | ${r.id} | ${r.type} | key=${r.idempotency_key} | content=${r.content_id} | err=${String(r.error||'').slice(0,80)}`);

  console.log('\n=== QUALITY RESULTS ===');
  const qr = await pool.query(`SELECT * FROM brain_quality_results ORDER BY created_at DESC`);
  for (const r of qr.rows) console.log(JSON.stringify(r, null, 2).slice(0, 1200));

  console.log('\n=== VERIFICATIONS ===');
  const v = await pool.query(`SELECT * FROM brain_verifications ORDER BY created_at DESC`);
  for (const r of v.rows) console.log(JSON.stringify(r, null, 2).slice(0, 900));

  console.log('\n=== LEARNINGS ===');
  const l = await pool.query(`SELECT id,correlation_id,success,reusable,source,provenance,created_at,lesson FROM brain_learnings ORDER BY created_at DESC`);
  for (const r of l.rows) console.log(`${r.created_at} | ${r.provenance} | success=${r.success} | reusable=${r.reusable} | src=${r.source} | ${r.id} | ${String(r.lesson).slice(0,100)}`);

  await disconnect();
}

main().catch(async (e) => { console.error(e); await disconnect(); process.exit(1); });
