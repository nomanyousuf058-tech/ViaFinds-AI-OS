-- Add provenance tracking to articles and brain tables

-- 1. Add provenance to articles
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 2. Add provenance to brain_opportunities
ALTER TABLE brain_opportunities 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 3. Add provenance to brain_strategies
ALTER TABLE brain_strategies 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 4. Add provenance to brain_execution_plans
ALTER TABLE brain_execution_plans 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 5. Add provenance to brain_tasks
ALTER TABLE brain_tasks 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 6. Add provenance to brain_approvals
ALTER TABLE brain_approvals 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 7. Add provenance to brain_product_discoveries
ALTER TABLE brain_product_discoveries 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 8. Add provenance to brain_observations
ALTER TABLE brain_observations 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 9. Add provenance to brain_learnings
ALTER TABLE brain_learnings 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 10. Add provenance to brain_implementation_requests
ALTER TABLE brain_implementation_requests 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 11. Add provenance to brain_content_strategies
ALTER TABLE brain_content_strategies 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 12. Add provenance to brain_cost_decisions
ALTER TABLE brain_cost_decisions 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 13. Add provenance to brain_verifications
ALTER TABLE brain_verifications 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- 14. Add provenance to brain_quality_results
ALTER TABLE brain_quality_results 
ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) DEFAULT 'UNKNOWN';

-- Create indexes for provenance filtering
CREATE INDEX IF NOT EXISTS idx_articles_provenance ON articles(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_opportunities_provenance ON brain_opportunities(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_provenance ON brain_strategies(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_execution_plans_provenance ON brain_execution_plans(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_provenance ON brain_tasks(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_approvals_provenance ON brain_approvals(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_product_discoveries_provenance ON brain_product_discoveries(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_observations_provenance ON brain_observations(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_learnings_provenance ON brain_learnings(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_implementation_requests_provenance ON brain_implementation_requests(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_content_strategies_provenance ON brain_content_strategies(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_cost_decisions_provenance ON brain_cost_decisions(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_verifications_provenance ON brain_verifications(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_quality_results_provenance ON brain_quality_results(provenance);

-- Update the new production articles as REAL provenance
UPDATE articles 
SET provenance = 'REAL' 
WHERE brain_task_id IS NOT NULL 
  AND automation_job_id IS NOT NULL 
  AND strategy_id IS NOT NULL 
  AND opportunity_id IS NOT NULL;

-- Update the Digistore24 test article as TEST provenance
UPDATE articles 
SET provenance = 'TEST' 
WHERE brain_task_id IS NOT NULL 
  AND automation_job_id IS NOT NULL 
  AND (strategy_id IS NULL OR opportunity_id IS NULL);

-- Update legacy articles (no traceability) as UNKNOWN
UPDATE articles 
SET provenance = 'UNKNOWN' 
WHERE brain_task_id IS NULL 
  AND automation_job_id IS NULL;

-- Update brain tables for the production run
UPDATE brain_opportunities SET provenance = 'REAL' WHERE id = '47c8b260-b546-4128-8e56-6609498d346f';
UPDATE brain_strategies SET provenance = 'REAL' WHERE id = 'a7973938-40fa-4bd2-8821-22ee23e12b5a';
UPDATE brain_execution_plans SET provenance = 'REAL' WHERE id = 'a153e91c-056d-450c-ad4e-cf479dd24f87';
UPDATE brain_tasks SET provenance = 'REAL' WHERE id = '13114564-821a-4520-a385-e3d24cac768f';
UPDATE brain_approvals SET provenance = 'REAL' WHERE execution_plan_id = 'a153e91c-056d-450c-ad4e-cf479dd24f87';
UPDATE brain_quality_results SET provenance = 'REAL' WHERE execution_plan_id = 'a153e91c-056d-450c-ad4e-cf479dd24f87';
UPDATE brain_verifications SET provenance = 'REAL' WHERE target_id = '50a0a693-e622-43a8-a641-a0d68c6a2907';
UPDATE brain_learnings SET provenance = 'REAL' WHERE id = '8eca2f01-c1e4-47fc-8fd9-2e26be75a19c';

-- Update test/fixture data (only if columns exist)
UPDATE brain_opportunities SET provenance = 'TEST' WHERE provenance = 'UNKNOWN' AND source ILIKE '%test%';
UPDATE brain_strategies SET provenance = 'TEST' WHERE provenance = 'UNKNOWN' AND title ILIKE '%test%';
UPDATE brain_tasks SET provenance = 'TEST' WHERE provenance = 'UNKNOWN' AND title ILIKE '%test%';
UPDATE brain_approvals SET provenance = 'TEST' WHERE provenance = 'UNKNOWN' AND reason ILIKE '%test%';

-- Update fixture data (from test fixtures)
UPDATE brain_opportunities SET provenance = 'FIXTURE' WHERE provenance = 'UNKNOWN' AND source = 'fixture';
UPDATE brain_strategies SET provenance = 'FIXTURE' WHERE provenance = 'UNKNOWN' AND title ILIKE '%fixture%';
UPDATE brain_tasks SET provenance = 'FIXTURE' WHERE provenance = 'UNKNOWN' AND title ILIKE '%fixture%';