-- ============================================================
-- Phase 2A: Affiliate Short Code - SAFE MIGRATION
-- 
-- This migration safely adds short codes to the affiliate_links table.
-- It handles existing rows with a backfill strategy before enforcing
-- NOT NULL and UNIQUE constraints.
--
-- Execution order (critical for existing data safety):
--   1. Add nullable short_code column
--   2. Create code generation function
--   3. Backfill existing rows
--   4. Verify backfill completeness
--   5. Create unique index (enforces uniqueness)
--   6. Set NOT NULL on column
--   7. Create trigger for future inserts
-- ============================================================

-- ============================================================
-- 1. Add short_code column as NULLABLE first
-- ============================================================

ALTER TABLE affiliate_links
  ADD COLUMN IF NOT EXISTS short_code VARCHAR(255);

-- ============================================================
-- 2. Create short-code generation function
-- ============================================================

CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT[] := ARRAY[
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '0','1','2','3','4','5','6','7','8','9'
  ];
  code TEXT := '';
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  WHILE attempts < max_attempts LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || chars[1 + floor(random() * 62)];
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM affiliate_links WHERE short_code = code) THEN
      RETURN code;
    END IF;

    attempts := attempts + 1;
  END LOOP;

  RAISE EXCEPTION 'Failed to generate a unique short code after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Backfill existing rows that don't already have a short code
-- ============================================================

UPDATE affiliate_links
SET short_code = generate_short_code()
WHERE short_code IS NULL;

-- ============================================================
-- 4. Verify every row has a short code (safety check)
-- ============================================================

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM affiliate_links
  WHERE short_code IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rows still have NULL short_code', null_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Create unique index (enforces uniqueness after backfill)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_links_short_code ON affiliate_links(short_code);

-- ============================================================
-- 6. Set NOT NULL (all rows are guaranteed to have values now)
-- ============================================================

ALTER TABLE affiliate_links
  ALTER COLUMN short_code SET NOT NULL;

-- ============================================================
-- 7. Create trigger for automatic short code generation on inserts
-- ============================================================

CREATE OR REPLACE FUNCTION auto_generate_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    NEW.short_code := generate_short_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_short_code_trigger ON affiliate_links;
CREATE TRIGGER auto_generate_short_code_trigger
  BEFORE INSERT ON affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_short_code();

-- ============================================================
-- END Phase 2A Affiliate Short Code
-- ============================================================
