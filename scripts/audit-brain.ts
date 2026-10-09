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
    // Check brain_quality_results
    const qr = await pool.query('SELECT * FROM brain_quality_results ORDER BY created_at DESC');
    console.log('BRAIN_QUALITY_RESULTS:');
    qr.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    // Check brain_execution_plans
    const ep = await pool.query('SELECT * FROM brain_execution_plans ORDER BY created_at DESC');
    console.log('\nBRAIN_EXECUTION_PLANS:');
    ep.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    // Check brain_opportunities
    const opp = await pool.query('SELECT * FROM brain_opportunities ORDER BY created_at DESC');
    console.log('\nBRAIN_OPPORTUNITIES:');
    opp.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    // Check brain_memories
    const mem = await pool.query('SELECT * FROM brain_memories ORDER BY created_at DESC LIMIT 5');
    console.log('\nBRAIN_MEMORIES:');
    mem.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    // Check brain_reports
    const rep = await pool.query('SELECT * FROM brain_reports ORDER BY created_at DESC LIMIT 5');
    console.log('\nBRAIN_REPORTS:');
    rep.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    // Check brain_observations
    const obs = await pool.query('SELECT * FROM brain_observations ORDER BY created_at DESC LIMIT 5');
    console.log('\nBRAIN_OBSERVATIONS:');
    obs.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
  } finally {
    await pool.end();
  }
}

audit().catch(console.error);