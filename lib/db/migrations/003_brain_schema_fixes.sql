-- ============================================================
-- Phase 4.2: Fix brain table column lengths
-- ============================================================

-- brain_opportunities.source: change from varchar(255) to TEXT to store full JSON with URLs
ALTER TABLE brain_opportunities ALTER COLUMN source TYPE TEXT USING source::text;

-- brain_execution_plans.automation_job_id: change from varchar(255) to TEXT for file-based job IDs
ALTER TABLE brain_execution_plans ALTER COLUMN automation_job_id TYPE TEXT USING automation_job_id::text;

-- brain_execution_plans.correlation_id: change from varchar(255) to TEXT for longer correlation IDs
ALTER TABLE brain_execution_plans ALTER COLUMN correlation_id TYPE TEXT USING correlation_id::text;

-- brain_learnings.correlation_id: change from varchar(255) to TEXT
ALTER TABLE brain_learnings ALTER COLUMN correlation_id TYPE TEXT USING correlation_id::text;

-- brain_approvals.decided_by: change from varchar(255) to TEXT
ALTER TABLE brain_approvals ALTER COLUMN decided_by TYPE TEXT USING decided_by::text;

-- brain_approvals.requested_by: change from varchar(50) to TEXT
ALTER TABLE brain_approvals ALTER COLUMN requested_by TYPE TEXT USING requested_by::text;

-- ============================================================
-- END Phase 4.2 Schema Fixes
-- ============================================================