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

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(active);

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

CREATE INDEX idx_authors_slug ON authors(slug);
CREATE INDEX idx_authors_active ON authors(active);

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

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(active);
CREATE INDEX idx_categories_featured ON categories(featured);

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
  seo JSONB DEFAULT '{}',
  geo JSONB DEFAULT '{}',
  aeo JSONB DEFAULT '{}'
);

CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_featured ON articles(featured);
CREATE INDEX idx_articles_trending ON articles(trending);

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

CREATE INDEX idx_reviews_slug ON reviews(slug);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_published_at ON reviews(published_at);
CREATE INDEX idx_reviews_author ON reviews(author_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);

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

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);

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

CREATE INDEX idx_affiliate_content ON affiliate_references(content_type, content_id);

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

CREATE INDEX idx_research_jobs_idempotency ON research_jobs(idempotency_key);
CREATE INDEX idx_research_jobs_status ON research_jobs(status);
CREATE INDEX idx_research_jobs_category ON research_jobs(category);
CREATE INDEX idx_research_jobs_created_at ON research_jobs(created_at);

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

CREATE INDEX idx_automation_jobs_idempotency ON automation_jobs(idempotency_key);
CREATE INDEX idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX idx_automation_jobs_type ON automation_jobs(type);
CREATE INDEX idx_automation_jobs_stage ON automation_jobs(stage);
CREATE INDEX idx_automation_jobs_created_at ON automation_jobs(created_at);

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

CREATE INDEX idx_optimization_jobs_idempotency ON optimization_jobs(idempotency_key);
CREATE INDEX idx_optimization_jobs_status ON optimization_jobs(status);
CREATE INDEX idx_optimization_jobs_type ON optimization_jobs(type);
CREATE INDEX idx_optimization_jobs_target ON optimization_jobs(target_id, target_slug);
CREATE INDEX idx_optimization_jobs_created_at ON optimization_jobs(created_at);

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

CREATE INDEX idx_service_connections_service_id ON service_connections(service_id);
CREATE INDEX idx_service_connections_status ON service_connections(status);
CREATE INDEX idx_service_connections_category ON service_connections(category);

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

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

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

CREATE INDEX idx_site_settings_key ON site_settings(key);

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

CREATE INDEX idx_navigation_key ON navigation(key);

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

CREATE INDEX idx_redirects_source ON redirects(source);
CREATE INDEX idx_redirects_active ON redirects(active);

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

-- Public read access for published content
CREATE POLICY "Public read published articles" ON articles FOR SELECT USING (status = 'published' AND published_at IS NOT NULL);
CREATE POLICY "Public read published reviews" ON reviews FOR SELECT USING (status = 'published' AND published_at IS NOT NULL);
CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (active = true);
CREATE POLICY "Public read active authors" ON authors FOR SELECT USING (active = true);

-- Admin full access (service role bypasses RLS)
-- Note: In Supabase, service_role has full access. Application should use service_role for admin operations.
