-- Migration 022: Add brain_initialization.updated_at
-- The repository's updateInitialization() references updated_at, but migration
-- 015 never created it, so every status update silently failed. This makes the
-- column exist so update semantics are truthful.
BEGIN;

ALTER TABLE brain_initialization
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill existing rows so the column is not null-unknown.
UPDATE brain_initialization
   SET updated_at = COALESCE(initialized_at, NOW())
 WHERE updated_at IS NULL;

COMMIT;