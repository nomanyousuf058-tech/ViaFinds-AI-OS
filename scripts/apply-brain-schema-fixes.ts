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
    const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '003_brain_schema_fixes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running brain schema fixes migration...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name IN ('brain_opportunities', 'brain_execution_plans', 'brain_learnings', 'brain_approvals')
      AND (character_maximum_length IS NULL OR character_maximum_length > 255)
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('\nUpdated columns:');
    result.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name}: ${r.data_type}(${r.character_maximum_length || 'N/A'})`));
    
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await pool.end();
  }
}

runMigration();