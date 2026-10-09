import { getPool } from '../lib/db/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkLiveness() {
  const p = getPool()
  try {
    const res = await p.query('SELECT 1 as alive')
    console.log('LIVENESS:', res.rows)
  } catch (e) {
    console.error('ERROR:', e)
  }
  process.exit(0)
}

checkLiveness()
