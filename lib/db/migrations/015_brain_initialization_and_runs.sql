-- Migration: Add Brain initialization and run tracking

BEGIN;

-- 0. brain_runs.correlation_id is a foreign key into brain_reports(correlation_id).
--    The base brain_reports schema (lib/db/migrations.ts) does not declare this
--    column, so add it additively and give it a unique index (required as an
--    FK target). NULLs are allowed and distinct, so existing rows are unaffected.
ALTER TABLE brain_reports ADD COLUMN IF NOT EXISTS correlation_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_reports_correlation_id ON brain_reports(correlation_id);

-- 1. Add brain_initialization table (singleton)
CREATE TABLE IF NOT EXISTS brain_initialization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    initialization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'initializing', 'initialized', 'failed')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    error TEXT
);

-- brain_runs.initialization_id is a foreign key into
-- brain_initialization(initialization_id), which requires a unique constraint.
-- The table is a singleton, so this is always safe.
DO $$
BEGIN
  ALTER TABLE brain_initialization
    ADD CONSTRAINT uq_brain_initialization_initialization_id UNIQUE (initialization_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Ensure only one initialization record exists
CREATE OR REPLACE FUNCTION enforce_single_initialization()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM brain_initialization)
    THEN
        RAISE EXCEPTION 'Brain initialization already in progress or completed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_duplicate_initialization ON brain_initialization;
CREATE TRIGGER prevent_duplicate_initialization
BEFORE INSERT ON brain_initialization
FOR EACH ROW
EXECUTE FUNCTION enforce_single_initialization();

-- 2. Add brain_runs table
CREATE TABLE IF NOT EXISTS brain_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    run_type TEXT NOT NULL CHECK (run_type IN ('wake_up', 'cycle')),
    trigger TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    observations JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    correlation_id TEXT REFERENCES brain_reports(correlation_id) ON DELETE SET NULL,
    initialization_id UUID REFERENCES brain_initialization(initialization_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_runs_run_type ON brain_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_brain_runs_status ON brain_runs(status);
CREATE INDEX IF NOT EXISTS idx_brain_runs_correlation ON brain_runs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_brain_runs_initialization ON brain_runs(initialization_id);

COMMIT;