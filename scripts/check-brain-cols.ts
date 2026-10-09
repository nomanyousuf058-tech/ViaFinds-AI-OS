import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'brain_%' ORDER BY table_name`)
  .then(r => {
    r.rows.forEach(table => {
      pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table.table_name])
        .then(c => console.log(`${table.table_name}:`, c.rows.map(x => x.column_name).join(', ')))
        .catch(e => console.log(`${table.table_name}: ERROR`, e.message));
    });
  })
  .finally(() => pool.end());