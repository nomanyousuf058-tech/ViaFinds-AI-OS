import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const r = await client.query("DELETE FROM brain_tasks WHERE id = $1", ["a904ea03-1084-4f49-98ad-f758b82d2d5a"])
    console.log("DELETE brain_tasks OK, rows:", r.rowCount)
    await client.query("ROLLBACK")
  } catch (e) {
    await client.query("ROLLBACK")
    console.log("DELETE brain_tasks FAILED:", e.message.split("\n")[0])
  } finally { client.release() }
}
run().catch(e => { console.error(e); process.exit(1) })
