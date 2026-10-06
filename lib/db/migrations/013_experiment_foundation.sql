-- Phase 5.6 Gate 1: Experiment Foundation
-- Creates dedicated experiment tables with RLS policies and the enhanced
-- results schema required by the statistical engine (Gate 2).
-- Idempotent: safe to run repeatedly.

-- ============================================================
-- 1. brain_experiments (enhanced with experiment configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis TEXT NOT NULL,
  metric VARCHAR(100) NOT NULL,
  baseline JSONB NOT NULL,
  variant JSONB NOT NULL,
  population VARCHAR(255) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  evidence JSONB NOT NULL,
  provenance VARCHAR(255) NOT NULL,
  result JSONB,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_experiments_status ON brain_experiments(status);
CREATE INDEX IF NOT EXISTS idx_brain_experiments_provenance ON brain_experiments(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_experiments_start_time ON brain_experiments(start_time);
CREATE INDEX IF NOT EXISTS idx_brain_experiments_end_time ON brain_experiments(end_time);

ALTER TABLE brain_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_experiments_admin_all ON brain_experiments;
CREATE POLICY brain_experiments_admin_all
  ON brain_experiments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. brain_experiment_events (exposure and conversion tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_experiment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES brain_experiments(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  variant_id VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_experiment ON brain_experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_type ON brain_experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_variant ON brain_experiment_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_created ON brain_experiment_events(created_at);

ALTER TABLE brain_experiment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_experiment_events_admin_all ON brain_experiment_events;
CREATE POLICY brain_experiment_events_admin_all
  ON brain_experiment_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. brain_experiment_results (enhanced with full statistical columns)
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_experiment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES brain_experiments(id) ON DELETE CASCADE,
  control_variant_id VARCHAR(100),
  treatment_variant_id VARCHAR(100),

  -- Sample sizes
  control_sample_size INTEGER,
  treatment_sample_size INTEGER,
  control_conversions INTEGER,
  treatment_conversions INTEGER,

  -- Conversion rates
  control_conversion_rate DECIMAL(10,6),
  treatment_conversion_rate DECIMAL(10,6),

  -- Absolute difference (treatment - control)
  absolute_difference DECIMAL(10,6),
  -- Relative difference (uplift as fraction: (treatment - control) / control)
  relative_difference DECIMAL(10,6),

  -- Wilson confidence intervals (with continuity correction)
  control_ci_lower DECIMAL(10,6),
  control_ci_upper DECIMAL(10,6),
  treatment_ci_lower DECIMAL(10,6),
  treatment_ci_upper DECIMAL(10,6),

  -- Fisher's Exact Test (two-sided)
  p_value DECIMAL(10,6),
  -- The test statistic from the hypergeometric distribution
  fisher_odds_ratio DECIMAL(10,6),

  -- Significance level used for the decision
  significance_level DECIMAL(5,4) DEFAULT 0.05,

  -- Sample adequacy
  sample_adequacy VARCHAR(50), -- ADEQUATE | INSUFFICIENT | UNKNOWN
  min_required_sample INTEGER,

  -- Final conclusion
  conclusion VARCHAR(50), -- SIGNIFICANT_WIN | SIGNIFICANT_LOSS | NO_SIGNIFICANCE | INSUFFICIENT_SAMPLE | ERROR

  -- Original legacy columns (kept for backward compatibility)
  uplift DECIMAL(10,4),
  significance DECIMAL(5,4),
  conclusive BOOLEAN DEFAULT false,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_experiment_results_experiment ON brain_experiment_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_results_conclusion ON brain_experiment_results(conclusion);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_results_conclusive ON brain_experiment_results(conclusive);

ALTER TABLE brain_experiment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_experiment_results_admin_all ON brain_experiment_results;
CREATE POLICY brain_experiment_results_admin_all
  ON brain_experiment_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. CHECK constraints to enforce result vocabulary
-- ============================================================

ALTER TABLE brain_experiment_results
  ADD CONSTRAINT chk_conclusion
  CHECK (
    conclusion IS NULL OR conclusion IN (
      'SIGNIFICANT_WIN',
      'SIGNIFICANT_LOSS',
      'NO_SIGNIFICANCE',
      'INSUFFICIENT_SAMPLE',
      'ERROR'
    )
  );

ALTER TABLE brain_experiment_results
  ADD CONSTRAINT chk_sample_adequacy
  CHECK (
    sample_adequacy IS NULL OR sample_adequacy IN (
      'ADEQUATE',
      'INSUFFICIENT',
      'UNKNOWN'
    )
  );

ALTER TABLE brain_experiment_results
  ADD CONSTRAINT chk_brain_experiments_status
  CHECK (
    status IN (
      'PROPOSED',
      'RUNNING',
      'COMPLETED',
      'INCONCLUSIVE',
      'CANCELLED',
      'ARCHIVED'
    )
  );
