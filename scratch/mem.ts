import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`SELECT * FROM brain_memory LIMIT 1`)
  console.log("brain_memory columns:", r.rows[0] ? Object.keys(r.rows[0]).join(",") : "empty")
  const rows = await pool.query(`SELECT * FROM brain_memory`)
  rows.rows.forEach(x => console.log(JSON.stringify(x).slice(0, 300)))
}
run().catch(e => { console.error(e); process.exit(1) })
