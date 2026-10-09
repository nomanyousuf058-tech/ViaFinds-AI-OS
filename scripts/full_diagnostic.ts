/**
 * COMPREHENSIVE BRAIN STATE DIAGNOSTIC
 * 
 * Checks ALL initialization side effects that wakeBrain is contractually
 * required to produce, plus full forensic audit of all production tables.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { query } from '../lib/db/client';

async function diagnose() {
  const out: Record<string, unknown> = {};

  // ─── 1. brain_initialization ───
  const init = await query('SELECT * FROM brain_initialization');
  out.brain_initialization = init.rows;

  // ─── 2. brain_runs (all) ───
  const runs = await query('SELECT id, run_type, trigger, status, started_at, completed_at, error FROM brain_runs ORDER BY started_at DESC');
  out.brain_runs = runs.rows;

  // ─── 3. brain_strategies ───
  const strategies = await query('SELECT id, title, status, confidence, provenance, created_at FROM brain_strategies ORDER BY created_at DESC');
  out.brain_strategies = strategies.rows;

  // ─── 4. brain_opportunities ───
  const opps = await query('SELECT id, title, type, status, confidence, provenance, source, created_at FROM brain_opportunities ORDER BY created_at DESC');
  out.brain_opportunities = opps.rows;

  // ─── 5. brain_tasks ───
  const tasks = await query('SELECT id, type, title, status, priority, provenance, strategy_id, opportunity_id, created_at FROM brain_tasks ORDER BY created_at DESC');
  out.brain_tasks = tasks.rows;

  // ─── 6. brain_memory ───
  const memory = await query('SELECT id, type, key, status, created_at FROM brain_memory ORDER BY created_at DESC LIMIT 20');
  out.brain_memory = memory.rows;

  // ─── 7. brain_reports ───
  const reports = await query('SELECT id, created_at FROM brain_reports ORDER BY created_at DESC LIMIT 10');
  out.brain_reports = reports.rows;

  // ─── 8. brain_schedules ───
  try {
    const schedules = await query('SELECT * FROM brain_schedules ORDER BY created_at DESC');
    out.brain_schedules = schedules.rows;
  } catch { out.brain_schedules = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 9. brain_observations ───
  try {
    const obs = await query('SELECT id, type, created_at FROM brain_observations ORDER BY created_at DESC LIMIT 10');
    out.brain_observations = obs.rows;
  } catch { out.brain_observations = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 10. brain_learnings ───
  try {
    const learnings = await query('SELECT id, type, title, status, provenance, created_at FROM brain_learnings ORDER BY created_at DESC LIMIT 10');
    out.brain_learnings = learnings.rows;
  } catch { out.brain_learnings = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 11. brain_decisions ───
  try {
    const decisions = await query('SELECT id, type, status, created_at FROM brain_decisions ORDER BY created_at DESC LIMIT 10');
    out.brain_decisions = decisions.rows;
  } catch { out.brain_decisions = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 12. brain_approvals ───
  const approvals = await query('SELECT id, status, proposed_action, requested_permission, created_at FROM brain_approvals ORDER BY created_at DESC LIMIT 10');
  out.brain_approvals = approvals.rows;

  // ─── 13. brain_quality_results ───
  try {
    const qr = await query('SELECT id, status, provenance, created_at FROM brain_quality_results ORDER BY created_at DESC LIMIT 10');
    out.brain_quality_results = qr.rows;
  } catch { out.brain_quality_results = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 14. automation_jobs ───
  const jobs = await query(`
    SELECT id, idempotency_key, type, stage, status, provider, model, error, 
           content_type, content_id, retry_count, created_at, completed_at
    FROM automation_jobs ORDER BY created_at DESC
  `);
  out.automation_jobs = { total: jobs.rows.length, rows: jobs.rows };

  // ─── 15. articles — FULL CLASSIFICATION ───
  const articles = await query(`
    SELECT id, title, slug, status, article_type, 
           published_at, created_at, updated_at, 
           author_id, category_id, product_id,
           affiliate_url, provenance, brain_task_id, 
           automation_job_id, strategy_id, opportunity_id,
           LEFT(CAST(content AS TEXT), 200) AS content_preview,
           LEFT(CAST(excerpt AS TEXT), 200) AS excerpt_preview
    FROM articles ORDER BY created_at DESC
  `);
  out.articles = { total: articles.rows.length, rows: articles.rows };

  // ─── 16. affiliate_links ───
  try {
    const aff = await query('SELECT id, url, partner_id, status, created_at FROM affiliate_links ORDER BY created_at DESC LIMIT 20');
    out.affiliate_links = aff.rows;
  } catch { out.affiliate_links = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 17. affiliate_clicks ───
  try {
    const clicks = await query('SELECT COUNT(*) as count FROM affiliate_clicks');
    out.affiliate_clicks_count = clicks.rows[0]?.count;
  } catch { out.affiliate_clicks_count = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 18. affiliate_conversions ───
  try {
    const conv = await query('SELECT COUNT(*) as count FROM affiliate_conversions');
    out.affiliate_conversions_count = conv.rows[0]?.count;
  } catch { out.affiliate_conversions_count = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 19. service_connections (partner registry) ───
  try {
    const sc = await query('SELECT id, provider, status, created_at FROM service_connections ORDER BY created_at DESC');
    out.service_connections = sc.rows;
  } catch { out.service_connections = 'TABLE_NOT_FOUND_OR_ERROR'; }

  // ─── 20. Current active strategy ───
  try {
    const active = await query(`SELECT id, title, status, provenance FROM brain_strategies WHERE status = 'approved' OR status = 'active' ORDER BY created_at DESC`);
    out.active_strategies = active.rows;
  } catch { out.active_strategies = 'ERROR'; }

  // ─── 21. Orphan checks ───
  try {
    // Tasks referencing non-existent strategies
    const orphanTasks = await query(`
      SELECT bt.id, bt.title, bt.strategy_id 
      FROM brain_tasks bt 
      LEFT JOIN brain_strategies bs ON bt.strategy_id = bs.id 
      WHERE bt.strategy_id IS NOT NULL AND bs.id IS NULL
    `);
    out.orphan_tasks_missing_strategy = orphanTasks.rows;

    // Tasks referencing non-existent opportunities
    const orphanTaskOpp = await query(`
      SELECT bt.id, bt.title, bt.opportunity_id 
      FROM brain_tasks bt 
      LEFT JOIN brain_opportunities bo ON bt.opportunity_id = bo.id 
      WHERE bt.opportunity_id IS NOT NULL AND bo.id IS NULL
    `);
    out.orphan_tasks_missing_opportunity = orphanTaskOpp.rows;

    // Articles referencing non-existent jobs
    const orphanArticleJob = await query(`
      SELECT a.id, a.title, a.automation_job_id 
      FROM articles a 
      LEFT JOIN automation_jobs aj ON a.automation_job_id = aj.id 
      WHERE a.automation_job_id IS NOT NULL AND aj.id IS NULL
    `);
    out.orphan_articles_missing_job = orphanArticleJob.rows;

    // Articles referencing non-existent strategies
    const orphanArticleStrat = await query(`
      SELECT a.id, a.title, a.strategy_id 
      FROM articles a 
      LEFT JOIN brain_strategies bs ON a.strategy_id = bs.id 
      WHERE a.strategy_id IS NOT NULL AND bs.id IS NULL
    `);
    out.orphan_articles_missing_strategy = orphanArticleStrat.rows;
  } catch (e) {
    out.orphan_check_error = e instanceof Error ? e.message : String(e);
  }

  // ─── 22. Table list ───
  const tables = await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  out.all_tables = tables.rows.map(r => r.tablename);

  // ─── Print ───
  console.log(JSON.stringify(out, null, 2));
}

diagnose().catch(e => { console.error('DIAGNOSTIC FAILED:', e); process.exit(1); }).finally(() => process.exit(0));
