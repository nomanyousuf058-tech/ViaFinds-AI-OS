import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'brain_%' ORDER BY table_name")
  .then(r => {
    const tables = r.rows.map(x => x.table_name);
    Promise.all(tables.map(t => 
      pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [t])
        .then(c => console.log(t + ':', c.rows.map(x => x.column_name).join(', ')))
        .catch(e => console.log(t + ': ERROR', e.message))
    )).then(() => pool.end());
  });