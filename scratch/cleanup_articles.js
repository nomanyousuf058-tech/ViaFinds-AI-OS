const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

function classify(row) {
  let s;
  try { s = JSON.stringify(row.content || '').toLowerCase(); } catch { s = String(row.content || '').toLowerCase(); }
  const t = (row.title || '').toLowerCase();
  const isStub = !row.content || s.length < 30 || s.includes('content generation could not be completed') || s.includes('no ai provider') || s.includes('editorial note') || s === '[]' || s === '{}' || s === '""';
  const isTest = /\b(test|qa|playwright|dummy|mock|fixture)\b/.test(t) || s.includes('this is a test') || s.includes('test content') || s.includes('placeholder text') || s.includes('lorem ipsum');
  const hasCta = s.includes('"type":"cta"') || s.includes('"/go/') || s.includes('digistore24') || s.includes('check official website');
  const hasBody = s.includes('"type":"paragraph"') || s.includes('"type":"heading"') || s.includes('"type":"bullet-list"');
  if (isTest) return 'TEST';
  if (isStub) return 'STUB';
  if (hasBody && (hasCta || s.length > 500)) return 'REAL';
  return 'AMBIGUOUS';
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const all = (await client.query('SELECT id, title, slug, provenance, content FROM articles')).rows;
    const groups = { TEST: [], STUB: [], AMBIGUOUS: [], REAL: [] };
    all.forEach(row => groups[classify(row)].push(row));
    console.log('Classification:', JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v]) => [k, v.length]))));
    const toDelete = [...groups.TEST, ...groups.STUB, ...groups.AMBIGUOUS];
    const preserved = groups.REAL;
    const trackedUrls = new Set((await client.query('SELECT destination_url FROM affiliate_links')).rows.map(r => r.destination_url));
    const trackedArticleIds = new Set((await client.query('SELECT article_id FROM affiliate_links WHERE article_id IS NOT NULL')).rows.map(r => r.article_id));
    for (const row of toDelete) {
      if (row.provenance === 'REAL') throw new Error('SAFETY FAIL: would delete REAL-provenance article: ' + row.id);
      if (trackedArticleIds.has(row.id)) throw new Error('SAFETY FAIL: article is referenced by a tracked affiliate_link: ' + row.id);
      const s = JSON.stringify(row.content || '').toLowerCase();
      for (const u of trackedUrls) { if (s.includes(u.toLowerCase())) throw new Error('SAFETY FAIL: article content references a tracked affiliate_link: ' + row.id); }
    }
    for (const row of toDelete) {
      await client.query('INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at) VALUES ($1,$2,$3,$4,NOW())', ['cms_article_quarantined', 'articles', row.id, JSON.stringify({ reason: 'test/failed-generation artifact removed from production CMS', title: row.title, slug: row.slug, priorProvenance: row.provenance, deletedAt: new Date().toISOString(), deletedBy: 'kilo-production-cleanup' })]);
    }
    let deleted = 0;
    for (const row of toDelete) { const r = await client.query('DELETE FROM articles WHERE id = $1', [row.id]); deleted += r.rowCount; }
    await client.query('COMMIT');
    console.log('Deleted ' + deleted + ' articles; preserved ' + preserved.length + ' REAL; audit entries ' + toDelete.length);
  } catch (e) { await client.query('ROLLBACK'); console.error('CLEANUP FAILED, rolled back:', e.message); process.exit(1); } finally { client.release(); }
  const total = (await pool.query('SELECT COUNT(*)::int AS n FROM articles')).rows[0].n;
  const remaining = (await pool.query('SELECT provenance, COUNT(*)::int AS n FROM articles GROUP BY provenance ORDER BY provenance')).rows;
  console.log('AFTER: total articles = ' + total);
  console.log('provenance breakdown:', JSON.stringify(remaining));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });