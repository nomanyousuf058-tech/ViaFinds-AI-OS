import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`
    SELECT c.conname, c.contype, pg_get_constraintdef(c.oid, true) AS def
    FROM pg_constraint c
    JOIN pg_class cls ON c.conrelid = cls.oid
    WHERE cls.relname = "brain_tasks"
  `)
  console.log("brain_tasks constraints:")
  r.rows.forEach(x => console.log(`${x.contype} ${x.conname}: ${x.def}`))
}
run().catch(e => { console.error(e); process.exit(1) })