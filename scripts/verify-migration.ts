import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function verify() {
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
    
    // Articles with brain_task_id
    const brainTask = await pool.query('SELECT COUNT(*) as c FROM articles WHERE brain_task_id IS NOT NULL');
    console.log('WITH_BRAIN_TASK_ID:', brainTask.rows[0].c);
    
    // Articles with automation_job_id
    const autoJob = await pool.query('SELECT COUNT(*) as c FROM articles WHERE automation_job_id IS NOT NULL');
    console.log('WITH_AUTOMATION_JOB_ID:', autoJob.rows[0].c);
    
    // Articles with strategy_id
    const strat = await pool.query('SELECT COUNT(*) as c FROM articles WHERE strategy_id IS NOT NULL');
    console.log('WITH_STRATEGY_ID:', strat.rows[0].c);
    
    // Articles with opportunity_id
    const opp = await pool.query('SELECT COUNT(*) as c FROM articles WHERE opportunity_id IS NOT NULL');
    console.log('WITH_OPPORTUNITY_ID:', opp.rows[0].c);
    
    // Articles with affiliate_url
    const aff = await pool.query('SELECT COUNT(*) as c FROM articles WHERE affiliate_url IS NOT NULL AND affiliate_url != \'\'');
    console.log('WITH_AFFILIATE_URL:', aff.rows[0].c);
    
    // Sample articles
    const sample = await pool.query(`
      SELECT id, title, slug, status, brain_task_id, automation_job_id, strategy_id, opportunity_id, affiliate_url
      FROM articles 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('\nSAMPLE_ARTICLES:');
    sample.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
  } finally {
    await pool.end();
  }
}

verify().catch(console.error);