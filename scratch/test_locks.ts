import { getPool } from '../lib/db/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkLocks() {
  const p = getPool()
  try {
    const res = await p.query(`
      SELECT pid, statement_timestamp() - query_start as duration, query, state
      FROM pg_stat_activity
      WHERE state != 'idle' AND pid <> pg_backend_pid();
    `)
    console.log('ACTIVE QUERIES:', res.rows)
  } catch (e) {
    console.error('ERROR:', e)
  }
  process.exit(0)
}

checkLocks()
