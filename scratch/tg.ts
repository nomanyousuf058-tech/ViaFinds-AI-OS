import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`
    SELECT tgname, tgenabled, pg_get_triggerdef(t.oid, true) AS def
    FROM pg_trigger t
    WHERE NOT t.tgisinternal AND t.tgrelid = "brain_tasks"::regclass
  `)
  console.log("brain_tasks triggers:")
  r.rows.forEach(x => console.log(`${x.tgname} enabled=${x.tgenabled}\n  ${x.def}`))
}
run().catch(e => { console.error(e); process.exit(1) })
