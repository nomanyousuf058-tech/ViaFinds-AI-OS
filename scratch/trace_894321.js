const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const art = (await pool.query("SELECT id, title, slug, status, provenance, created_at, product_id, affiliate_url FROM articles WHERE affiliate_url LIKE '%894321%' OR content::text LIKE '%894321%'")).rows;
  console.log('Articles with 894321: ' + art.length);
  art.forEach(a => console.log(JSON.stringify({ id: a.id, title: (a.title||'').slice(0,70), slug: a.slug, status: a.status, provenance: a.provenance, created_at: a.created_at, product_id: a.product_id, affiliate_url: a.affiliate_url })));
  const links = (await pool.query("SELECT * FROM affiliate_links WHERE destination_url LIKE '%894321%'")).rows;
  console.log('affiliate_links with 894321: ' + links.length);
  links.forEach(l => console.log(JSON.stringify(l)));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });