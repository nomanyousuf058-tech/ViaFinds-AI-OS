import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`
    SELECT t.tgname, t.tgrelid::regclass::text AS table_name, t.tgenabled,
           pg_get_triggerdef(t.oid, true) AS def
    FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND t.tgrelid::regclass::text = ANY(ARRAY['brain_tasks','brain_approvals','brain_execution_plans','brain_quality_results','brain_strategies'])
    ORDER BY t.tgrelid::regclass::text, t.tgname
  `)
  console.log("Triggers on reset tables:")
  r.rows.forEach(x => console.log(`${x.table_name}: ${x.tgname} enabled=${x.tgenabled}\n  ${x.def}`))
}
run().catch(e => { console.error(e); process.exit(1) })