const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const q = "SELECT id, idempotency_key, type, stage, content_type, content_id, status, provider, model, retry_count, created_at, completed_at, error FROM automation_jobs WHERE input::text LIKE '%75ab6ab6%' OR input::text LIKE '%saas-launchpad%' OR input::text LIKE '%894321%' OR result::text LIKE '%894321%'";
  const jobs = (await pool.query(q)).rows;
  console.log('automation_jobs: ' + jobs.length);
  jobs.forEach(j => console.log(JSON.stringify({ id: j.id.slice(0,8), idempotency_key: j.idempotency_key, type: j.type, stage: j.stage, content_type: j.content_type, content_id: j.content_id, status: j.status, provider: j.provider, model: j.model, retry_count: j.retry_count, created_at: j.created_at, completed_at: j.completed_at, error: (j.error||'').slice(0,120) })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });