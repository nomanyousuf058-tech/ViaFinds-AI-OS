-- Phase 5.4: Opportunity Engine V2 schema extension
-- Extends brain_opportunities with V2 lifecycle, evidence, and deduplication
-- columns. Backward compatible — all columns nullable.

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