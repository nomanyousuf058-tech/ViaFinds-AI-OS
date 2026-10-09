import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const p = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const cols = await p.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'brain_opportunities' AND column_name IN ('assumptions', 'evidence_classification', 'source_ids', 'research_ids', 'evidence') ORDER BY ordinal_position"
    );
    console.log('Column types:');
    for (const c of cols.rows) {
      console.log('  ' + c.column_name + ': ' + c.data_type + ' (' + c.is_nullable + ')');
    }
  } catch (e) {
    console.error('ERROR:', (e as Error).message);
  }
  await p.end();
})();