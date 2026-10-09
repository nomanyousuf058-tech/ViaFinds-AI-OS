const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function main() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='brain_opportunities' ORDER BY ordinal_position");
  console.log('columns:', cols.rows.map(r => r.column_name).join(', '));
  const all = await pool.query('SELECT * FROM brain_opportunities ORDER BY provenance, created_at DESC');
  console.log('total: ' + all.rows.length);
  const counts = {};
  all.rows.forEach(r => { counts[r.provenance] = (counts[r.provenance]||0)+1; });
  console.log('provenance:', JSON.stringify(counts));
  console.log('\n=== UNKNOWN ===');
  all.rows.filter(r => r.provenance === 'UNKNOWN').forEach(r => console.log(JSON.stringify({
    id: r.id.slice(0,8), title: (r.title||'').slice(0,70), status: r.status, provenance: r.provenance,
    category: r.category, confidence: r.confidence, created_at: r.created_at,
    brain_reasoning: (r.brain_reasoning||'').slice(0,150)
  })));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });