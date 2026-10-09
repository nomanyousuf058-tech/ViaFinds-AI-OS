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
  const r = await pool.query('SELECT id, title, slug, status, provenance, published_at, content FROM articles ORDER BY created_at DESC');
  const counts = {}, groups = {};
  r.rows.forEach(row => { const c = classify(row); counts[c] = (counts[c]||0)+1; (groups[c]=groups[c]||[]).push(row); });
  console.log('CLASSIFICATION:', JSON.stringify(counts));
  for (const k of Object.keys(groups)) {
    console.log('\n=== ' + k + ' (' + groups[k].length + ') ===');
    groups[k].forEach(row => console.log(JSON.stringify({ id: row.id.slice(0,8), title: (row.title||'').slice(0,55), provenance: row.provenance, len: JSON.stringify(row.content||'').length })));
  }
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });