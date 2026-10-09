const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function finishCleanup() {
  console.log('=== Finishing fresh live start cleanup ===\n');
  
  // 1. Archive remaining published articles (they're all test content)
  const artResult = await pool.query("UPDATE articles SET status = 'archived', updated_at = NOW() WHERE status = 'published'");
  console.log(`Articles archived: ${artResult.rowCount}`);
  
  // 2. Affiliate links are REAL Digistore24 links - PRESERVE
  console.log('Affiliate links: REAL Digistore24 links preserved (not archived)');
  
  // 3. Archive brain initialization
  const initResult = await pool.query("UPDATE brain_initialization SET status = 'archived', data = jsonb_set(COALESCE(data, '{}'::jsonb), '{archived_at}', to_jsonb(NOW())) WHERE status = 'initialized'");
  console.log(`Brain initializations archived: ${initResult.rowCount}`);
  
  // 4. Archive brain runs (test/cron/manual) - no updated_at column, status constraint doesn't allow 'archived'
  // Mark as archived in results JSON instead
  const runsResult = await pool.query("UPDATE brain_runs SET results = jsonb_set(jsonb_set(COALESCE(results, '{}'::jsonb), '{archived}', 'true'::jsonb), '{archived_at}', to_jsonb(NOW())) WHERE trigger ILIKE '%test%' OR trigger ILIKE '%manual%' OR trigger ILIKE '%cron%'");
  console.log(`Brain runs marked as archived: ${runsResult.rowCount}`);
  
  // 5. Archive old brain schedules (disable test ones) - use 'disabled' not 'archived' (constraint)
  const schedResult = await pool.query("UPDATE brain_schedules SET enabled = false, status = 'disabled', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{archived_at}', to_jsonb(NOW())), updated_at = NOW() WHERE key IN ('daily_health', 'weekly_research', 'daily_opportunity_scan', 'monthly_strategy_review') AND key NOT IN (SELECT key FROM brain_schedules WHERE metadata->>'created_for' = 'fresh_live_start')");
  console.log(`Brain schedules disabled (test): ${schedResult.rowCount}`);
  
  // 6. Archive test strategies
  const stratResult = await pool.query("UPDATE brain_strategies SET status = 'archived', updated_at = NOW() WHERE provenance IN ('TEST', 'test') OR title ILIKE '%test%' OR title ILIKE '%demo%' OR title ILIKE '%experiment%' OR title ILIKE '%audit%'");
  console.log(`Brain strategies archived: ${stratResult.rowCount}`);
  
  // 7. Archive test opportunities
  const oppResult = await pool.query("UPDATE brain_opportunities SET status = 'archived', updated_at = NOW() WHERE provenance IN ('TEST', 'test', 'FIXTURE') OR title ILIKE '%test%' OR title ILIKE '%demo%'");
  console.log(`Brain opportunities archived: ${oppResult.rowCount}`);
  
  // 8. Archive test tasks
  const taskResult = await pool.query("UPDATE brain_tasks SET status = 'archived', evidence = jsonb_set(COALESCE(evidence, '{}'::jsonb), '{archived}', 'true'::jsonb), updated_at = NOW() WHERE provenance IN ('TEST', 'test') OR title ILIKE '%test%' OR title ILIKE '%demo%' OR title ILIKE '%phase 3%'");
  console.log(`Brain tasks archived: ${taskResult.rowCount}`);
  
  // 9. Archive test approvals
  const apprResult = await pool.query("UPDATE brain_approvals SET status = 'archived', updated_at = NOW() WHERE provenance IN ('TEST', 'test') OR (evidence->>'correlationId') ILIKE '%test%'");
  console.log(`Brain approvals archived: ${apprResult.rowCount}`);
  
  // 10. Archive test decisions
  const decResult = await pool.query("UPDATE brain_decisions SET status = 'archived', updated_at = NOW() WHERE provenance IN ('TEST', 'test', 'TEST_PROVENANCE') OR title ILIKE '%test%' OR title ILIKE '%audit%'");
  console.log(`Brain decisions archived: ${decResult.rowCount}`);
  
  // 11. Archive test automation jobs
  const jobResult = await pool.query("UPDATE automation_jobs SET status = 'archived', result = jsonb_set(COALESCE(result, '{}'::jsonb), '{archived}', 'true'::jsonb), updated_at = NOW() WHERE idempotency_key ILIKE '%test%' OR idempotency_key ILIKE '%demo%' OR input->>'topic' ILIKE '%test%'");
  console.log(`Automation jobs archived: ${jobResult.rowCount}`);
  
  // 12. Ensure fresh production schedules exist
  await pool.query(`
    INSERT INTO brain_schedules (key, purpose, frequency, enabled, status, handler, metadata, next_run)
    VALUES 
      ('daily_opportunity_scan', 'Daily opportunity discovery and validation', 'daily', true, 'scheduled', 'brain_cycle:opportunities', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '6 hours'),
      ('daily_health', 'Daily system health assessment', 'daily', true, 'scheduled', 'brain_cycle:health', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '2 hours'),
      ('weekly_research', 'Weekly deep research cycle', 'weekly', true, 'scheduled', 'brain_cycle:research', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '1 week'),
      ('monthly_strategy_review', 'Monthly strategy evaluation and adjustment', 'monthly', true, 'scheduled', 'brain_cycle:strategy_review', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '1 month')
    ON CONFLICT (key) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      status = EXCLUDED.status,
      handler = EXCLUDED.handler,
      metadata = EXCLUDED.metadata,
      next_run = EXCLUDED.next_run,
      updated_at = NOW();
  `);
  console.log('Fresh production schedules ensured');
  
  // 13. Audit log entries
  await pool.query(`
    INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
    VALUES 
      ('fresh_live_start_archive_final', 'articles', NULL, '{"reason": "Phase 15.5 fresh live start - remaining published articles archived"}', NOW()),
      ('fresh_live_start_archive_final', 'affiliate_links', NULL, '{"reason": "Real Digistore24 affiliate links preserved"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_initialization', NULL, '{"reason": "Previous test initialization archived for fresh wake-up"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_runs', NULL, '{"reason": "Test runs archived"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_schedules', NULL, '{"reason": "Test schedules disabled, fresh production schedules created"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_strategies', NULL, '{"reason": "Test/experimental strategies archived"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_opportunities', NULL, '{"reason": "Test opportunities archived"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_tasks', NULL, '{"reason": "All test tasks archived"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_approvals', NULL, '{"reason": "Test approvals archived"}', NOW()),
      ('fresh_live_start_archive_final', 'brain_decisions', NULL, '{"reason": "Test decisions archived"}', NOW()),
      ('fresh_live_start_archive_final', 'automation_jobs', NULL, '{"reason": "Test automation jobs archived"}', NOW());
  `);
  console.log('Audit log entries created');
  
  console.log('\n=== Cleanup complete ===');
  await pool.end();
}

finishCleanup().catch(e => { console.error(e); process.exit(1); });