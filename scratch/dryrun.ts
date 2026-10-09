import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const BASELINE = "ab30fafa-a5d8-4bcd-9344-666831efdaa2"
  const tables = ["articles","article_related_articles","article_related_products","affiliate_clicks","affiliate_conversions","affiliate_references","affiliate_links","brain_quality_results","brain_approvals","brain_execution_plans","brain_tasks","brain_learnings","brain_verifications","brain_observations","brain_reports","brain_decisions","brain_opportunities","brain_strategy_evolution","brain_product_discoveries","brain_strategies","automation_jobs","brain_business_snapshots","brain_content_strategies","brain_cost_decisions","brain_cost_events","brain_experiment_events","brain_experiment_results","brain_experiments","brain_implementation_requests","brain_technology_radar"]
  const before: Record<string, number> = {}
  for (const t of tables) {
    const r = await pool.query(`SELECT count(*) AS n FROM "${t}"`)
    before[t] = Number(r.rows[0].n)
  }
  const total = Object.values(before).reduce((a,b) => a+b, 0)
  const nonBaseline = await pool.query(`SELECT count(*) FROM brain_strategies WHERE id != $1`, [BASELINE])
  console.log("=== DRY RUN ===")
  console.log("Total business rows to clear:", total, "(incl. brain_strategies non-baseline:", nonBaseline.rows[0].count, ")")
  console.log(JSON.stringify(before, null, 2))
  const prot = await pool.query(`
    SELECT (SELECT count(*) FROM brain_initialization) AS init,
           (SELECT count(*) FROM brain_schedules) AS schedules,
           (SELECT count(*) FROM brain_runs) AS runs,
           (SELECT count(*) FROM brain_memory) AS memory,
           (SELECT count(*) FROM brain_research_runs) AS research,
           (SELECT count(*) FROM brain_sources) AS sources,
           (SELECT count(*) FROM brain_strategies WHERE id=$1) AS baseline
  `, [BASELINE])
  console.log("=== PROTECTED ===")
  console.log(JSON.stringify(prot.rows[0], null, 2))
}
run().catch(e => { console.error(e); process.exit(1) })
