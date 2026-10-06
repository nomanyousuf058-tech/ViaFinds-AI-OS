-- brain_decisions RLS + Indexes migration
-- Enables RLS on brain_decisions matching the existing convention used by
-- brain_approvals, brain_learnings, and brain_reports (RLS=true, no row-level
-- policies). Server-side code uses the service-role pool which bypasses RLS.
-- Also adds indexes justified by real Decision Center query patterns.

ALTER TABLE brain_decisions ENABLE ROW LEVEL SECURITY;

-- Index on status (frequent filter in list + transition queries)
CREATE INDEX IF NOT EXISTS idx_brain_decisions_status ON brain_decisions (status);

-- Index on provenance (frequent filter for provenance-aware queries)
CREATE INDEX IF NOT EXISTS idx_brain_decisions_provenance ON brain_decisions (provenance);

-- Index on created_at (ordering + time-window queries)
CREATE INDEX IF NOT EXISTS idx_brain_decisions_created_at ON brain_decisions (created_at DESC);

-- Composite index for status + created_at (most common list query pattern)
CREATE INDEX IF NOT EXISTS idx_brain_decisions_status_created ON brain_decisions (status, created_at DESC);