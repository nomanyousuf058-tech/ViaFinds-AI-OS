const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const dups = (await pool.query(`SELECT slug, COUNT(*)::int AS n FROM articles WHERE slug IS NOT NULL AND slug <> '' GROUP BY slug HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 15`)).rows;
  console.log('=== Duplicate slugs ===');
  dups.forEach(d => console.log(JSON.stringify(d)));
  const amb = (await pool.query("SELECT id, title, slug, content FROM articles WHERE id IN ('328d5530-27a3-427c-a691-2c323e1d5df4','88ab81b1-2c0e-4f32-a17a-c315b7293e91')")).rows;
  console.log('\n=== AMBIGUOUS detail ===');
  amb.forEach(r => console.log(JSON.stringify({ id: r.id.slice(0,8), title: r.title, slug: r.slug, content: (JSON.stringify(r.content||'')).slice(0,400) })));
  const stubs = (await pool.query("SELECT id, title, slug, content FROM articles WHERE id IN ('a71ea0e8-03cd-461b-bfc9-9b00b77a1c3e','1a649775-b665-46d9-a9c3-db632ba7dc81','1966beef-d2f2-4a27-9552-4c4a480fa0d3','435a00a1-a4fd-4422-941c-e6a2ba53d819','a87269ce-9cac-4c93-ae9a-56322fd64dbb')")).rows;
  console.log('\n=== STUB detail ===');
  stubs.forEach(r => console.log(JSON.stringify({ id: r.id.slice(0,8), title: r.title, slug: r.slug, content: (JSON.stringify(r.content||'')).slice(0,300) })));
  const affCount = (await pool.query("SELECT COUNT(*)::int AS n FROM affiliate_links")).rows[0].n;
  const convCount = (await pool.query("SELECT COUNT(*)::int AS n FROM affiliate_conversions")).rows[0].n;
  const clickCount = (await pool.query("SELECT COUNT(*)::int AS n FROM affiliate_clicks")).rows[0].n;
  console.log('\naffiliate_links=' + affCount.n + ' affiliate_clicks=' + clickCount.n + ' affiliate_conversions=' + convCount.n);
  const noUrl = (await pool.query("SELECT COUNT(*)::int AS n FROM articles WHERE affiliate_url IS NULL OR affiliate_url = ''")).rows[0];
  console.log('articles with no affiliate_url:', noUrl.n);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });