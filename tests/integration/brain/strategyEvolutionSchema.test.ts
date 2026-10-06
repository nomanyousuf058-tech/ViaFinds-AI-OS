import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getPool } from '../../../lib/db/client'

/**
 * Schema integrity test: verifies brain_strategy_evolution matches the
 * canonical Phase 5.5 contract.
 *
 * The expected result represents the INTENDED canonical schema — NOT the
 * current production column count. Legacy columns must be absent.
 */
describe('brain_strategy_evolution schema integrity', () => {
  let pool: any

  beforeAll(async () => {
    pool = getPool()
  })

  afterAll(async () => {
    await pool.end()
  })

  const CANONICAL_COLUMNS = [
    'id', 'strategy_id', 'source_strategy_version', 'proposed_version',
    'evolution_type', 'trigger_type', 'evidence_refs', 'opportunity_ids',
    'learning_ids', 'decision_ids', 'execution_ids', 'evidence_strength',
    'confidence', 'assumptions', 'unknowns', 'unavailable_data', 'risks',
    'proposed_changes', 'expected_observations', 'success_conditions',
    'failure_conditions', 'provenance', 'status', 'approval_id',
    'created_at', 'updated_at',
  ]

  const LEGACY_COLUMNS = [
    'current_strategy', 'new_evidence', 'observed_outcomes',
    'real_learnings', 'market_signals', 'content_performance',
    'proposal', 'rationale',
  ]

  it('has exactly the canonical columns and no legacy columns', async () => {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'brain_strategy_evolution' ORDER BY ordinal_position"
    )
    const actual = result.rows.map((r: any) => r.column_name)

    // Every canonical column must exist
    for (const col of CANONICAL_COLUMNS) {
      expect(actual).toContain(col)
    }

    // No legacy columns may remain
    for (const col of LEGACY_COLUMNS) {
      expect(actual).not.toContain(col)
    }
  })

  it('has exactly 26 columns (canonical Phase 5.5 contract)', async () => {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'brain_strategy_evolution' ORDER BY ordinal_position"
    )
    expect(result.rows.length).toBe(26)
  })

  it('RLS is enabled', async () => {
    const result = await pool.query(
      "SELECT rowsecurity FROM pg_tables WHERE tablename = 'brain_strategy_evolution'"
    )
    expect(result.rows[0].rowsecurity).toBe(true)
  })

  it('has the expected indexes', async () => {
    const result = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'brain_strategy_evolution' ORDER BY indexname"
    )
    const names = result.rows.map((r: any) => r.indexname)
    expect(names).toContain('brain_strategy_evolution_pkey')
    expect(names).toContain('idx_brain_strategy_evol_strategy')
    expect(names).toContain('idx_brain_strategy_evol_status')
    expect(names).toContain('idx_brain_strategy_evol_type')
    expect(names).toContain('idx_brain_strategy_evol_trigger')
    expect(names).toContain('idx_brain_strategy_evol_provenance')
  })

  it('has the admin RLS policy', async () => {
    const result = await pool.query(
      "SELECT polname FROM pg_policy WHERE polrelid = 'brain_strategy_evolution'::regclass"
    )
    const names = result.rows.map((r: any) => r.polname)
    expect(names).toContain('brain_strategy_evolution_admin_all')
  })

  it('brain_strategies uses strategy_type (not type)', async () => {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'brain_strategies' AND column_name IN ('type', 'strategy_type')"
    )
    const names = result.rows.map((r: any) => r.column_name)
    expect(names).toContain('strategy_type')
    expect(names).not.toContain('type')
  })
})