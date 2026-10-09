const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const a = (await pool.query("SELECT id, title, cover_image_url, status FROM articles WHERE id = '75ab6ab6-9a92-4e76-9c40-ec28c1fa1528'")).rows[0];
  console.log('ARTICLE cover_image_url:', a.cover_image_url);
  console.log('  is placeholder:', /placehold\.co/i.test(a.cover_image_url || ''));
  const imgs = (await pool.query("SELECT COUNT(*)::int AS total, COUNT(CASE WHEN cover_image_url LIKE '%placehold%' THEN 1 END) AS placeholder, COUNT(CASE WHEN cover_image_url IS NULL THEN 1 END) AS null_count FROM articles WHERE status='published'")).rows[0];
  console.log('Published image status:', JSON.stringify(imgs));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });