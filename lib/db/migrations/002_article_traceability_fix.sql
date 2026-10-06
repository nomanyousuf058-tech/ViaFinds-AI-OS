-- ============================================================
-- Phase 4.1: Article Traceability Fields - FIX
-- Change automation_job_id to TEXT to support file-based job IDs
-- ============================================================

-- Drop the foreign key constraint if it exists
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_automation_job_id_fkey;

-- Change column type to TEXT
ALTER TABLE articles 
  ALTER COLUMN automation_job_id TYPE TEXT USING automation_job_id::text;

-- Recreate index
DROP INDEX IF EXISTS idx_articles_automation_job;
CREATE INDEX IF NOT EXISTS idx_articles_automation_job ON articles(automation_job_id);

-- ============================================================
-- END Phase 4.1 Article Traceability Fix
-- ============================================================