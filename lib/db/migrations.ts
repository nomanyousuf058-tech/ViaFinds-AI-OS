export const MIGRATION_SQL = `
-- ============================================================
-- ViaFinds Editorial Content Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- AUTH / ADMIN
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active);

-- ============================================================
-- AUTHORS
-- ============================================================

CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(255),
  social_links JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_authors_active ON authors(active);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon VARCHAR(255),
  cover_image_url TEXT,
  banner_image_url TEXT,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  seo JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(featured);

-- ============================================================
-- PRODUCTS (Editorial References Only - NOT Ecommerce Catalog)
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  category VARCHAR(255),
  price DECIMAL(10,2),
  rating DECIMAL(2,1),
  image_url TEXT,
  gallery JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '[]',
  affiliate_url TEXT,
  affiliate_network VARCHAR(255),
  affiliate_links JSONB DEFAULT '[]',
  availability VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================================
-- ARTICLES
-- ============================================================

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  excerpt TEXT,
  content JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  trending BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  gallery JSONB DEFAULT '[]',
  reading_time INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  seo JSONB DEFAULT '{}',
  geo JSONB DEFAULT '{}',
  aeo JSONB DEFAULT '{}'
);

-- Ensure product_id exists even if articles was created from an earlier schema
ALTER TABLE articles ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_product ON articles(product_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_trending ON articles(trending);

-- Full-text search
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
UPDATE articles SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(CAST(content AS TEXT), '')), 'C')
WHERE search_vector IS NULL;
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  review_type VARCHAR(50) DEFAULT 'editorial',
  verdict TEXT,
  content JSONB DEFAULT '[]',
  rating DECIMAL(2,1),
  pros JSONB DEFAULT '[]',
  cons JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  seo JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at);
CREATE INDEX IF NOT EXISTS idx_reviews_author ON reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ============================================================
-- ARTICLE-REVIEW RELATIONSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS article_related_products (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, product_id)
);

CREATE TABLE IF NOT EXISTS article_related_articles (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  related_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, related_article_id)
);

CREATE TABLE IF NOT EXISTS review_comparison_products (
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, product_id)
);

-- ============================================================
-- AFFILIATE REFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  url TEXT NOT NULL,
  label VARCHAR(255),
  merchant VARCHAR(255),
  price DECIMAL(10,2),
  network VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_content ON affiliate_references(content_type, content_id);

-- ============================================================
-- RESEARCH JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  topic VARCHAR(500) NOT NULL,
  keyword VARCHAR(255),
  category VARCHAR(255),
  sources JSONB DEFAULT '[]',
  ai_provider VARCHAR(255),
  confidence DECIMAL(3,2),
  intent VARCHAR(255),
  status VARCHAR(50) DEFAULT 'queued',
  result JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_jobs_idempotency ON research_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_category ON research_jobs(category);
CREATE INDEX IF NOT EXISTS idx_research_jobs_created_at ON research_jobs(created_at);

-- ============================================================
-- AUTOMATION JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  stage VARCHAR(100) NOT NULL,
  content_type VARCHAR(50),
  content_id UUID,
  status VARCHAR(50) DEFAULT 'queued',
  priority INTEGER DEFAULT 0,
  provider VARCHAR(255),
  model VARCHAR(255),
  input JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_idempotency ON automation_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_type ON automation_jobs(type);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_stage ON automation_jobs(stage);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_created_at ON automation_jobs(created_at);

-- ============================================================
-- OPTIMIZATION JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS optimization_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  target_slug VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  score INTEGER,
  findings JSONB DEFAULT '[]',
  proposed_changes JSONB DEFAULT '[]',
  applied_changes JSONB DEFAULT '[]',
  error TEXT,
  audit_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimization_jobs_idempotency ON optimization_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_status ON optimization_jobs(status);
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_type ON optimization_jobs(type);
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_target ON optimization_jobs(target_id, target_slug);
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_created_at ON optimization_jobs(created_at);

-- ============================================================
-- SERVICE CONNECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS service_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  purpose TEXT,
  capabilities JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'not_configured',
  health_status VARCHAR(50) DEFAULT 'unknown',
  configuration JSONB DEFAULT '{}',
  last_health_check_at TIMESTAMPTZ,
  last_health_check_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_connections_service_id ON service_connections(service_id);
CREATE INDEX IF NOT EXISTS idx_service_connections_status ON service_connections(status);
CREATE INDEX IF NOT EXISTS idx_service_connections_category ON service_connections(category);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255),
  entity_id UUID,
  user_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- SITE SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- ============================================================
-- NAVIGATION
-- ============================================================

CREATE TABLE IF NOT EXISTS navigation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navigation_key ON navigation(key);

-- ============================================================
-- REDIRECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS redirects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(500) NOT NULL,
  destination VARCHAR(500) NOT NULL,
  status_code INTEGER DEFAULT 301,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redirects_source ON redirects(source);
CREATE INDEX IF NOT EXISTS idx_redirects_active ON redirects(active);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION protect_manual_articles()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent overwriting or downgrading published/manual articles by automated processes
  -- This constraint ensures that the automated engine can only touch drafts.
  IF OLD.status IN ('published', 'manual') THEN
    -- If the new status isn't also published/manual (e.g., trying to set to auto_draft) or this is a background script, block it.
    -- To allow true human admins to update, they would do it through the dashboard. 
    -- The simplest DB-level safety is to block updates if the new status drops from published/manual to draft/auto_draft.
    IF NEW.status IN ('draft', 'auto_draft') THEN
       RAISE EXCEPTION 'Cannot downgrade a published or manual article to a draft via automation.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_authors_updated_at BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER protect_manual_articles_trigger BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION protect_manual_articles();
CREATE OR REPLACE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_service_connections_updated_at BEFORE UPDATE ON service_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_navigation_updated_at BEFORE UPDATE ON navigation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_redirects_updated_at BEFORE UPDATE ON redirects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

-- Public read access for published content (idempotent: drop-then-create)
DROP POLICY IF EXISTS "Public read published articles" ON articles;
CREATE POLICY "Public read published articles" ON articles FOR SELECT USING (status = 'published' AND published_at IS NOT NULL);
DROP POLICY IF EXISTS "Public read published reviews" ON reviews;
CREATE POLICY "Public read published reviews" ON reviews FOR SELECT USING (status = 'published' AND published_at IS NOT NULL);
DROP POLICY IF EXISTS "Public read active categories" ON categories;
CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Public read active authors" ON authors;
CREATE POLICY "Public read active authors" ON authors FOR SELECT USING (active = true);

-- Admin full access (service role bypasses RLS)
-- Note: In Supabase, service_role has full access. Application should use service_role for admin operations.

-- ============================================================
-- AFFILIATE TRACKING (Phase 4.3)
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
  short_code VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_article ON affiliate_links(article_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_network ON affiliate_links(network);

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
  raw_data JSONB DEFAULT '{}',
  provider_transaction_id TEXT,
  provider VARCHAR(100) NOT NULL DEFAULT 'digistore24',
  status VARCHAR(50) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'paid', 'refunded', 'chargeback')),
  event_type VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_link ON affiliate_conversions(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_click ON affiliate_conversions(affiliate_click_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_article ON affiliate_conversions(article_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_order ON affiliate_conversions(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_conversions_provider_txn ON affiliate_conversions(provider_transaction_id, provider) WHERE provider_transaction_id IS NOT NULL;

CREATE OR REPLACE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE affiliate_links
  ADD COLUMN IF NOT EXISTS short_code VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_short_code ON affiliate_links(short_code);

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

CREATE TABLE IF NOT EXISTS brain_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'generating',
  context JSONB DEFAULT '{}',
  observations JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_reports_status ON brain_reports(status);
CREATE INDEX IF NOT EXISTS idx_brain_reports_created_at ON brain_reports(created_at);

CREATE TABLE IF NOT EXISTS brain_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES brain_reports(id) ON DELETE CASCADE,
  type VARCHAR(100),
  fact TEXT,
  evidence TEXT,
  inference TEXT,
  recommendation TEXT,
  confidence VARCHAR(50),
  source VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_observations_report ON brain_observations(report_id);

CREATE TABLE IF NOT EXISTS brain_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL,
  content JSONB NOT NULL,
  confidence VARCHAR(50),
  source VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_brain_reports_updated_at BEFORE UPDATE ON brain_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_brain_memory_updated_at BEFORE UPDATE ON brain_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE brain_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_memory ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Phase 4 Canonical Integrations (from scripts/migrate-phase4.ts)
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES brain_tasks(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES brain_strategies(id) ON DELETE CASCADE,
  execution_plan_id UUID REFERENCES brain_execution_plans(id) ON DELETE CASCADE,
  proposed_action JSONB NOT NULL,
  requested_permission VARCHAR(50) NOT NULL,
  evidence JSONB DEFAULT '{}',
  requested_by VARCHAR(50) DEFAULT 'brain',
  decision VARCHAR(50) DEFAULT 'pending',
  decided_by VARCHAR(255),
  decided_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correlation_id VARCHAR(255) NOT NULL,
  task_id UUID REFERENCES brain_tasks(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL,
  execution_plan_id UUID REFERENCES brain_execution_plans(id) ON DELETE SET NULL,
  expected TEXT NOT NULL,
  actual TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  evidence JSONB DEFAULT '{}',
  failure_reason TEXT,
  lesson TEXT NOT NULL,
  reusable BOOLEAN DEFAULT false,
  source VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_product_discoveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE CASCADE,
  existing_products JSONB DEFAULT '[]',
  partner_availability JSONB DEFAULT '[]',
  alternative_networks JSONB DEFAULT '[]',
  manual_fallback_needed BOOLEAN DEFAULT false,
  evaluation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_content_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE CASCADE,
  format VARCHAR(100) NOT NULL,
  reasoning TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',
  search_intent VARCHAR(100),
  audience VARCHAR(500),
  trend_alignment VARCHAR(50),
  competition_level VARCHAR(50),
  product_fit VARCHAR(50),
  freshness VARCHAR(50),
  evidence_availability VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_cost_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation VARCHAR(255) NOT NULL,
  can_use_memory BOOLEAN DEFAULT false,
  can_use_database BOOLEAN DEFAULT false,
  can_use_cached_research BOOLEAN DEFAULT false,
  needs_external_research BOOLEAN DEFAULT false,
  needs_llm BOOLEAN DEFAULT false,
  selected_provider VARCHAR(255),
  selected_model VARCHAR(255),
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Phase 5 - Business Intelligence & Strategy Evolution
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_business_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_window JSONB NOT NULL,
  sensors JSONB NOT NULL,
  content JSONB NOT NULL,
  traffic JSONB NOT NULL,
  affiliate JSONB NOT NULL,
  conversions JSONB NOT NULL,
  revenue JSONB NOT NULL,
  opportunities JSONB NOT NULL,
  automation JSONB NOT NULL,
  quality JSONB NOT NULL,
  bottlenecks JSONB NOT NULL,
  measurement_gaps JSONB NOT NULL,
  evidence JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  provenance VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS brain_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  evidence JSONB NOT NULL,
  provenance VARCHAR(255) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  expected_impact TEXT NOT NULL,
  risks JSONB NOT NULL,
  prerequisites JSONB NOT NULL,
  required_permissions JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT brain_decisions_type_title_rationale_key UNIQUE (type, title, rationale)
);

CREATE TABLE IF NOT EXISTS brain_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis TEXT NOT NULL,
  metric VARCHAR(100) NOT NULL,
  baseline JSONB NOT NULL,
  variant JSONB NOT NULL,
  population VARCHAR(255) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  evidence JSONB NOT NULL,
  provenance VARCHAR(255) NOT NULL,
  result JSONB,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_experiment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES brain_experiments(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  variant_id VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_experiment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES brain_experiments(id) ON DELETE CASCADE,
  uplift DECIMAL(10,4),
  significance DECIMAL(5,4),
  conclusive BOOLEAN DEFAULT false,
  recommendation TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Phase 5.5: Strategy Evolution
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_memory_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  provenance VARCHAR(255) NOT NULL,
  evidence JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  observation_count INT DEFAULT 1,
  reusable BOOLEAN DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_technology_radar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(100) NOT NULL,
  capability VARCHAR(100) NOT NULL,
  availability VARCHAR(50) NOT NULL,
  cost JSONB NOT NULL,
  limits JSONB NOT NULL,
  source VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_cost_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  cost DECIMAL(10,4) NOT NULL,
  tokens_used INT,
  duration_ms INT,
provenance VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Phase 5.2: brain_decisions RLS + Indexes
-- ============================================================

ALTER TABLE brain_decisions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_brain_decisions_status ON brain_decisions (status);
CREATE INDEX IF NOT EXISTS idx_brain_decisions_provenance ON brain_decisions (provenance);
CREATE INDEX IF NOT EXISTS idx_brain_decisions_created_at ON brain_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_decisions_status_created ON brain_decisions (status, created_at DESC);

-- ============================================================
-- Phase 5.3: Strategy Engine V2 schema extension
-- ============================================================

ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS strategy_type VARCHAR(100);
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS evidence_strength VARCHAR(50);
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS evidence_refs JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS assumptions JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS unknowns JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS unavailable_data JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS expected_observations JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS success_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS failure_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS opportunity_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS decision_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS research_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS learning_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS parent_strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL;
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS outcome_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS freshness JSONB DEFAULT '{}';
ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS conflict_flags JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_brain_strategies_type ON brain_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_evidence_strength ON brain_strategies(evidence_strength);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_outcome_status ON brain_strategies(outcome_status);
CREATE INDEX IF NOT EXISTS idx_brain_strategies_parent ON brain_strategies(parent_strategy_id);

-- ============================================================
-- Phase 5.4: Opportunity Engine V2 schema extension
-- ============================================================

ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS opportunity_type VARCHAR(100);
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS evidence_strength VARCHAR(50);
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS evidence_refs JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS research_ids JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS article_ids JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS strategy_ids JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS decision_ids JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS observed_signals JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS assumptions JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS unknowns JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS unavailable_data JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS risks JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS potential_actions JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS success_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS failure_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS freshness JSONB DEFAULT '{}';
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(500);
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS parent_opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE SET NULL;
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS product_availability VARCHAR(50);
ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_brain_opportunities_opp_type ON brain_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_brain_opportunities_evidence_strength ON brain_opportunities(evidence_strength);
CREATE INDEX IF NOT EXISTS idx_brain_opportunities_dedup_key ON brain_opportunities(deduplication_key);
CREATE INDEX IF NOT EXISTS idx_brain_opportunities_parent ON brain_opportunities(parent_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_brain_opportunities_product_avail ON brain_opportunities(product_availability);

-- ============================================================
-- Phase 5.5: Strategy Evolution
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_strategy_evolution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES brain_strategies(id) ON DELETE CASCADE,
  source_strategy_version INTEGER NOT NULL DEFAULT 1,
  proposed_version INTEGER NOT NULL,
  evolution_type VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  evidence_refs JSONB DEFAULT '[]',
  opportunity_ids JSONB DEFAULT '[]',
  learning_ids JSONB DEFAULT '[]',
  decision_ids JSONB DEFAULT '[]',
  execution_ids JSONB DEFAULT '[]',
  evidence_strength VARCHAR(50),
  confidence NUMERIC(5,2),
  assumptions JSONB DEFAULT '[]',
  unknowns JSONB DEFAULT '[]',
  unavailable_data JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  proposed_changes JSONB DEFAULT '{}',
  expected_observations JSONB DEFAULT '[]',
  success_conditions JSONB DEFAULT '[]',
  failure_conditions JSONB DEFAULT '[]',
  provenance VARCHAR(50) DEFAULT 'UNKNOWN',
  status VARCHAR(50) DEFAULT 'PROPOSED',
  approval_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_strategy ON brain_strategy_evolution(strategy_id);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_status ON brain_strategy_evolution(status);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_type ON brain_strategy_evolution(evolution_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_trigger ON brain_strategy_evolution(trigger_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_provenance ON brain_strategy_evolution(provenance);

ALTER TABLE brain_strategy_evolution ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Phase 5.6 Gate 1: Experiment Foundation
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis TEXT NOT NULL,
  metric VARCHAR(100) NOT NULL,
  baseline JSONB NOT NULL,
  variant JSONB NOT NULL,
  population VARCHAR(255) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  evidence JSONB NOT NULL,
  provenance VARCHAR(255) NOT NULL,
  result JSONB,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_experiments_status ON brain_experiments(status);
CREATE INDEX IF NOT EXISTS idx_brain_experiments_provenance ON brain_experiments(provenance);
CREATE INDEX IF NOT EXISTS idx_brain_experiments_start_time ON brain_experiments(start_time);
CREATE INDEX IF NOT EXISTS idx_brain_experiments_end_time ON brain_experiments(end_time);

ALTER TABLE brain_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_experiments_admin_all ON brain_experiments;
CREATE POLICY brain_experiments_admin_all
  ON brain_experiments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS brain_experiment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES brain_experiments(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  variant_id VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_experiment ON brain_experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_type ON brain_experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_variant ON brain_experiment_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_events_created ON brain_experiment_events(created_at);

ALTER TABLE brain_experiment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_experiment_events_admin_all ON brain_experiment_events;
CREATE POLICY brain_experiment_events_admin_all
  ON brain_experiment_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS brain_experiment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES brain_experiments(id) ON DELETE CASCADE,
  control_variant_id VARCHAR(100),
  treatment_variant_id VARCHAR(100),
  control_sample_size INTEGER,
  treatment_sample_size INTEGER,
  control_conversions INTEGER,
  treatment_conversions INTEGER,
  control_conversion_rate DECIMAL(10,6),
  treatment_conversion_rate DECIMAL(10,6),
  absolute_difference DECIMAL(10,6),
  relative_difference DECIMAL(10,6),
  control_ci_lower DECIMAL(10,6),
  control_ci_upper DECIMAL(10,6),
  treatment_ci_lower DECIMAL(10,6),
  treatment_ci_upper DECIMAL(10,6),
  p_value DECIMAL(10,6),
  fisher_odds_ratio DECIMAL(10,6),
  significance_level DECIMAL(5,4) DEFAULT 0.05,
  sample_adequacy VARCHAR(50),
  min_required_sample INTEGER,
  conclusion VARCHAR(50),
  uplift DECIMAL(10,4),
  significance DECIMAL(5,4),
  conclusive BOOLEAN DEFAULT false,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_experiment_results_experiment ON brain_experiment_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_results_conclusion ON brain_experiment_results(conclusion);
CREATE INDEX IF NOT EXISTS idx_brain_experiment_results_conclusive ON brain_experiment_results(conclusive);

ALTER TABLE brain_experiment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_experiment_results_admin_all ON brain_experiment_results;
CREATE POLICY brain_experiment_results_admin_all
  ON brain_experiment_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
`;

export const RECONCILIATION_SQL = `
-- ============================================================
-- Phase 5.5: Strategy Evolution schema reconciliation (idempotent)
-- Reconciles legacy brain_strategy_evolution schema drift with the
-- canonical Phase 5.5 contract. Safe to run repeatedly.
-- ============================================================

ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS current_strategy;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS new_evidence;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS observed_outcomes;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS real_learnings;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS market_signals;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS content_performance;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS proposal;
ALTER TABLE brain_strategy_evolution DROP COLUMN IF EXISTS rationale;

ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  strategy_id UUID REFERENCES brain_strategies(id) ON DELETE CASCADE;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  source_strategy_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  proposed_version INTEGER NOT NULL;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  evolution_type VARCHAR(50) NOT NULL;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  trigger_type VARCHAR(50) NOT NULL;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  evidence_refs JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  opportunity_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  learning_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  decision_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  execution_ids JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  evidence_strength VARCHAR(50);
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  confidence NUMERIC(5,2);
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  assumptions JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  unknowns JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  unavailable_data JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  risks JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  proposed_changes JSONB DEFAULT '{}';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  expected_observations JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  success_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  failure_conditions JSONB DEFAULT '[]';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  provenance VARCHAR(50) DEFAULT 'UNKNOWN';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  status VARCHAR(50) DEFAULT 'PROPOSED';
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  approval_id UUID;
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE brain_strategy_evolution ADD COLUMN IF NOT EXISTS
  updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_strategy ON brain_strategy_evolution(strategy_id);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_status ON brain_strategy_evolution(status);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_type ON brain_strategy_evolution(evolution_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_trigger ON brain_strategy_evolution(trigger_type);
CREATE INDEX IF NOT EXISTS idx_brain_strategy_evol_provenance ON brain_strategy_evolution(provenance);

ALTER TABLE brain_strategy_evolution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_strategy_evolution_admin_all ON brain_strategy_evolution;
CREATE POLICY brain_strategy_evolution_admin_all
  ON brain_strategy_evolution
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Phase 5.6 Gate 1: Experiment Foundation reconciliation (idempotent)
-- Ensures RLS and CHECK constraints on experiment tables.
-- ============================================================

-- Ensure RLS is enabled on all experiment tables
ALTER TABLE brain_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_experiment_results ENABLE ROW LEVEL SECURITY;

-- Ensure admin policies exist on all experiment tables
DROP POLICY IF EXISTS brain_experiments_admin_all ON brain_experiments;
CREATE POLICY brain_experiments_admin_all
  ON brain_experiments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS brain_experiment_events_admin_all ON brain_experiment_events;
CREATE POLICY brain_experiment_events_admin_all
  ON brain_experiment_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS brain_experiment_results_admin_all ON brain_experiment_results;
CREATE POLICY brain_experiment_results_admin_all
  ON brain_experiment_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure CHECK constraints exist (skip if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_conclusion'
      AND conrelid = 'brain_experiment_results'::regclass
  ) THEN
    ALTER TABLE brain_experiment_results
      ADD CONSTRAINT chk_conclusion
      CHECK (
        conclusion IS NULL OR conclusion IN (
          'SIGNIFICANT_WIN',
          'SIGNIFICANT_LOSS',
          'NO_SIGNIFICANCE',
          'INSUFFICIENT_SAMPLE',
          'ERROR'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_sample_adequacy'
      AND conrelid = 'brain_experiment_results'::regclass
  ) THEN
    ALTER TABLE brain_experiment_results
      ADD CONSTRAINT chk_sample_adequacy
      CHECK (
        sample_adequacy IS NULL OR sample_adequacy IN (
          'ADEQUATE',
          'INSUFFICIENT',
          'UNKNOWN'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_brain_experiments_status'
      AND conrelid = 'brain_experiments'::regclass
  ) THEN
    ALTER TABLE brain_experiments
      ADD CONSTRAINT chk_brain_experiments_status
      CHECK (
        status IN (
          'PROPOSED',
          'RUNNING',
          'COMPLETED',
          'INCONCLUSIVE',
          'CANCELLED',
          'ARCHIVED'
        )
      );
  END IF;
END $$;
`;
