import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  console.log('DATABASE_URL:', databaseUrl);
  
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    console.log('Parsed:', {
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      username: url.username,
      password: url.password,
      passwordLength: url.password?.length
    });
  }
  
  // Try direct connection
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false
  });
  
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('Direct connection test:', result.rows);
  } catch (e) {
    console.error('Direct connection failed:', e);
  }
}

main();