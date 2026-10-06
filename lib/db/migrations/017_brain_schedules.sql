-- Migration 017: Brain Schedules + Strategy Versioning Support
-- Additive only. No drops, no rewrites.

BEGIN;

-- Brain Schedules: recurring Brain activities
CREATE TABLE IF NOT EXISTS brain_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'on_demand')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'scheduled', 'running', 'completed', 'failed', 'disabled')),
  approval_required BOOLEAN NOT NULL DEFAULT false,
  handler TEXT NOT NULL,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_schedules_key ON brain_schedules(key);
CREATE INDEX IF NOT EXISTS idx_brain_schedules_next_run ON brain_schedules(next_run);
CREATE INDEX IF NOT EXISTS idx_brain_schedules_enabled ON brain_schedules(enabled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_schedules_idempotency
  ON brain_schedules(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Seed default schedules
INSERT INTO brain_schedules (key, purpose, frequency, enabled, next_run, status, handler)
VALUES
  ('daily_health', 'Daily Brain health and business assessment', 'daily', true, NOW(), 'idle', 'brain_cycle:health'),
  ('daily_opportunity_scan', 'Daily opportunity and trend scan', 'daily', true, NOW() + interval '2 hours', 'idle', 'brain_cycle:opportunities'),
  ('daily_revenue_scan', 'Daily revenue signal scan', 'daily', true, NOW() + interval '4 hours', 'idle', 'brain_cycle:revenue'),
  ('weekly_product_research', 'Weekly product and trend research', 'weekly', true, NOW() + interval '3 days', 'idle', 'brain_cycle:research'),
  ('weekly_partner_verification', 'Weekly partner compatibility re-verification', 'weekly', true, NOW() + interval '5 days', 'idle', 'brain_cycle:partners'),
  ('monthly_strategy_review', 'Monthly strategy review and evolution', 'monthly', true, NOW() + interval '28 days', 'idle', 'brain_cycle:strategy_review')
ON CONFLICT (key) DO NOTHING;

COMMIT;
