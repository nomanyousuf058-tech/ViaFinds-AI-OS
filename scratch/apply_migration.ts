import { getPool } from '../lib/db/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() { 
  try {
    const p = getPool(); 
    await p.query('ALTER TABLE brain_decisions ADD CONSTRAINT brain_decisions_type_title_rationale_key UNIQUE (type, title, rationale);');
    console.log('Applied migration to DB'); 
  } catch(e) {
    console.log(e);
  }
  process.exit(0); 
} 
run();
