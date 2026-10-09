import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid, true) AS def
    FROM pg_constraint c
    JOIN pg_class cls ON c.conrelid = cls.oid
    WHERE cls.relname = 'brain_strategy_evolution'
  `)
  console.log("brain_strategy_evolution constraints:")
  r.rows.forEach(x => console.log(`${x.conname}: ${x.def}`))
}
run().catch(e => { console.error(e); process.exit(1) })