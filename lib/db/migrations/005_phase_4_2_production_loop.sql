-- ============================================================
-- Phase 4.2: Production Loop — real research, sources, and
-- full traceability columns for opportunity → strategy → plan →
-- approval → task → job → article → quality → verification →
-- learning.
--
-- This migration is ADDITIVE ONLY. It never rewrites history.
-- ============================================================

-- ============================================================
-- 1. REAL RESEARCH RUNS + SOURCE RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_research_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correlation_id TEXT NOT NULL,
  query TEXT NOT NULL,
  provider TEXT NOT NULL,
  providers_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_confidence TEXT,
  fallback_triggered BOOLEAN NOT NULL DEFAULT false,
  fallback_reason TEXT,
  missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicates_removed INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  total_latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provenance VARCHAR(20) NOT NULL DEFAULT 'REAL'
);

CREATE INDEX IF NOT EXISTS idx_brain_research_runs_correlation ON brain_research_runs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_brain_research_runs_created ON brain_research_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS brain_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id TEXT NOT NULL,
  research_id UUID REFERENCES brain_research_runs(id) ON DELETE CASCADE,
  correlation_id TEXT NOT NULL,
  query TEXT NOT NULL,
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT,
  snippet TEXT,
  content TEXT,
  source_type TEXT,
  result_type TEXT,
  relevance_score NUMERIC(6,5),
  authority_signal NUMERIC(6,5),
  rank INTEGER,
  retrieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provenance VARCHAR(20) NOT NULL DEFAULT 'REAL',
  CONSTRAINT brain_sources_research_source_uniq UNIQUE (research_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_brain_sources_source_id ON brain_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_brain_sources_correlation ON brain_sources(correlation_id);
CREATE INDEX IF NOT EXISTS idx_brain_sources_research ON brain_sources(research_id);
CREATE INDEX IF NOT EXISTS idx_brain_sources_url ON brain_sources(url);

-- ============================================================
-- 2. OPPORTUNITY — correlation + source traceability
-- ============================================================

ALTER TABLE brain_opportunities
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS research_id UUID REFERENCES brain_research_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_classification JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_brain_opportunities_correlation ON brain_opportunities(correlation_id);

-- ============================================================
-- 3. STRATEGY — correlation + content approach + exec requirements
-- ============================================================

ALTER TABLE brain_strategies
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS content_approach TEXT,
  ADD COLUMN IF NOT EXISTS execution_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_brain_strategies_correlation ON brain_strategies(correlation_id);

-- ============================================================
-- 4. EXECUTION PLAN — approval + target automation + idempotency
-- ============================================================

ALTER TABLE brain_execution_plans
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS target_automation TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS brain_task_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_execution_plans_idempotency
  ON brain_execution_plans(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brain_execution_plans_task ON brain_execution_plans(brain_task_id);

-- ============================================================
-- 5. BRAIN TASK — plan/approval linkage, claim lease, idempotency
-- ============================================================

ALTER TABLE brain_tasks
  ADD COLUMN IF NOT EXISTS execution_plan_id UUID REFERENCES brain_execution_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_id UUID,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claimed_by TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_tasks_idempotency
  ON brain_tasks(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brain_tasks_correlation ON brain_tasks(correlation_id);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_approval ON brain_tasks(approval_id);

-- ============================================================
-- 6. APPROVALS — explicit status, consumption, correlation
-- ============================================================

ALTER TABLE brain_approvals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS required_permission TEXT,
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consumed_by_task UUID,
  ADD COLUMN IF NOT EXISTS target_automation TEXT,
  ADD COLUMN IF NOT EXISTS decided_by_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_brain_approvals_status ON brain_approvals(status);
CREATE INDEX IF NOT EXISTS idx_brain_approvals_task ON brain_approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_brain_approvals_strategy ON brain_approvals(strategy_id);
CREATE INDEX IF NOT EXISTS idx_brain_approvals_plan ON brain_approvals(execution_plan_id);
CREATE INDEX IF NOT EXISTS idx_brain_approvals_correlation ON brain_approvals(correlation_id);

-- ============================================================
-- 7. QUALITY RESULTS — score, warnings, failures, full lineage
-- ============================================================

ALTER TABLE brain_quality_results
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS brain_task_id UUID,
  ADD COLUMN IF NOT EXISTS automation_job_id TEXT,
  ADD COLUMN IF NOT EXISTS strategy_id UUID,
  ADD COLUMN IF NOT EXISTS opportunity_id UUID,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publication_blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_brain_quality_results_article ON brain_quality_results(article_id);
CREATE INDEX IF NOT EXISTS idx_brain_quality_results_task ON brain_quality_results(brain_task_id);
CREATE INDEX IF NOT EXISTS idx_brain_quality_results_correlation ON brain_quality_results(correlation_id);

-- ============================================================
-- 8. VERIFICATIONS — expected vs observed, limitations
-- ============================================================

ALTER TABLE brain_verifications
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS expected_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_brain_verifications_article ON brain_verifications(article_id);
CREATE INDEX IF NOT EXISTS idx_brain_verifications_correlation ON brain_verifications(correlation_id);

-- ============================================================
-- 9. LEARNINGS — source_event, confidence, reusability
-- ============================================================

ALTER TABLE brain_learnings
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS reusability TEXT,
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS opportunity_id UUID;

CREATE INDEX IF NOT EXISTS idx_brain_learnings_correlation_idx ON brain_learnings(correlation_id);

-- ============================================================
-- 10. QUALITY GATE must block publication (server-side invariant)
--
-- Any article that declares a brain_task_id may only become (or be
-- created as) 'published' when a brain_quality_results row already
-- exists for that task and its latest status is not FAIL.
-- Articles with no brain lineage are unaffected.
-- ============================================================

CREATE OR REPLACE FUNCTION block_publication_without_passing_quality_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  -- Already-published rows that are merely being updated are not a new publication.
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  -- A row with no brain lineage is outside the brain publication gate.
  IF NEW.brain_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM brain_quality_results WHERE brain_task_id = NEW.brain_task_id) THEN
    RAISE EXCEPTION
      'Publication blocked: no brain_quality_results row exists for brain_task %', NEW.brain_task_id;
  END IF;

  PERFORM 1 FROM brain_quality_results
   WHERE brain_task_id = NEW.brain_task_id
     AND overall_status = 'FAIL'
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Publication blocked: latest brain_quality_results row for brain_task % is FAIL', NEW.brain_task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10b. REPLACE ANY PRE-EXISTING PUBLICATION GATE TRIGGER
-- An earlier revision of this migration installed a single
-- UPDATE-only trigger under a different name. Drop it so the
-- INSERT path cannot bypass the gate.
-- ============================================================

DROP TRIGGER IF EXISTS block_publication_quality_gate_trigger ON articles;

DROP TRIGGER IF EXISTS block_publication_quality_gate_insert_trigger ON articles;
CREATE TRIGGER block_publication_quality_gate_insert_trigger
  BEFORE INSERT ON articles
  FOR EACH ROW
  EXECUTE FUNCTION block_publication_without_passing_quality_gate();

DROP TRIGGER IF EXISTS block_publication_quality_gate_update_trigger ON articles;
CREATE TRIGGER block_publication_quality_gate_update_trigger
  BEFORE UPDATE OF status ON articles
  FOR EACH ROW
  EXECUTE FUNCTION block_publication_without_passing_quality_gate();

-- ============================================================
-- 11. IMMUTABLE TRACEABILITY (no silent relationship rewrites)
-- ============================================================

CREATE OR REPLACE FUNCTION protect_article_traceability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.brain_task_id IS NOT NULL AND NEW.brain_task_id IS DISTINCT FROM OLD.brain_task_id THEN
    RAISE EXCEPTION 'articles.brain_task_id is immutable once set (article %) — a relationship cannot be re-derived', OLD.id;
  END IF;
  IF OLD.automation_job_id IS NOT NULL AND NEW.automation_job_id IS DISTINCT FROM OLD.automation_job_id THEN
    RAISE EXCEPTION 'articles.automation_job_id is immutable once set (article %)', OLD.id;
  END IF;
  IF OLD.strategy_id IS NOT NULL AND NEW.strategy_id IS DISTINCT FROM OLD.strategy_id THEN
    RAISE EXCEPTION 'articles.strategy_id is immutable once set (article %)', OLD.id;
  END IF;
  IF OLD.opportunity_id IS NOT NULL AND NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id THEN
    RAISE EXCEPTION 'articles.opportunity_id is immutable once set (article %)', OLD.id;
  END IF;
  -- The publication timestamp is the evidence that the article really went
  -- live; nulling it on a published row would erase that evidence.
  IF OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'articles.published_at is immutable once set (article %)', OLD.id;
  END IF;
  -- Real production provenance must not be downgraded after the fact.
  IF OLD.provenance = 'REAL' AND NEW.provenance IS DISTINCT FROM OLD.provenance THEN
    RAISE EXCEPTION 'articles.provenance "REAL" is immutable (article %) — production evidence cannot be relabelled', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_article_traceability_trigger ON articles;
CREATE OR REPLACE TRIGGER protect_article_traceability_trigger
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION protect_article_traceability();

-- An approval is a decision record: once a decision exists, the decision, the
-- decision metadata and the single-consumption markers are all frozen. Without
-- this, a settled approval could be flipped back to pending or re-pointed at a
-- different task after the fact.
CREATE OR REPLACE FUNCTION protect_approval_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.decision IS NOT NULL AND NEW.decision IS DISTINCT FROM OLD.decision THEN
    RAISE EXCEPTION 'brain_approvals.decision is immutable once recorded (approval %) — an approval cannot be re-decided', OLD.id;
  END IF;
  IF OLD.decided_at IS NOT NULL AND NEW.decided_at IS DISTINCT FROM OLD.decided_at THEN
    RAISE EXCEPTION 'brain_approvals.decided_at is immutable once recorded (approval %)', OLD.id;
  END IF;
  IF OLD.decided_by IS NOT NULL AND NEW.decided_by IS DISTINCT FROM OLD.decided_by THEN
    RAISE EXCEPTION 'brain_approvals.decided_by is immutable once recorded (approval %)', OLD.id;
  END IF;
  IF OLD.consumed_at IS NOT NULL
     AND (NEW.consumed_at IS DISTINCT FROM OLD.consumed_at OR NEW.consumed_by_task IS DISTINCT FROM OLD.consumed_by_task) THEN
    RAISE EXCEPTION 'brain_approvals consumption is immutable once claimed (approval %)', OLD.id;
  END IF;
  IF OLD.status IN ('approved', 'rejected', 'expired', 'consumed')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'brain_approvals.status "%" is terminal and cannot become "%" (approval %)', OLD.status, NEW.status, OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_approval_decision_trigger ON brain_approvals;
CREATE OR REPLACE TRIGGER protect_approval_decision_trigger
  BEFORE UPDATE ON brain_approvals
  FOR EACH ROW
  EXECUTE FUNCTION protect_approval_decision();

-- A task's binding to the plan that authorised it, and to the approval that
-- authorised the plan, must not be re-pointed after the fact.
CREATE OR REPLACE FUNCTION protect_task_lineage()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.execution_plan_id IS NOT NULL AND NEW.execution_plan_id IS DISTINCT FROM OLD.execution_plan_id THEN
    RAISE EXCEPTION 'brain_tasks.execution_plan_id is immutable once set (task %) — a task cannot be re-planned in place', OLD.id;
  END IF;
  IF OLD.approval_id IS NOT NULL AND NEW.approval_id IS DISTINCT FROM OLD.approval_id THEN
    RAISE EXCEPTION 'brain_tasks.approval_id is immutable once set (task %) — the authorising approval cannot be swapped', OLD.id;
  END IF;
  IF OLD.strategy_id IS NOT NULL AND NEW.strategy_id IS DISTINCT FROM OLD.strategy_id THEN
    RAISE EXCEPTION 'brain_tasks.strategy_id is immutable once set (task %)', OLD.id;
  END IF;
  IF OLD.opportunity_id IS NOT NULL AND NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id THEN
    RAISE EXCEPTION 'brain_tasks.opportunity_id is immutable once set (task %)', OLD.id;
  END IF;
  IF OLD.idempotency_key IS NOT NULL AND NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'brain_tasks.idempotency_key is immutable once set (task %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_task_lineage_trigger ON brain_tasks;
CREATE OR REPLACE TRIGGER protect_task_lineage_trigger
  BEFORE UPDATE ON brain_tasks
  FOR EACH ROW
  EXECUTE FUNCTION protect_task_lineage();

-- ============================================================
-- END Phase 4.2 Production Loop
-- ============================================================
