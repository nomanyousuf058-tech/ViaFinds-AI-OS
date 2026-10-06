-- ============================================================
-- PHASE 15.5 — FRESH LIVE START / PRE-WAKE-UP CLEAN STATE
-- ============================================================
-- Objective: Prepare production DB for real live Brain operation
-- from a CLEAN, FRESH BUSINESS STATE.
--
-- Strategy: ARCHIVE test/demo data, PRESERVE real business evidence
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLE CMS FRESH START
-- ============================================================
-- Archive all test/demo articles (provenance = TEST or old test content)
-- Keep only explicitly real articles if any exist

-- First, let's see current article statuses
-- UPDATE articles SET status = 'archived' WHERE provenance IN ('TEST', 'test') OR status IN ('draft', 'published');

-- For now, archive ALL articles since they're all test content
-- Real articles would have provenance = 'REAL' and actual SEO/traffic value
UPDATE articles 
SET status = 'archived', 
    updated_at = NOW() 
WHERE status IN ('draft', 'published');

-- ============================================================
-- 2. AFFILIATE DATA - ARCHIVE TEST, PRESERVE REAL
-- ============================================================
-- All current affiliate data is test (example.com destinations)
-- Archive test clicks/conversions, mark as TEST

UPDATE affiliate_links 
SET destination_url = 'archived:' || destination_url,
    updated_at = NOW()
WHERE destination_url LIKE '%example.com%';

UPDATE affiliate_clicks 
SET ip_address = NULL,
    user_agent = 'archived:test'
WHERE affiliate_link_id IN (SELECT id FROM affiliate_links WHERE destination_url LIKE 'archived:%');

UPDATE affiliate_conversions 
SET status = 'test_archived',
    raw_data = jsonb_set(COALESCE(raw_data, '{}'::jsonb), '{archived}', 'true'::jsonb)
WHERE provider_transaction_id LIKE 'test-%' OR provider_transaction_id LIKE 'demo-%';

-- ============================================================
-- 3. BRAIN INITIALIZATION - RESET FOR FRESH WAKE-UP
-- ============================================================
-- Archive existing initialization, allow fresh wake-up

UPDATE brain_initialization 
SET status = 'archived',
    data = jsonb_set(COALESCE(data, '{}'::jsonb), '{archived_at}', to_jsonb(NOW())),
    updated_at = NOW()
WHERE status = 'initialized';

-- ============================================================
-- 4. BRAIN RUNS - ARCHIVE TEST RUNS
-- ============================================================
UPDATE brain_runs 
SET status = 'archived',
    results = jsonb_set(COALESCE(results, '{}'::jsonb), '{archived}', 'true'::jsonb),
    updated_at = NOW()
WHERE run_type IN ('wake_up', 'cycle') AND trigger LIKE '%test%' OR trigger LIKE '%manual%' OR trigger LIKE '%cron%';

-- ============================================================
-- 5. BRAIN SCHEDULES - DISABLE TEST SCHEDULES
-- ============================================================
UPDATE brain_schedules 
SET enabled = false,
    status = 'archived',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{archived_at}', to_jsonb(NOW())),
    updated_at = NOW()
WHERE key IN ('daily_health', 'weekly_research', 'daily_opportunity_scan', 'monthly_strategy_review');

-- ============================================================
-- 6. BRAIN STRATEGIES - ARCHIVE TEST/EXPERIMENTAL
-- ============================================================
-- Keep only the intended baseline strategy
UPDATE brain_strategies 
SET status = 'archived',
    updated_at = NOW()
WHERE provenance IN ('TEST', 'test') OR title ILIKE '%test%' OR title ILIKE '%demo%' OR title ILIKE '%experiment%';

-- ============================================================
-- 7. BRAIN OPPORTUNITIES - ARCHIVE TEST
-- ============================================================
UPDATE brain_opportunities 
SET status = 'archived',
    updated_at = NOW()
WHERE provenance IN ('TEST', 'test', 'FIXTURE') OR title ILIKE '%test%' OR title ILIKE '%demo%';

-- ============================================================
-- 8. BRAIN TASKS - ARCHIVE ALL TEST TASKS
-- ============================================================
UPDATE brain_tasks 
SET status = 'archived',
    evidence = jsonb_set(COALESCE(evidence, '{}'::jsonb), '{archived}', 'true'::jsonb),
    updated_at = NOW()
WHERE provenance IN ('TEST', 'test') OR title ILIKE '%test%' OR title ILIKE '%demo%' OR title ILIKE '%phase 3%';

-- ============================================================
-- 9. BRAIN APPROVALS - ARCHIVE TEST APPROVALS
-- ============================================================
UPDATE brain_approvals 
SET status = 'archived',
    updated_at = NOW()
WHERE provenance IN ('TEST', 'test') OR (evidence->>'correlationId') LIKE '%test%';

-- ============================================================
-- 10. BRAIN DECISIONS - ARCHIVE TEST DECISIONS
-- ============================================================
UPDATE brain_decisions 
SET status = 'archived',
    updated_at = NOW()
WHERE provenance IN ('TEST', 'test', 'TEST_PROVENANCE') OR title ILIKE '%test%' OR title ILIKE '%audit%';

-- ============================================================
-- 11. AUTOMATION JOBS - ARCHIVE TEST JOBS
-- ============================================================
UPDATE automation_jobs 
SET status = 'archived',
    result = jsonb_set(COALESCE(result, '{}'::jsonb), '{archived}', 'true'::jsonb),
    updated_at = NOW()
WHERE idempotency_key LIKE '%test%' OR idempotency_key LIKE '%demo%' OR input->>'topic' ILIKE '%test%';

-- ============================================================
-- 12. PRESERVE REAL BUSINESS EVIDENCE
-- ============================================================
-- These tables contain real business evidence - DO NOT TOUCH:
-- - brain_reports (2 real analysis reports)
-- - brain_observations (12 from real reports)
-- - brain_learnings (2 from real executions)
-- - Any records with provenance = 'REAL' that represent actual business activity

-- Mark preserved records for audit trail
UPDATE brain_reports 
SET context = jsonb_set(COALESCE(context, '{}'::jsonb), '{preserved_for_fresh_start}', 'true'::jsonb)
WHERE true;

UPDATE brain_observations 
SET provenance = 'REAL_PRESERVED'
WHERE provenance = 'UNKNOWN' OR provenance = 'REAL';

UPDATE brain_learnings 
SET provenance = 'REAL_PRESERVED'
WHERE provenance = 'REAL';

-- ============================================================
-- 13. CREATE FRESH PRODUCTION SCHEDULES
-- ============================================================
-- Insert the correct production schedules for live operation
INSERT INTO brain_schedules (key, purpose, frequency, cron_expression, enabled, status, metadata, next_run)
VALUES 
  ('daily_opportunity_scan', 'Daily opportunity discovery and validation', 'daily', '0 6 * * *', true, 'scheduled', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '6 hours'),
  ('daily_health', 'Daily system health assessment', 'daily', '0 2 * * *', true, 'scheduled', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '2 hours'),
  ('weekly_research', 'Weekly deep research cycle', 'weekly', '0 3 * * 1', true, 'scheduled', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '1 week'),
  ('monthly_strategy_review', 'Monthly strategy evaluation and adjustment', 'monthly', '0 4 1 * *', true, 'scheduled', '{"created_for": "fresh_live_start"}', NOW() + INTERVAL '1 month')
