-- Migration 018: Strategy Formal Activation
-- Additive only. No drops. Preserves all historical strategies.
--
-- Lifecycle: draft -> proposed -> approved -> active -> superseded
--            (+ rejected, archived, and legacy execution states)
--
-- Invariant: at most ONE strategy may be 'active' at any time.

BEGIN;

-- 0. Data safety: legacy engine versions wrote uppercase statuses
--    (e.g. 'ACTIVE'). Normalize to the canonical lowercase lifecycle
--    values so the CHECK constraint below can be applied.
--    No data is lost; only the case of the status token changes.
UPDATE brain_strategies
SET status = LOWER(status)
WHERE status <> LOWER(status);

-- 1. Activation timestamp
ALTER TABLE brain_strategies
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 2. Status lifecycle constraint.
--    Includes legacy execution states (execution_planned, executing,
--    completed, failed) so existing rows remain valid.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_brain_strategies_status'
      AND conrelid = 'brain_strategies'::regclass
  ) THEN
    ALTER TABLE brain_strategies
      ADD CONSTRAINT chk_brain_strategies_status
      CHECK (status IN (
        'draft', 'proposed', 'approved', 'active', 'superseded',
        'archived', 'rejected',
        'execution_planned', 'executing', 'completed', 'failed'
      ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_brain_strategies_activated_at ON brain_strategies(activated_at DESC);

-- 3. Data safety: if multiple 'active' rows already exist (should not happen,
--    but be defensive), demote all but the most recently activated/updated
--    one to 'superseded'. History is preserved, nothing is deleted.
UPDATE brain_strategies s
SET status = 'superseded', updated_at = NOW()
WHERE s.status = 'active'
  AND s.id <> (
    SELECT id FROM brain_strategies
    WHERE status = 'active'
    ORDER BY COALESCE(activated_at, updated_at, created_at) DESC
    LIMIT 1
  );

-- 4. Singleton invariant: at most one 'active' strategy.
--    Unique index on the constant expression TRUE, restricted to active rows.
--    Any second activation fails with a unique violation and is rolled back.
CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_strategies_single_active
  ON brain_strategies ((TRUE))
  WHERE status = 'active';

COMMIT;
