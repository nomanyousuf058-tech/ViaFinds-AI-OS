import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query("SELECT provenance, COUNT(*) FROM articles GROUP BY provenance")
  .then(r => console.log('Articles by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_opportunities GROUP BY provenance"))
  .then(r => console.log('Opportunities by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_strategies GROUP BY provenance"))
  .then(r => console.log('Strategies by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_tasks GROUP BY provenance"))
  .then(r => console.log('Tasks by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_execution_plans GROUP BY provenance"))
  .then(r => console.log('Execution plans by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_approvals GROUP BY provenance"))
  .then(r => console.log('Approvals by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_quality_results GROUP BY provenance"))
  .then(r => console.log('Quality results by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_verifications GROUP BY provenance"))
  .then(r => console.log('Verifications by provenance:', r.rows))
  .then(() => pool.query("SELECT provenance, COUNT(*) FROM brain_learnings GROUP BY provenance"))
  .then(r => console.log('Learnings by provenance:', r.rows))
  .finally(() => pool.end());