// Verify the archived automation_jobs: why archived, source, related entities
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

function s(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

async function main() {
  const archived = await pool.query("SELECT * FROM automation_jobs WHERE status = 'archived' ORDER BY created_at DESC");
  console.log('Archived jobs: ' + archived.rowCount);
  archived.rows.forEach(r => console.log(JSON.stringify({
    id: r.id, idempotency_key: r.idempotency_key, type: r.type, stage: r.stage,
    content_type: r.content_type, content_id: r.content_id, status: r.status,
    provider: r.provider, model: r.model, retry_count: r.retry_count,
    created_at: r.created_at, updated_at: r.updated_at,
    input: s(r.input).slice(0, 100), result: s(r.result).slice(0, 120),
  })));

  const active = await pool.query("SELECT status, COUNT(*)::int AS n FROM automation_jobs GROUP BY status ORDER BY status");
  console.log('\nautomation_jobs status counts:', JSON.stringify(active.rows));

  // Are archived jobs linked to real content/revenue?
  const links = await pool.query(`
    SELECT aj.id, aj.idempotency_key, aj.content_id, aj.content_type,
           a.id AS article_id, a.status AS article_status
    FROM automation_jobs aj
    LEFT JOIN articles a ON a.id = aj.content_id
    WHERE aj.status = 'archived' AND aj.content_id IS NOT NULL
    LIMIT 10
  `);
  console.log('\nArchived jobs linked to content:', links.rowCount);
  links.rows.forEach(r => console.log(JSON.stringify(r)));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });