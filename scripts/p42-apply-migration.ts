import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const MIGRATION = '005_phase_4_2_production_loop.sql';

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    connectionTimeoutMillis: 15000,
  });

  const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', MIGRATION);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await pool.query(sql);
    console.log(`OK: applied ${MIGRATION}`);

    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_name IN ('brain_research_runs','brain_sources')
        ORDER BY table_name`
    );
    console.log('tables:', tables.rows.map(r => r.table_name).join(', '));

    const cols = await pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema='public'
          AND (
            (table_name='brain_opportunities' AND column_name IN ('correlation_id','research_id','source_ids','assumptions','evidence_classification'))
         OR (table_name='brain_strategies'    AND column_name IN ('correlation_id','content_approach','execution_requirements','source_ids'))
         OR (table_name='brain_execution_plans' AND column_name IN ('approval_required','target_automation','idempotency_key','brain_task_id'))
         OR (table_name='brain_tasks'        AND column_name IN ('execution_plan_id','approval_id','correlation_id','idempotency_key','claimed_at','claim_token','claimed_by','started_at'))
         OR (table_name='brain_approvals'    AND column_name IN ('status','correlation_id','required_permission','consumed_at','consumed_by_task','target_automation','decided_by_user_id'))
         OR (table_name='brain_quality_results' AND column_name IN ('article_id','brain_task_id','automation_job_id','score','warnings','failures','published','publication_blocked_reason'))
         OR (table_name='brain_verifications' AND column_name IN ('article_id','correlation_id','expected_conditions','available_observations','limitations','verified_at'))
         OR (table_name='brain_learnings'    AND column_name IN ('source_event','confidence','reusability','article_id','opportunity_id'))
          )
        ORDER BY table_name, column_name`
    );
    console.log(`columns added/verified: ${cols.rows.length}`);
    for (const r of cols.rows) console.log(`  ${r.table_name}.${r.column_name}`);

    const triggers = await pool.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger
        WHERE tgname IN ('block_publication_quality_gate_trigger','protect_article_traceability_trigger')`
    );
    console.log('triggers:', triggers.rows.map(r => r.tgname).join(', '));
  } catch (e) {
    console.error('MIGRATION FAILED:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
