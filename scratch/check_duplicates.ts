import { getPool } from '../lib/db/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const p = getPool()
  const res = await p.query('SELECT rationale, title, type, COUNT(*) FROM brain_decisions GROUP BY rationale, title, type HAVING COUNT(*) > 1')
  console.log('Duplicates:', res.rows)
  const all = await p.query('SELECT COUNT(*) FROM brain_decisions')
  console.log('Total rows:', all.rows[0].count)
  process.exit(0)
}
run()
