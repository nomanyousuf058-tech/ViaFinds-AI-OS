-- Phase 5.5: Strategy Evolution schema
-- Stores evolution proposals for existing strategies. Proposals are NOT
-- automatically applied — they require Decision Center approval.

CREATE TABLE IF NOT EXISTS brain_strategy_evolution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES brain_strategies(id) ON DELETE CASCADE,
  source_strategy_version INTEGER NOT NULL DEFAULT 1,
  proposed_version INTEGER NOT NULL,
  evolution_type VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  evidence_refs JSONB DEFAULT '[]',
  opportunity_ids JSONB DEFAULT '[]',
  learning_ids JSONB DEFAULT '[]',
  decision_ids JSONB DEFAULT '[]',
  execution_ids JSONB DEFAULT '[]',
  evidence_strength VARCHAR(50),
  confidence NUMERIC(5,2),
  assumptions JSONB DEFAULT '[]',
  unknowns JSONB DEFAULT '[]',
  unavailable_data JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  proposed_changes JSONB DEFAULT '{}',
  expected_observations JSONB DEFAULT '[]',
  success_conditions JSONB DEFAULT '[]',
  failure_conditions JSONB DEFAULT '[]',
  provenance VARCHAR(50) DEFAULT 'UNKNOWN',
  status VARCHAR(50) DEFAULT 'PROPOSED',
  approval_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_strategy ON brain_strategy_evolution(strategy_id);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_status ON brain_strategy_evolution(status);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_type ON brain_strategy_evolution(evolution_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_trigger ON brain_strategy_evolution(trigger_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_provenance ON brain_strategy_evolution(provenance);

ALTER TABLE brain_strategy_evolution ENABLE ROW LEVEL SECURITY;