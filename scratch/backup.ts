import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
import * as fs from "fs"
import * as path from "path"

async function main() {
  const pool = getPool()
  const BASELINE = "ab30fafa-a5d8-4bcd-9344-666831efdaa2"
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(process.cwd(), "data", "reset-backup")
  fs.mkdirSync(outDir, { recursive: true })

  const tables = [
    "articles", "article_related_articles", "article_related_products",
    "affiliate_links", "affiliate_clicks", "affiliate_conversions", "affiliate_references",
    "brain_tasks", "brain_execution_plans", "brain_approvals", "brain_quality_results",
    "brain_opportunities", "brain_decisions", "brain_research_runs", "brain_sources",
    "brain_observations", "brain_verifications", "brain_learnings", "brain_reports",
    "brain_strategy_evolution", "brain_product_discoveries",
    "brain_strategies", "automation_jobs", "brain_business_snapshots",
    "brain_content_strategies", "brain_cost_decisions", "brain_cost_events",
    "brain_experiment_events", "brain_experiment_results", "brain_experiments",
    "brain_implementation_requests", "brain_technology_radar",
  ]
  const summary: Record<string, number> = {}
  for (const t of tables) {
    try {
      const r = await pool.query(`SELECT * FROM "${t}"`)
      const f = path.join(outDir, `${t}.json`)
      fs.writeFileSync(f, JSON.stringify(r.rows, null, 2))
      summary[t] = r.rows.length
    } catch (e) {
      summary[t] = -1
    }
  }
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2))
  console.log("BACKUP WRITTEN TO", outDir)
  console.log(JSON.stringify(summary, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
