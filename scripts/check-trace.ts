import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { getPool } from '../lib/db/client'

async function checkTrace() {
  const pool = getPool()
  try {
    const res = await pool.query(`SELECT id, status, correlation_id FROM brain_execution_plans WHERE id = '2c2b1ab5-9571-470c-acda-968f51fc7165'`)
    console.log(res.rows)
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

checkTrace()
