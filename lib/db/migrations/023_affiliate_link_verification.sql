-- ============================================================
-- 023 — AFFILIATE LINK VERIFICATION STATE
--
-- Adds an explicit verification state to affiliate_links so that
-- an article can never publish on the strength of a raw, unverified
-- affiliate URL.
--
-- Verification states:
--   pending    - created, never verified against the provider
--   verified  - product + hop-link confirmed live by the provider
--   invalid    - provider says the product/URL is dead or unreachable
--   manual_required - product exists but no automated verification is
--                    possible; owner must supply the real promolink
--
-- Existing rows default to 'pending' so legacy data is never
-- silently promoted to verified.
-- ============================================================

ALTER TABLE affiliate_links
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence JSONB DEFAULT '{}'::jsonb;

-- articles may now point at the verified affiliate_links row that
-- backs its CTA. Nullable: non-monetised content has no link.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_affiliate_link_id ON articles(affiliate_link_id);

-- Constrain the vocabulary. 'pending' is allowed for legacy rows only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_affiliate_link_verification_status'
  ) THEN
    ALTER TABLE affiliate_links
      ADD CONSTRAINT chk_affiliate_link_verification_status
      CHECK (verification_status IN ('pending', 'verified', 'invalid', 'manual_required'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliate_links_verification_status
  ON affiliate_links(verification_status);

-- A VERIFIED link must carry a destination_url and a network.
-- This prevents a verified row from being a bare placeholder.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_affiliate_link_verified_requires_url'
  ) THEN
    ALTER TABLE affiliate_links
      ADD CONSTRAINT chk_affiliate_link_verified_requires_url
      CHECK (
        verification_status <> 'verified'
        OR (destination_url IS NOT NULL AND btrim(destination_url) <> '' AND network IS NOT NULL AND btrim(network) <> '')
      );
  END IF;
END $$;

-- ============================================================
-- Publication gate: an article with a brain lineage may only publish
-- when every affiliate link it references is VERIFIED.
-- Articles with no affiliate link are unaffected (they are not
-- product/affiliate content).
-- ============================================================
CREATE OR REPLACE FUNCTION block_publication_without_verified_affiliate_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  -- Only brain-lineaged articles are governed by this gate.
  IF NEW.brain_task_id IS NULL AND NEW.automation_job_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- No affiliate link on the article: allowed (non-monetised content).
  IF NEW.affiliate_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- The article must reference an affiliate_links row, and that row
  -- must be VERIFIED. A raw URL in articles.affiliate_url is NOT
  -- sufficient on its own.
  IF NOT EXISTS (
    SELECT 1 FROM affiliate_links al
    WHERE al.article_id = NEW.id
      AND al.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION
      'Publication blocked: article % references an unverified affiliate link. '
      'An affiliate link must be verified (status=verified) before publication.',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_publication_verified_affiliate_link_insert_trigger ON articles;
CREATE TRIGGER block_publication_verified_affiliate_link_insert_trigger
  BEFORE INSERT ON articles
  FOR EACH ROW
  EXECUTE FUNCTION block_publication_without_verified_affiliate_link();

DROP TRIGGER IF EXISTS block_publication_verified_affiliate_link_update_trigger ON articles;
CREATE TRIGGER block_publication_verified_affiliate_link_update_trigger
  BEFORE UPDATE OF status ON articles
  FOR EACH ROW
  EXECUTE FUNCTION block_publication_without_verified_affiliate_link();