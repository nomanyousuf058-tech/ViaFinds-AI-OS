-- Migration 019: Single Active Brain Cycle Guard
-- Additive only. No drops, no data changes.
--
-- Invariant: at most ONE Brain cycle may be in flight at any time
-- (status 'queued' or 'running'). This is the database-level backstop for
-- the scheduler's duplicate-cycle prevention: if two triggers race, the
-- loser's INSERT fails with a unique violation and the cycle aborts
-- cleanly instead of running twice.
--
-- 'wake_up' runs are unaffected (one-time initialization, separate type).
-- Completed/failed runs are historical records and are never constrained.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_runs_single_active_cycle
  ON brain_runs (run_type)
  WHERE run_type = 'cycle' AND status IN ('queued', 'running');

COMMIT;
