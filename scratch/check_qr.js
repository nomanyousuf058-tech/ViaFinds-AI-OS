const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const qr = (await pool.query("SELECT id, target_id, target_type, overall_status, score, provenance, created_at FROM brain_quality_results WHERE execution_plan_id IN (SELECT id FROM brain_execution_plans WHERE id::text LIKE 'e827ccf4%')")).rows;
  console.log('quality_results on e827ccf4: ' + qr.length);
  qr.forEach(q => console.log(JSON.stringify({ id: q.id.slice(0,8), target_id: q.target_id, target_type: q.target_type, overall_status: q.overall_status, score: q.score, provenance: q.provenance, created_at: q.created_at })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });