import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`SELECT conname, pg_get_constraintdef(oid, true) AS def FROM pg_constraint WHERE conname = 'chk_brain_strategies_status'`)
  console.log(r.rows[0]?.def)
  const s = await pool.query(`SELECT status, count(*) FROM brain_strategies GROUP BY status`)
  s.rows.forEach(x => console.log(x.status, x.count))
}
run().catch(e => { console.error(e); process.exit(1) })
