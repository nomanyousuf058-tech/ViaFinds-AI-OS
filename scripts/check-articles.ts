import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Check articles table
    const result = await pool.query(`
      SELECT 
        id, title, slug, status, brain_task_id, automation_job_id, 
        strategy_id, opportunity_id, affiliate_url, created_at
      FROM articles
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('Recent articles:');
    result.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();