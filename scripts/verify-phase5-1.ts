import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { getPool } from '../lib/db/client'

async function checkDatabase() {
  const pool = getPool()
  try {
    const res = await pool.query('SELECT count(*) as count FROM brain_business_snapshots')
    console.log('brain_business_snapshots count:', res.rows[0].count)

    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('brain_business_snapshots', 'brain_decisions', 'brain_experiments')
    `)
    console.log('Phase 5 tables found:', tableRes.rows.map((r: any) => r.table_name))

    const traceRes = await pool.query(`
      SELECT id, status FROM brain_execution_plans 
      WHERE correlation_id = 'brain-1790447262653-f54bldd'
    `)
    console.log('Phase 4.2 trace execution plan:', traceRes.rows)
  } catch (e) {
    console.error('Error:', e)
  } finally {
    process.exit(0)
  }
}

checkDatabase()
