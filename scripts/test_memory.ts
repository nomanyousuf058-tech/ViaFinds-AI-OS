import { config } from 'dotenv'
config({ path: '.env.local' })
import { getPool } from '../lib/db/client'

async function checkMemory() {
  const pool = getPool()
  try {
    const r = await pool.query("SELECT * FROM brain_memories WHERE context_type='execution_started' ORDER BY created_at DESC LIMIT 5")
    if (r.rowCount === 0) {
      console.log('FAIL: No memories found for execution_started')
      process.exit(1)
    }
    console.log('PASS: Found execution_started memories')
    r.rows.forEach(row => {
      console.log(`- Memory ID: ${row.id}`)
      console.log(`  Importance: ${row.importance}`)
      console.log(`  Data:`, row.data)
    })
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

checkMemory()
