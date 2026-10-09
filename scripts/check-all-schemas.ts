import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, connectionTimeoutMillis: 10000 });
  
  try {
    const tables = ['brain_opportunities', 'brain_strategies', 'brain_execution_plans', 'brain_approvals', 'brain_learnings'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.log(`\n${table} columns:`);
      result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}(${r.character_maximum_length || 'N/A'})`));
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();