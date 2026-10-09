// Load env
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { query } from '../lib/db/client';

async function migrate() {
  console.log('=== Applying Phase 4 Schema Changes ===\n');

  // 1. Add Phase 4 columns to brain_opportunities
  console.log('1. Adding Phase 4 columns to brain_opportunities...');
  const oppColumns = [
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS structured_observation JSONB DEFAULT '{}'`,
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS evaluation JSONB DEFAULT '{}'`,
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS source JSONB DEFAULT '{}'`,
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS brain_reasoning TEXT`,
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL`,
    `ALTER TABLE brain_opportunities ADD COLUMN IF NOT EXISTS execution_plan_id UUID REFERENCES brain_execution_plans(id) ON DELETE SET NULL`,
  ];
  
  for (const sql of oppColumns) {
    try {
      await query(sql);
      console.log(`  ✓ ${sql}`);
    } catch (e) {
      console.error(`  ✗ ${sql}: ${e.message}`);
    }
  }

  // 2. Add indexes for brain_opportunities
  console.log('\n2. Adding indexes for brain_opportunities...');
  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_opportunities_category ON brain_opportunities(category)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_opportunities_strategy ON brain_opportunities(strategy_id)`);
    console.log('  ✓ Indexes created');
  } catch (e) {
    console.error(`  ✗ Indexes: ${e.message}`);
  }

  // 3. Add Phase 4 columns to brain_strategies
  console.log('\n3. Adding Phase 4 columns to brain_strategies...');
  const stratColumns = [
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE CASCADE`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS target_audience VARCHAR(500)`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS search_intent VARCHAR(100)`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS proposed_action TEXT`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS required_capabilities JSONB DEFAULT '[]'`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS expected_result TEXT`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS risks JSONB DEFAULT '[]'`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'`,
    `ALTER TABLE brain_strategies ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT true`,
  ];
  
  for (const sql of stratColumns) {
    try {
      await query(sql);
      console.log(`  ✓ ${sql}`);
    } catch (e) {
      console.error(`  ✗ ${sql}: ${e.message}`);
    }
  }

  // 4. Add Phase 4 columns to brain_execution_plans
  console.log('\n4. Adding Phase 4 columns to brain_execution_plans...');
  const execColumns = [
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE CASCADE`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS objective TEXT`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS required_permissions JSONB DEFAULT '[]'`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS expected_outcome TEXT`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS rollback_plan TEXT`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS verification_plan TEXT`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255)`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`,
    `ALTER TABLE brain_execution_plans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`,
  ];
  
  for (const sql of execColumns) {
    try {
      await query(sql);
      console.log(`  ✓ ${sql}`);
    } catch (e) {
      console.error(`  ✗ ${sql}: ${e.message}`);
    }
  }

  // 5. Add indexes for brain_execution_plans
  console.log('\n5. Adding indexes for brain_execution_plans...');
  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_exec_plans_opp ON brain_execution_plans(opportunity_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_exec_plans_correlation ON brain_execution_plans(correlation_id)`);
    console.log('  ✓ Indexes created');
  } catch (e) {
    console.error(`  ✗ Indexes: ${e.message}`);
  }

  // 6. Create brain_approvals table
  console.log('\n6. Creating brain_approvals table...');
  try {
    await query(`
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_approvals_task ON brain_approvals(task_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_approvals_strategy ON brain_approvals(strategy_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_approvals_decision ON brain_approvals(decision)`);
    await query(`
      CREATE OR REPLACE TRIGGER update_brain_approvals_updated_at 
      BEFORE UPDATE ON brain_approvals 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await query(`ALTER TABLE brain_approvals ENABLE ROW LEVEL SECURITY`);
    console.log('  ✓ Table created with indexes and RLS');
  } catch (e) {
    console.error(`  ✗ brain_approvals: ${e.message}`);
  }

  // 7. Create brain_learnings table
  console.log('\n7. Creating brain_learnings table...');
  try {
    await query(`
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_learnings_correlation ON brain_learnings(correlation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_learnings_task ON brain_learnings(task_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_learnings_reusable ON brain_learnings(reusable)`);
    await query(`ALTER TABLE brain_learnings ENABLE ROW LEVEL SECURITY`);
    console.log('  ✓ Table created with indexes and RLS');
  } catch (e) {
    console.error(`  ✗ brain_learnings: ${e.message}`);
  }

  // 8. Create brain_product_discoveries table
  console.log('\n8. Creating brain_product_discoveries table...');
  try {
    await query(`
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_product_disc_opp ON brain_product_discoveries(opportunity_id)`);
    await query(`
      CREATE OR REPLACE TRIGGER update_brain_product_disc_updated_at 
      BEFORE UPDATE ON brain_product_discoveries 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await query(`ALTER TABLE brain_product_discoveries ENABLE ROW LEVEL SECURITY`);
    console.log('  ✓ Table created with indexes and RLS');
  } catch (e) {
    console.error(`  ✗ brain_product_discoveries: ${e.message}`);
  }

  // 9. Create brain_content_strategies table
  console.log('\n9. Creating brain_content_strategies table...');
  try {
    await query(`
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_content_strat_opp ON brain_content_strategies(opportunity_id)`);
    await query(`ALTER TABLE brain_content_strategies ENABLE ROW LEVEL SECURITY`);
    console.log('  ✓ Table created with indexes and RLS');
  } catch (e) {
    console.error(`  ✗ brain_content_strategies: ${e.message}`);
  }

  // 10. Create brain_cost_decisions table
  console.log('\n10. Creating brain_cost_decisions table...');
  try {
    await query(`
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_brain_cost_operation ON brain_cost_decisions(operation)`);
    await query(`ALTER TABLE brain_cost_decisions ENABLE ROW LEVEL SECURITY`);
    console.log('  ✓ Table created with indexes and RLS');
  } catch (e) {
    console.error(`  ✗ brain_cost_decisions: ${e.message}`);
  }

  // 11. Verify all tables
  console.log('\n=== Verification ===\n');
  
  const verifyTables = [
    'brain_opportunities',
    'brain_strategies',
    'brain_execution_plans',
    'brain_approvals',
    'brain_learnings',
    'brain_product_discoveries',
    'brain_content_strategies',
    'brain_cost_decisions',
  ];
  
  for (const table of verifyTables) {
    try {
      const result = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.log(`\n=== ${table} ===`);
      if (result.rows.length === 0) {
        console.log('  TABLE NOT FOUND');
      } else {
        console.table(result.rows);
      }
    } catch (e) {
      console.error(`  Error checking ${table}: ${e.message}`);
    }
  }

  console.log('\n=== Migration Complete ===');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});