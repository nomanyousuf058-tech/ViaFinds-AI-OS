const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const rows = (await pool.query("SELECT id, title, slug, content FROM articles WHERE id IN ('435a00a1-a4fd-4422-941c-e6a2ba53d819','a71ea0e8-03cd-461b-bfc9-9b00b77a1c3e','1a649775-b665-46d9-a9c3-db632ba7dc81','1966beef-d2f2-4a27-9552-4c4a480fa0d3','a87269ce-9cac-4c93-ae9a-56322fd64dbb','328d5530-27a3-427c-a691-2c323e1d5df4','88ab81b1-2c0e-4f32-a17a-c315b7293e91')")).rows;
  rows.forEach(r => {
    const c = JSON.stringify(r.content || '');
    const hasCta = c.includes('"type":"cta"');
    const hasGo = c.includes('"/go/');
    const hasDigistore = c.includes('digistore24');
    console.log('--- ' + r.title + ' (' + r.id.slice(0,8) + ') len=' + c.length + ' cta=' + hasCta + ' go=' + hasGo + ' digistore=' + hasDigistore);
    console.log(c.slice(0, 700));
    console.log('');
  });
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });