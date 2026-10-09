import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const r = await pool.query(`SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS def FROM pg_trigger WHERE tgrelid = 'articles'::regclass AND NOT tgisinternal`);
  for (const t of r.rows) console.log(`${t.tgname} enabled=${t.tgenabled}\n  ${t.def}\n`);
  await pool.end();
})();
