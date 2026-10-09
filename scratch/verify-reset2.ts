import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const sched = await pool.query(`SELECT * FROM brain_schedules ORDER BY created_at`)
  console.log("=== SCHEDULES ===")
  sched.rows.forEach(x => console.log(`key=${x.key} freq=${x.frequency} enabled=${x.enabled} appr=${x.approval_required} next=${x.next_run} cols=${Object.keys(x).join(",")}`))

  const strat = await pool.query(`SELECT id, status, provenance, strategy_type, version, activated_at, title FROM brain_strategies`)
  console.log("\n=== STRATEGIES ===")
  strat.rows.forEach(x => console.log(`id=${x.id.slice(0,8)} status=${x.status} prov=${x.provenance} type=${x.strategy_type} v${x.version} act=${x.activated_at} title="${x.title}"`))

  const mem = await pool.query(`SELECT id, context_type, context_id, importance, status FROM brain_memory`)
  console.log("\n=== BRAIN MEMORY ===")
  mem.rows.forEach(x => console.log(`type=${x.context_type} id=${x.context_id} imp=${x.importance} status=${x.status}`))
}
run().catch(e => { console.error(e); process.exit(1) })