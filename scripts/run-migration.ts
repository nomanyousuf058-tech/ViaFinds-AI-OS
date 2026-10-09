import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '001_article_traceability.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
    
    // Verify the columns exist
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'articles' 
      AND column_name IN ('brain_task_id', 'automation_job_id', 'strategy_id', 'opportunity_id', 'affiliate_url')
      ORDER BY ordinal_position
    `);
    
    console.log('\nNew columns:');
    result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Verify indexes
    const idxResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'articles' 
      AND indexname IN ('idx_articles_brain_task', 'idx_articles_automation_job', 'idx_articles_strategy', 'idx_articles_opportunity')
    `);
    
    console.log('\nNew indexes:');
    idxResult.rows.forEach(r => console.log(`  ${r.indexname}`));
    
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await pool.end();
  }
}

runMigration();