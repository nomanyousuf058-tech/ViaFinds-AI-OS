import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const s = await pool.query(`SELECT id, title, status, provenance, strategy_type, opportunity_ids, version, activated_at, created_at FROM brain_strategies ORDER BY created_at`)
  console.log("=== brain_strategies ===")
  s.rows.forEach(r => console.log(`id=${r.id} status=${r.status} prov=${r.provenance} type=${r.strategy_type} v${r.version} opps=${JSON.stringify(r.opportunity_ids)} act=${r.activated_at} title="${r.title}"`))

  const init = await pool.query(`SELECT * FROM brain_initialization`)
  console.log("\n=== brain_initialization ===")
  init.rows.forEach(r => console.log(JSON.stringify(r, null, 2).slice(0, 400)))

  const mem = await pool.query(`SELECT * FROM brain_memory`)
  console.log("\n=== brain_memory ===")
  mem.rows.forEach(r => console.log(`key=${r.memory_key || r.key} cat=${r.category} imp=${r.importance}`))

  const sched = await pool.query(`SELECT id, key, name, frequency, enabled, approval_required, next_run FROM brain_schedules ORDER BY created_at`)
  console.log("\n=== brain_schedules ===")
  sched.rows.forEach(r => console.log(`key=${r.key} name="${r.name}" freq=${r.frequency} enabled=${r.enabled} appr=${r.approval_required} next=${r.next_run}`))

  const runs = await pool.query(`SELECT id, run_type, trigger, status, started_at FROM brain_runs ORDER BY started_at`)
  console.log("\n=== brain_runs ===")
  runs.rows.forEach(r => console.log(`type=${r.run_type} trig=${r.trigger} status=${r.status} started=${r.started_at}`))
}
run().catch(e => { console.error(e); process.exit(1) })
