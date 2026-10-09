const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const total = (await pool.query('SELECT COUNT(*)::int AS n FROM articles')).rows[0].n;
  const archived = (await pool.query("SELECT COUNT(*)::int AS n FROM articles WHERE status='archived'")).rows[0].n;
  const published = (await pool.query("SELECT COUNT(*)::int AS n FROM articles WHERE status='published'")).rows[0].n;
  const draft = (await pool.query("SELECT COUNT(*)::int AS n FROM articles WHERE status='draft'")).rows[0].n;
  console.log('TOTAL=' + total + ' ARCHIVED=' + archived + ' PUBLISHED=' + published + ' DRAFT=' + draft);
  const statuses = (await pool.query('SELECT status, COUNT(*)::int AS n FROM articles GROUP BY status ORDER BY status')).rows;
  console.log('status counts:', JSON.stringify(statuses));
  const test = (await pool.query("SELECT id, title, slug, status, provenance, published_at, content FROM articles WHERE provenance='TEST' OR title ILIKE '%test%' OR title ILIKE '%playwright%' OR title ILIKE '%browser qa%' OR title ILIKE '%qa test%' ORDER BY created_at")).rows;
  console.log('\n=== TEST articles (' + test.length + ') ===');
  test.forEach(r => console.log(JSON.stringify({ id: r.id, title: r.title, slug: r.slug, status: r.status, provenance: r.provenance, content: (r.content||'').slice(0,120) })));
  const unknown = (await pool.query("SELECT id, title, slug, status, provenance, published_at FROM articles WHERE status='archived' AND provenance='UNKNOWN' ORDER BY created_at DESC")).rows;
  console.log('\n=== UNKNOWN articles (' + unknown.length + ') ===');
  unknown.forEach(r => console.log(JSON.stringify({ id: r.id, title: (r.title||'').slice(0,60), slug: (r.slug||'').slice(0,40), provenance: r.provenance, published_at: r.published_at })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });