-- ============================================================
-- Phase 4.1: Article Traceability Fields
-- Add minimum required fields to link articles to Brain execution
-- ============================================================

-- Add traceability columns to articles
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS brain_task_id UUID REFERENCES brain_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automation_job_id UUID REFERENCES automation_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT;

-- Indexes for traceability queries
CREATE INDEX IF NOT EXISTS idx_articles_brain_task ON articles(brain_task_id);
CREATE INDEX IF NOT EXISTS idx_articles_automation_job ON articles(automation_job_id);
CREATE INDEX IF NOT EXISTS idx_articles_strategy ON articles(strategy_id);
CREATE INDEX IF NOT EXISTS idx_articles_opportunity ON articles(opportunity_id);

-- ============================================================
-- END Phase 4.1 Article Traceability
-- ============================================================