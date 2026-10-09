import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, connectionTimeoutMillis: 10000 });
  
  try {
    const tables = ['brain_opportunities', 'brain_strategies', 'brain_execution_plans', 'brain_approvals', 'brain_learnings', 'brain_tasks', 'brain_product_discoveries', 'brain_content_strategies'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${result.rows[0].count}`);
      } catch (e) {
        console.log(`${table}: ERROR - ${e.message}`);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();