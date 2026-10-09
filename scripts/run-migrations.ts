import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { runMigrations } from '../lib/db/migrate'

async function migrateNow() {
  console.log('Running canonical migrations...')
  const result = await runMigrations()
  console.log(result)
  process.exit(0)
}

migrateNow()
