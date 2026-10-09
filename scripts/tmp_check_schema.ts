import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const p = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const cols = await p.query(
      "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'brain_opportunities' ORDER BY ordinal_position"
    );
    console.log('brain_opportunities columns:');
    for (const c of cols.rows) {
      console.log('  ' + c.column_name + ' (' + c.is_nullable + ')');
    }
    console.log('\nbrain_strategies columns:');
    const cols2 = await p.query(
      "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'brain_strategies' ORDER BY ordinal_position"
    );
    for (const c of cols2.rows) {
      console.log('  ' + c.column_name + ' (' + c.is_nullable + ')');
    }
  } catch (e) {
    console.error('ERROR:', (e as Error).message.slice(0, 300));
  }
  await p.end();
})();