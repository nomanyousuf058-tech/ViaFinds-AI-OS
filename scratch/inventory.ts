import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"

async function inventory() {
  const pool = getPool()

  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  console.log("=== ALL TABLES ===")
  for (const t of tables.rows) {
    try {
      const r = await pool.query(`SELECT count(*) AS n FROM "${t.table_name}"`)
      console.log(`${t.table_name}: ${r.rows[0].n}`)
    } catch (e) {
      console.log(`${t.table_name}: ERROR ${e}`)
    }
  }

  console.log("\n=== FOREIGN KEYS (articles/affiliate/brain) ===")
  const fk = await pool.query(`
    SELECT
      conname,
      conrelid::regclass AS source_table,
      confrelid::regclass AS ref_table,
      confdeltype AS on_delete
    FROM pg_constraint
    WHERE contype = 'f'
      AND (conrelid::regclass::text IN ('articles','affiliate_links','affiliate_clicks','affiliate_conversions','brain_strategies','brain_runs','brain_schedules','brain_initialization','brain_tasks','brain_approvals','brain_opportunities','brain_decisions','brain_research_runs','brain_sources','brain_learning_records','automation_jobs','brain_product_discoveries','brain_quality_results','reviews','products','authors','categories','admin_users')
       OR confrelid::regclass::text IN ('articles','affiliate_links','affiliate_clicks','affiliate_conversions','brain_strategies','brain_runs','brain_schedules','brain_initialization','brain_tasks','brain_approvals','brain_opportunities','brain_decisions','brain_research_runs','brain_sources','brain_learning_records','automation_jobs','brain_product_discoveries','brain_quality_results','reviews','products','authors','categories','admin_users'))
    ORDER BY conrelid::regclass::text, confrelid::regclass::text
  `)
  fk.rows.forEach(r => console.log(`${r.source_table} -> ${r.ref_table} (ON DELETE ${r.on_delete}) [${r.conname}]`))

  console.log("\n=== TRIGGERS ===")
  const tr = await pool.query(`
    SELECT tgname, relid::regclass AS table, tgenabled AS enabled
    FROM pg_trigger
    WHERE NOT tgisinternal
    ORDER BY relid::regclass::text, tgname
  `)
  tr.rows.forEach(r => console.log(`${r.table}: ${r.tgname} enabled=${r.enabled}`))
}
inventory().catch(e => { console.error(e); process.exit(1) })