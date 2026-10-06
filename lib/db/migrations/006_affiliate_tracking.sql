-- ============================================================
-- Phase 4.3: Affiliate Tracking Infrastructure
--
-- Creates dedicated tracking tables for affiliate links, clicks,
-- and conversions. Also adds product_id FK to the articles table
-- to support direct product-to-article attribution.
--
-- This migration is ADDITIVE ONLY.
-- ============================================================

-- ============================================================
-- 1. Add product_id to articles table (FK to products)
-- ============================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_product ON articles(product_id);

-- ============================================================
-- 2. Affiliate Links — canonical affiliate URLs attached to
--    products or articles. Each link captures the network,
--    tracking sub-id, and raw destination URL so every
--    outbound click/conversion can be traced.
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  network VARCHAR(100) NOT NULL,
  destination_url TEXT NOT NULL,
  sub_id_1 TEXT,
  sub_id_2 TEXT,
  sub_id_3 TEXT,
  sub_id_4 TEXT,
  sub_id_5 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_article ON affiliate_links(article_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_network ON affiliate_links(network);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_dest ON affiliate_links(destination_url);

-- ============================================================
-- 3. Affiliate Clicks — one row per outbound redirect through
--    the tracking layer. Captured before the browser leaves so
--    we can measure engagement.
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(10),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link ON affiliate_clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_article ON affiliate_clicks(article_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product ON affiliate_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);

-- ============================================================
-- 4. Affiliate Conversions — recorded when a tracked click
--    results in a known conversion event (sale, lead, signup).
--    Populated from Digistore24 commission/purchase data
--    matched by sub-ids.
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  affiliate_click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  network VARCHAR(100),
  order_id VARCHAR(255),
  sub_id_1 TEXT,
  sub_id_2 TEXT,
  sub_id_3 TEXT,
  sub_id_4 TEXT,
  sub_id_5 TEXT,
  commission DECIMAL(10,2),
  currency VARCHAR(3),
  customer_country VARCHAR(10),
  conversion_type VARCHAR(50),
  converted_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_link ON affiliate_conversions(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_click ON affiliate_conversions(affiliate_click_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_article ON affiliate_conversions(article_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_product ON affiliate_conversions(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_order ON affiliate_conversions(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_recorded_at ON affiliate_conversions(recorded_at DESC);

-- ============================================================
-- 5. Trigger: updated_at auto-refresh on affiliate_links
-- ============================================================

CREATE OR REPLACE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END Phase 4.3 Affiliate Tracking
-- ============================================================
