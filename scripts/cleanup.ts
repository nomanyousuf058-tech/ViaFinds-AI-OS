import { config } from 'dotenv';
config({ path: '.env.local' });
import { query } from '../lib/db/client';

async function cleanup() {
  console.log("=== STARTING CLEANUP ===");

  // 1. Archive any remaining mock articles
  const resArticles = await query(`
    UPDATE articles 
    SET status = 'archived' 
    WHERE (title ILIKE '%test%' OR title ILIKE '%mock%' OR slug ILIKE '%test%' OR slug ILIKE '%mock%')
      AND status != 'archived'
  `);
  console.log(`Archived ${resArticles.rowCount} mock articles.`);

  // 2. Archive jobs that failed or are stuck in test runs
  const resJobs = await query(`
    UPDATE automation_jobs
    SET status = 'archived'
    WHERE status IN ('failed', 'queued')
  `);
  console.log(`Archived ${resJobs.rowCount} stuck/failed jobs.`);

  // 3. Archive test opportunities
  const resOpps = await query(`
    UPDATE brain_opportunities
    SET status = 'archived'
    WHERE (provenance = 'TEST' OR title ILIKE '%test%' OR title ILIKE '%mock%') AND status != 'archived'
  `);
  console.log(`Archived ${resOpps.rowCount} test opportunities.`);

  // 4. Archive test strategies
  const resStrats = await query(`
    UPDATE brain_strategies
    SET status = 'archived'
    WHERE (provenance = 'TEST' OR title ILIKE '%test%') AND status != 'archived'
  `);
  console.log(`Archived ${resStrats.rowCount} test strategies.`);

  // 5. Quarantine all articles that are currently archived by giving them a mock provenance, or delete them if safe?
  // Wait, let's just make sure countAll ignores status='archived'.
  // But wait, the jobs are now archived.

  console.log("=== CLEANUP COMPLETE ===");
}

cleanup().catch(console.error).finally(() => process.exit(0));
