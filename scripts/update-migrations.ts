import * as fs from 'fs';
import * as path from 'path';

const sql = `
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS brain_strategy_evolution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_strategy JSONB NOT NULL,
  new_evidence JSONB NOT NULL,
  observed_outcomes JSONB NOT NULL,
  real_learnings JSONB NOT NULL,
  market_signals JSONB NOT NULL,
  content_performance JSONB NOT NULL,
  proposal VARCHAR(50) NOT NULL,
  rationale TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
`;

const migrationsPath = path.join(process.cwd(), 'lib/db/migrations.ts');
let content = fs.readFileSync(migrationsPath, 'utf8');

// Replace the very last backtick and semicolon with the new SQL and a new backtick and semicolon
const lastBacktickIndex = content.lastIndexOf('\`');
if (lastBacktickIndex !== -1) {
  content = content.substring(0, lastBacktickIndex) + sql + '\n\`;\n';
  fs.writeFileSync(migrationsPath, content);
  console.log('Appended SQL to lib/db/migrations.ts');
} else {
  console.log('Could not find closing backtick');
}

const schemaPath = path.join(process.cwd(), 'lib/db/schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
schemaContent += '\n' + sql;
fs.writeFileSync(schemaPath, schemaContent);
console.log('Appended SQL to lib/db/schema.sql');
