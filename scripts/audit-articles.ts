import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function audit() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Total articles
    const total = await pool.query('SELECT COUNT(*) as c FROM articles');
    console.log('ARTICLE_TOTAL:', total.rows[0].c);
    
    // Articles by status
    const byStatus = await pool.query('SELECT status, COUNT(*) as c FROM articles GROUP BY status');
    console.log('BY_STATUS:', JSON.stringify(byStatus.rows));
    
    // Sample articles with all fields - check content for affiliate info
    const sample = await pool.query(`
      SELECT id, title, slug, status, article_type, cover_image_url,
             published_at, created_at, reading_time,
             content
      FROM articles 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    console.log('\nSAMPLE_ARTICLES:');
    sample.rows.forEach(r => {
      const cta = r.content?.find?.((b: any) => b.type === 'cta');
      console.log({
        id: r.id,
        title: r.title,
        slug: r.slug,
        status: r.status,
        article_type: r.article_type,
        cta: cta ? { url: cta.url, label: cta.label, partner: cta.partnerLabel } : null,
        created_at: r.created_at
      });
    });
    
    // Check brain_tasks table
    const brainTasks = await pool.query('SELECT COUNT(*) as c FROM brain_tasks');
    console.log('\nBRAIN_TASKS_TOTAL:', brainTasks.rows[0].c);
    
    const brainTasksSample = await pool.query('SELECT * FROM brain_tasks ORDER BY created_at DESC LIMIT 10');
    console.log('BRAIN_TASKS_SAMPLE:');
    brainTasksSample.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    // Check automation_jobs table (if exists)
    const autoJobsCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'automation_jobs'
    `);
    if (autoJobsCheck.rows.length > 0) {
      const autoJobs = await pool.query('SELECT COUNT(*) as c FROM automation_jobs');
      console.log('\nAUTOMATION_JOBS_TOTAL:', autoJobs.rows[0].c);
      
      const autoJobsSample = await pool.query('SELECT * FROM automation_jobs ORDER BY created_at DESC LIMIT 5');
      console.log('AUTOMATION_JOBS_SAMPLE:');
      autoJobsSample.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    } else {
      console.log('\nAUTOMATION_JOBS TABLE: DOES NOT EXIST');
    }
    
    // Check brain_approvals
    const approvalsCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'brain_approvals'
    `);
    if (approvalsCheck.rows.length > 0) {
      const approvals = await pool.query('SELECT COUNT(*) as c FROM brain_approvals');
      console.log('\nBRAIN_APPROVALS_TOTAL:', approvals.rows[0].c);
    }
    
    // Check brain_strategies
    const stratCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'brain_strategies'
    `);
    if (stratCheck.rows.length > 0) {
      const strat = await pool.query('SELECT COUNT(*) as c FROM brain_strategies');
      console.log('BRAIN_STRATEGIES_TOTAL:', strat.rows[0].c);
    }
    
    // Check brain_opportunities
    const oppCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'brain_opportunities'
    `);
    if (oppCheck.rows.length > 0) {
      const opp = await pool.query('SELECT COUNT(*) as c FROM brain_opportunities');
      console.log('BRAIN_OPPORTUNITIES_TOTAL:', opp.rows[0].c);
    }
    
    // Check brain_quality_results
    const qrCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'brain_quality_results'
    `);
    if (qrCheck.rows.length > 0) {
      const qr = await pool.query('SELECT COUNT(*) as c FROM brain_quality_results');
      console.log('BRAIN_QUALITY_RESULTS_TOTAL:', qr.rows[0].c);
    }
    
    // Check brain_learnings
    const lrCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'brain_learnings'
    `);
    if (lrCheck.rows.length > 0) {
      const lr = await pool.query('SELECT COUNT(*) as c FROM brain_learnings');
      console.log('BRAIN_LEARNINGS_TOTAL:', lr.rows[0].c);
    }
    
    // Check brain_execution_plans
    const epCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'brain_execution_plans'
    `);
    if (epCheck.rows.length > 0) {
      const ep = await pool.query('SELECT COUNT(*) as c FROM brain_execution_plans');
      console.log('BRAIN_EXECUTION_PLANS_TOTAL:', ep.rows[0].c);
    }
    
  } finally {
    await pool.end();
  }
}

audit().catch(console.error);