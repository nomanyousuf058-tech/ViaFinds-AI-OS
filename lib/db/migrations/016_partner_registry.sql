-- Migration 016: Partner Registry + Pakistan Compatibility
-- Additive only. No drops, no rewrites.

BEGIN;

CREATE TABLE IF NOT EXISTS partner_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  network TEXT,
  product_fit TEXT,
  niche_fit TEXT,
  quality_score NUMERIC(5,2),
  commission_rate NUMERIC(5,2),
  commission_type TEXT,
  conversion_potential TEXT,
  reputation TEXT,

  -- Pakistan-first compatibility (HARD CONSTRAINT fields)
  country_eligibility JSONB NOT NULL DEFAULT '[]'::jsonb,
  pakistan_eligibility BOOLEAN NOT NULL DEFAULT false,
  pakistan_eligibility_notes TEXT,
  customer_traffic_eligibility BOOLEAN NOT NULL DEFAULT false,
  customer_traffic_notes TEXT,
  payout_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  payout_currency TEXT,
  minimum_payout NUMERIC(10,2),
  minimum_payout_currency TEXT,
  fees TEXT,
  payoneer_supported BOOLEAN,
  payoneer_notes TEXT,
  paypal_supported BOOLEAN,
  paypal_notes TEXT,
  bank_transfer_supported BOOLEAN,
  bank_transfer_notes TEXT,

  -- Application
  application_required BOOLEAN NOT NULL DEFAULT true,
  application_difficulty TEXT,
  application_url TEXT,
  payout_docs_url TEXT,

  -- Verification
  last_verified TIMESTAMPTZ,
  verification_notes TEXT,
  confidence NUMERIC(4,3),

  -- Tracking
  tracking_capability TEXT,
  reliability TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified', 'verified', 'expired', 'not_available_pakistan', 'pending_application')),
  provenance VARCHAR(20) NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_registry_name ON partner_registry(name);
CREATE INDEX IF NOT EXISTS idx_partner_registry_pakistan ON partner_registry(pakistan_eligibility);
CREATE INDEX IF NOT EXISTS idx_partner_registry_status ON partner_registry(status);
CREATE INDEX IF NOT EXISTS idx_partner_registry_network ON partner_registry(network);
CREATE INDEX IF NOT EXISTS idx_partner_registry_verified ON partner_registry(last_verified DESC);

-- Partner compatibility scores (computed, stored for fast retrieval)
CREATE TABLE IF NOT EXISTS partner_compatibility_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partner_registry(id) ON DELETE CASCADE,
  product_id UUID,
  score NUMERIC(5,2) NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provenance VARCHAR(20) NOT NULL DEFAULT 'REAL'
);

CREATE INDEX IF NOT EXISTS idx_partner_scores_partner ON partner_compatibility_scores(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_scores_product ON partner_compatibility_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_partner_scores_computed ON partner_compatibility_scores(computed_at DESC);

COMMIT;
