import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, connectionTimeoutMillis: 10000 });
  
  try {
    // Check brain_opportunities
    const result = await pool.query(`SELECT id, title, category, status, strategy_id, created_at FROM brain_opportunities ORDER BY created_at DESC`);
    console.log('brain_opportunities:');
    result.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    console.log('\n---');
    
    // Check brain_execution_plans
    const result2 = await pool.query(`SELECT id, opportunity_id, strategy_id, objective, status, correlation_id, created_at FROM brain_execution_plans ORDER BY created_at DESC`);
    console.log('brain_execution_plans:');
    result2.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
    console.log('\n---');
    
    // Check brain_tasks
    const result3 = await pool.query(`SELECT id, type, title, status, strategy_id, opportunity_id, approval_state, created_at FROM brain_tasks ORDER BY created_at DESC LIMIT 10`);
    console.log('brain_tasks (latest 10):');
    result3.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();