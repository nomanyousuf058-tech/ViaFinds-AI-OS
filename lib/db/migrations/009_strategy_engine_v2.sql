-- Phase 5.3: Strategy Engine V2 schema extension
-- Extends brain_strategies with evidence sufficiency, versioning, and
-- strategy-typing columns. Backward compatible — all columns nullable.

ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS strategy_type VARCHAR(100);
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS evidence_strength VARCHAR(50);
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS evidence_refs JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS assumptions JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS unknowns JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS unavailable_data JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS expected_observations JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS success_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS failure_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS opportunity_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS decision_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS research_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS learning_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS parent_strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL;
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS outcome_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS freshness JSONB DEFAULT '{}';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS conflict_flags JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_brain_strategies_type ON brain_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_evidence_strength ON brain_strategies(evidence_strength);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_outcome_status ON brain_strategies(outcome_status);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_parent ON brain_strategies(parent_strategy_id);