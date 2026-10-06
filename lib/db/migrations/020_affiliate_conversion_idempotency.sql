-- Migration 020: Affiliate Conversion Idempotency + Refund Support
-- Additive only. No drops, no data changes.
--
-- Enables the Digistore24 IPN webhook boundary:
--   1. provider_transaction_id + provider — the external event identity.
--   2. status / event_type — refunds and chargebacks update the existing
--      conversion instead of creating a second financial record.
--   3. Unique partial index — a replayed or duplicated IPN event for the
--      same provider transaction can never create a duplicate conversion
--      row, even under concurrent delivery. First insert wins; the loser
--      hits a unique violation and the handler treats it as a duplicate.

BEGIN;

ALTER TABLE affiliate_conversions
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;

ALTER TABLE affiliate_conversions
  ADD COLUMN IF NOT EXISTS provider VARCHAR(100) NOT NULL DEFAULT 'digistore24';

ALTER TABLE affiliate_conversions
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'paid', 'refunded', 'chargeback'));

ALTER TABLE affiliate_conversions
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_conversions_provider_txn
  ON affiliate_conversions (provider_transaction_id, provider)
  WHERE provider_transaction_id IS NOT NULL;

COMMIT;
