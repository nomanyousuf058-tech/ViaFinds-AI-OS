import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  const r1 = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'brain_strategies' ORDER BY ordinal_position`
  )
  console.log('=== brain_strategies columns ===')
  r1.rows.forEach((r: any) => console.log(`  ${r.column_name} (${r.data_type})`))

  const r2 = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'brain_strategy_evolution' ORDER BY ordinal_position`
  )
  console.log('\n=== brain_strategy_evolution columns ===')
  r2.rows.forEach((r: any) => console.log(`  ${r.column_name} (${r.data_type})`))

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
