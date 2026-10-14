-- Migration 023: Affiliate Link Verification & Conversion Updated At
-- Adds verification columns to affiliate_links, FK from articles,
-- publication trigger, and updated_at to affiliate_conversions.
-- Safe to run repeatedly (IF NOT EXISTS / DROP IF EXISTS).

-- ── affiliate_links: verification columns ──
ALTER TABLE affiliate_links
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

ALTER TABLE affiliate_links
  ADD COLUMN IF NOT EXISTS verification_evidence JSONB DEFAULT '{}';

ALTER TABLE affiliate_links
  ADD COLUMN IF NOT EXISTS verification_checked_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_affiliate_links_verification_status'
      AND conrelid = 'affiliate_links'::regclass
  ) THEN
    ALTER TABLE affiliate_links
      ADD CONSTRAINT chk_affiliate_links_verification_status
      CHECK (verification_status IN ('VERIFIED', 'INVALID', 'MANUAL_REQUIRED', 'PENDING'));
  END IF;
END $$;

-- ── articles: FK to affiliate_links ──
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_affiliate_link ON articles(affiliate_link_id);

-- ── affiliate_conversions: updated_at ──
ALTER TABLE affiliate_conversions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Publication trigger: prevent publishing with unverified links ──
CREATE OR REPLACE FUNCTION check_affiliate_verification_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.affiliate_link_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM affiliate_links
      WHERE id = NEW.affiliate_link_id
      AND verification_status NOT IN ('VERIFIED')
    ) THEN
      RAISE EXCEPTION 'Cannot publish article: affiliate link % is not VERIFIED (current: %)',
        NEW.affiliate_link_id,
        (SELECT verification_status FROM affiliate_links WHERE id = NEW.affiliate_link_id)
      USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_affiliate_verification_on_publish ON articles;
CREATE TRIGGER check_affiliate_verification_on_publish
  BEFORE UPDATE OF status ON articles
  FOR EACH ROW
  EXECUTE FUNCTION check_affiliate_verification_on_publish();

-- ── updated_at trigger for affiliate_conversions ──
CREATE OR REPLACE TRIGGER update_affiliate_conversions_updated_at
  BEFORE UPDATE ON affiliate_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();