// Reverse the forced-initialized shortcut. Preserve historical evidence.
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

async function main() {
  const before = await pool.query('SELECT * FROM brain_initialization');
  console.log('BEFORE:', JSON.stringify(before.rows[0], null, 2));

  const realError = 'Real wake_up run 293eeea0-8106-4c38-afbf-7ab409896690 failed: all AI providers returned auth/balance/model errors (see brain_runs.results). This row was previously force-set to initialized by a script (data.fixedAt); that shortcut is reversed so a genuine Wake Up can run.';
  await pool.query(
    `UPDATE brain_initialization
        SET status = 'failed',
            error = $1,
            data = data || jsonb_build_object('revertedAt', $2::text, 'revertReason', $3::text)
      WHERE id = $4`,
    [
      realError,
      new Date().toISOString(),
      'forced-initialized shortcut reversed; real wake_up had failed; ready for genuine recovery',
      before.rows[0].id,
    ]
  );

  const after = await pool.query('SELECT id, status, error, data FROM brain_initialization');
  console.log('\nAFTER:', JSON.stringify(after.rows[0], null, 2));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });