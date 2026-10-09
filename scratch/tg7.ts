import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`SELECT indexdef FROM pg_indexes WHERE indexname = "idx_brain_strategies_single_active"`)
  console.log(r.rows[0]?.indexdef)
}
run().catch(e => { console.error(e); process.exit(1) })
