import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const r = await pool.query(`
    SELECT t.tgrelid::regclass::text AS table_name, t.tgname, t.tgenabled
    FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND t.tgrelid::regclass::text = ANY(ARRAY['articles','affiliate_links','brain_strategies','brain_initialization','brain_schedules'])
    ORDER BY t.tgrelid::regclass::text, t.tgname
  `)
  console.log("=== PROTECTION TRIGGERS ===")
  r.rows.forEach(x => console.log(`${x.table_name}: ${x.tgname} enabled=${x.tgenabled}`))

  const pub = await pool.query(`SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%verified_affiliate_link%'`)
  console.log("\n=== AFFILIATE VERIFICATION GATE ===")
  pub.rows.forEach(x => console.log(`${x.tgname} enabled=${x.tgenabled}`))

  const init = await pool.query(`SELECT status, initialized_at FROM brain_initialization`)
  console.log("\n=== WAKE UP STATE ===")
  init.rows.forEach(x => console.log(`status=${x.status} initialized_at=${x.initialized_at}`))

  const sched = await pool.query(`SELECT key, name, frequency, enabled, approval_required, next_run FROM brain_schedules ORDER BY created_at`)
  console.log("\n=== SCHEDULES ===")
  sched.rows.forEach(x => console.log(`key=${x.key} name="${x.name}" freq=${x.frequency} enabled=${x.enabled} appr=${x.approval_required} next=${x.next_run}`))

  const strat = await pool.query(`SELECT id, status, provenance, strategy_type, version, activated_at, title FROM brain_strategies`)
  console.log("\n=== STRATEGIES ===")
  strat.rows.forEach(x => console.log(`id=${x.id.slice(0,8)} status=${x.status} prov=${x.provenance} type=${x.strategy_type} v${x.version} act=${x.activated_at} title="${x.title}"`))
}
run().catch(e => { console.error(e); process.exit(1) })