import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { getPool } from '../lib/db/client'

const migrationFile = process.argv[2] || '015_brain_initialization_and_runs.sql'
const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', migrationFile)

async function applyMigration() {
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')
  console.log(`Applying migration: ${migrationFile}`)
  console.log(`SQL length: ${sql.length} chars`)

  const pool = getPool()
  try {
    await pool.query('BEGIN')
    await pool.query(sql)
    await pool.query('COMMIT')
    console.log(`Migration ${migrationFile} applied successfully`)
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error(`Migration failed, rolled back:`, error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyMigration()
