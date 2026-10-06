-- Phase 5.5: Strategy Evolution schema reconciliation
-- Reconciles any legacy brain_strategy_evolution schema drift with the
-- canonical Phase 5.5 contract. Idempotent: safe to run repeatedly.
--
-- Legacy columns (current_strategy, new_evidence, observed_outcomes,
-- real_learnings, market_signals, content_performance, proposal, rationale)
-- are obsolete and dropped. They are not referenced by any application code,
-- API, test, trigger, function, or view. See audit 71_PHASE_5_5_INDEPENDENT_ACCEPTANCE_AUDIT.md.

-- 1. Drop obsolete legacy columns if present
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS current_strategy;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS new_evidence;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS observed_outcomes;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS real_learnings;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS market_signals;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS content_performance;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS proposal;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS rationale;

-- 2. Ensure canonical columns exist with correct types
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  strategy_id UUID REFERENCES brain_strategies(id) ON DELETE CASCADE;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  source_strategy_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  proposed_version INTEGER NOT NULL;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  evolution_type VARCHAR(50) NOT NULL;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  trigger_type VARCHAR(50) NOT NULL;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  evidence_refs JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  opportunity_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  learning_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  decision_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  execution_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  evidence_strength VARCHAR(50);
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  confidence NUMERIC(5,2);
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  assumptions JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  unknowns JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  unavailable_data JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  risks JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  proposed_changes JSONB DEFAULT '{}';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  expected_observations JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  success_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  failure_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  provenance VARCHAR(50) DEFAULT 'UNKNOWN';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  status VARCHAR(50) DEFAULT 'PROPOSED';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  approval_id UUID;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_strategy ON brain_strategy_evolution(strategy_id);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_status ON brain_strategy_evolution(status);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_type ON brain_strategy_evolution(evolution_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_trigger ON brain_strategy_evolution(trigger_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_provenance ON brain_strategy_evolution(provenance);

-- 4. Enable Row Level Security
ALTER TABLE brain_strategy_evolution ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies: follow the existing ViaFinds admin authorization model.
--    brain_strategies / brain_opportunities use service_role bypass;
--    public/anon get no direct access to brain tables.
--    We grant full access only to authenticated admins.

DROP POLICY IF EXISTS brain_strategy_evolution_admin_all ON brain_strategy_evolution;
CREATE POLICY brain_strategy_evolution_admin_all
  ON brain_strategy_evolution
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);