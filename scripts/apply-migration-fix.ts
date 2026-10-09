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
    const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '002_article_traceability_fix.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration fix...');
    await pool.query(sql);
    console.log('Migration fix completed successfully!');
    
    // Verify the column type changed
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'articles' 
      AND column_name = 'automation_job_id'
    `);
    
    console.log('\nColumn type:');
    result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await pool.end();
  }
}

runMigration();