import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const tables = ["brain_strategies","brain_tasks","brain_opportunities","brain_decisions","brain_execution_plans","brain_approvals","brain_quality_results","brain_runs","brain_reports","brain_research_runs","brain_sources","brain_observations","brain_verifications","brain_learnings","automation_jobs","brain_initialization","brain_memory","brain_business_snapshots","brain_content_strategies","brain_cost_decisions","brain_cost_events","brain_experiment_events","brain_experiment_results","brain_experiments","brain_implementation_requests","brain_technology_radar","brain_memory_v2","brain_strategy_evolution","brain_product_discoveries"]
  for (const t of tables) {
    try {
      const prov = await pool.query(`SELECT provenance, count(*) FROM ${t} GROUP BY provenance ORDER BY count(*) DESC`)
      const sample = await pool.query(`SELECT * FROM ${t} LIMIT 1`)
      const columns = sample.rows[0] ? Object.keys(sample.rows[0]) : []
      console.log(`${t}: ${prov.rows.map(r => `${r.provenance}=${r.count}`).join(", ") || "empty"}`)
      console.log(`  columns: ${columns.join(",")}`)
    } catch (e) { console.log(`${t}: ERROR ${e.message.split("\n")[0]}`) }
  }
}
run().catch(e => { console.error(e); process.exit(1) })
