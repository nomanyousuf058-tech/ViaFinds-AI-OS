import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, connectionTimeoutMillis: 10000 });
  
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'brain_opportunities'
      ORDER BY ordinal_position
    `);
    console.log('brain_opportunities columns:');
    result.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();