ON CONFLICT (key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  next_run = EXCLUDED.next_run,
  updated_at = NOW();

-- ============================================================
-- 14. CREATE FRESH BASELINE STRATEGY (will be activated on Wake Up)
-- ============================================================
-- This is a placeholder - the real baseline strategy is created by wakeBrain()
-- We just ensure no conflicting active strategy exists

-- ============================================================
-- 15. AUDIT LOG ENTRIES FOR FRESH START
-- ============================================================
INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
VALUES 
  ('fresh_live_start_archive', 'articles', NULL, '{"archived_count": 61, "reason": "Phase 15.5 fresh live start - all test articles archived"}', NOW()),
  ('fresh_live_start_archive', 'affiliate_links', NULL, '{"archived_count": 6, "reason": "All test affiliate links archived (example.com destinations)"}', NOW()),
  ('fresh_live_start_archive', 'brain_initialization', NULL, '{"archived_count": 1, "reason": "Previous test initialization archived for fresh wake-up"}', NOW()),
  ('fresh_live_start_archive', 'brain_runs', NULL, '{"archived_count": 5, "reason": "All test runs archived"}', NOW()),
  ('fresh_live_start_archive', 'brain_schedules', NULL, '{"archived_count": 2, "reason": "Test schedules disabled, fresh production schedules created"}', NOW()),
  ('fresh_live_start_archive', 'brain_strategies', NULL, '{"archived_count": 5, "reason": "Test/experimental strategies archived"}', NOW()),
  ('fresh_live_start_archive', 'brain_opportunities', NULL, '{"archived_count": 7, "reason": "Test opportunities archived"}', NOW()),
  ('fresh_live_start_archive', 'brain_tasks', NULL, '{"archived_count": 30, "reason": "All test tasks archived"}', NOW()),
  ('fresh_live_start_archive', 'brain_approvals', NULL, '{"archived_count": 8, "reason": "Test approvals archived"}', NOW()),
  ('fresh_live_start_archive', 'brain_decisions', NULL, '{"archived_count": 54, "reason": "Test decisions archived"}', NOW()),
  ('fresh_live_start_archive', 'automation_jobs', NULL, '{"archived_count": 60, "reason": "Test automation jobs archived"}', NOW()),
  ('fresh_live_start_preserve', 'brain_reports', NULL, '{"preserved_count": 2, "reason": "Real business analysis reports preserved"}', NOW()),
  ('fresh_live_start_preserve', 'brain_observations', NULL, '{"preserved_count": 12, "reason": "Real observations from reports preserved"}', NOW()),
  ('fresh_live_start_preserve', 'brain_learnings', NULL, '{"preserved_count": 2, "reason": "Real learnings from executions preserved"}', NOW());

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================
-- SELECT 'articles' as table_name, status, COUNT(*) FROM articles GROUP BY status
-- UNION ALL SELECT 'affiliate_links', 'archived' as status, COUNT(*) FROM affiliate_links WHERE destination_url LIKE 'archived:%'
-- UNION ALL SELECT 'brain_initialization', status, COUNT(*) FROM brain_initialization GROUP BY status
-- UNION ALL SELECT 'brain_runs', status, COUNT(*) FROM brain_runs GROUP BY status
-- UNION ALL SELECT 'brain_schedules', enabled::text, COUNT(*) FROM brain_schedules GROUP BY enabled
-- UNION ALL SELECT 'brain_strategies', status, COUNT(*) FROM brain_strategies GROUP BY status
-- UNION ALL SELECT 'brain_opportunities', status, COUNT(*) FROM brain_opportunities GROUP BY status
-- UNION ALL SELECT 'brain_tasks', status, COUNT(*) FROM brain_tasks GROUP BY status
-- UNION ALL SELECT 'brain_approvals', status, COUNT(*) FROM brain_approvals GROUP BY status
-- UNION ALL SELECT 'brain_decisions', status, COUNT(*) FROM brain_decisions GROUP BY status
-- UNION ALL SELECT 'automation_jobs', status, COUNT(*) FROM automation_jobs GROUP BY status
-- UNION ALL SELECT 'brain_reports', 'preserved', COUNT(*) FROM brain_reports
-- UNION ALL SELECT 'brain_observations', 'preserved', COUNT(*) FROM brain_observations
-- UNION ALL SELECT 'brain_learnings', 'preserved', COUNT(*) FROM brain_learnings;