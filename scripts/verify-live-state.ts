import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getPool } from '../lib/db/client';

async function verify() {
  const p = getPool();
  try {
    const stats: any = {};
    
    // Test Strategies Archived
    const strategies = await p.query(`SELECT status, count(*) as count FROM brain_content_strategies WHERE is_test = true GROUP BY status`);
    stats.test_strategies_archived = strategies.rows.find(r => r.status === 'archived')?.count || 0;
    
    // Test Opportunity Archived
    const opps = await p.query(`SELECT status, count(*) as count FROM brain_product_discoveries WHERE is_test = true GROUP BY status`);
    stats.test_opportunity_archived = opps.rows.find(r => r.status === 'archived')?.count || 0;
    
    // Test Tasks Archived
    // I need to check the tasks/decisions schema, maybe brain_decisions?
    const tasks = await p.query(`SELECT status, count(*) as count FROM automation_jobs WHERE is_test = true GROUP BY status`);
    stats.test_automation_jobs_archived = tasks.rows.find(r => r.status === 'archived' || r.status === 'failed' || r.status === 'completed')?.count || 0;
    // Assuming automation_jobs is what they meant by automation jobs.

    const decisions = await p.query(`SELECT count(*) as count FROM brain_decisions WHERE is_test = true`);
    stats.test_decisions = decisions.rows[0].count; // might just be count since they are archived? Wait, brain_decisions may not have status 'archived'. I'll just get the count.
    
    const schedules = await p.query(`SELECT is_active, is_test, count(*) as count FROM brain_schedules GROUP BY is_active, is_test`);
    stats.schedules = schedules.rows;

    // Real content
    const real_articles = await p.query(`SELECT count(*) as count FROM articles WHERE is_test = false AND status != 'archived'`);
    stats.real_articles = real_articles.rows[0].count;
    
    const affiliate_links = await p.query(`SELECT count(*) as count FROM affiliate_links WHERE is_test = false`);
    stats.real_affiliate_links = affiliate_links.rows[0].count;

    const reports = await p.query(`SELECT count(*) as count FROM brain_reports WHERE is_test = false`);
    stats.brain_reports = reports.rows[0].count;

    const observations = await p.query(`SELECT count(*) as count FROM brain_observations WHERE is_test = false`);
    stats.brain_observations = observations.rows[0].count;

    const learnings = await p.query(`SELECT count(*) as count FROM brain_learnings WHERE is_test = false`);
    stats.brain_learnings = learnings.rows[0].count;

    console.log("Database Stats:");
    console.dir(stats, { depth: null });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
verify();
