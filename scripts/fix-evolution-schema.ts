import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    await pool.query(`
      ALTER TABLE brain_strategy_evolution 
      ALTER COLUMN current_strategy DROP NOT NULL,
      ALTER COLUMN new_evidence DROP NOT NULL,
      ALTER COLUMN observed_outcomes DROP NOT NULL,
      ALTER COLUMN real_learnings DROP NOT NULL,
      ALTER COLUMN market_signals DROP NOT NULL,
      ALTER COLUMN content_performance DROP NOT NULL,
      ALTER COLUMN proposal DROP NOT NULL,
      ALTER COLUMN rationale DROP NOT NULL;
    `)
    console.log('Successfully dropped NOT NULL constraints on legacy columns.')
  } catch (e) {
    console.error('Error dropping constraints:', e)
  }

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
