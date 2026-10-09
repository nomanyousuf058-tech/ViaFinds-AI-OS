import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"

const BASELINE = "ab30fafa-a5d8-4bcd-9344-666831efdaa2"

// FK-safe deletion顺序。关键点：brain_tasks.approval_id 是
// ON DELETE SET NULL，因此 brain_approvals 必须在 brain_tasks 之后删除，
// 否则审批的删除会 UPDATE 任务并触发 protect_task_lineage。
// brain_tasks.execution_plan_id 是 ON DELETE CASCADE，因此
// brain_execution_plans 必须在 brain_tasks 之后删除。
const CLEAR_TABLES = [
  "articles",
  "article_related_articles",
  "article_related_products",
  "affiliate_clicks",
  "affiliate_conversions",
  "affiliate_references",
  "affiliate_links",
  "brain_quality_results",
  "brain_tasks",        // 在 brain_approvals / brain_execution_plans 之前
  "brain_approvals",
  "brain_execution_plans",
  "brain_learnings",
  "brain_verifications",
  "brain_observations",
  "brain_reports",
  "brain_decisions",
  "brain_opportunities",
  "brain_strategy_evolution",
  "brain_product_discoveries",
  "brain_strategies", // 仅清除非基线的 4 条内容策略
  "automation_jobs",
  "brain_business_snapshots",
  "brain_content_strategies",
  "brain_cost_decisions",
  "brain_cost_events",
  "brain_experiment_events",
  "brain_experiment_results",
  "brain_experiments",
  "brain_implementation_requests",
  "brain_technology_radar",
]

async function main() {
  const pool = getPool()
  const before: Record<string, number> = {}
  for (const t of CLEAR_TABLES) {
    const r = await pool.query(`SELECT count(*) AS n FROM "${t}"`)
    before[t] = Number(r.rows[0].n)
  }
  // 受保护的系统记录
  const protectedBefore: Record<string, number> = {}
  for (const t of ["brain_initialization", "brain_schedules", "brain_runs", "brain_memory", "brain_research_runs", "brain_sources"]) {
    const r = await pool.query(`SELECT count(*) AS n FROM "${t}"`)
    protectedBefore[t] = Number(r.rows[0].n)
  }
  const baselineBefore = await pool.query(`SELECT id, status, provenance, strategy_type, version, activated_at, title FROM brain_strategies WHERE id = $1`, [BASELINE])

  console.log("=== BEFORE ===")
  console.log(JSON.stringify(before, null, 2))
  console.log("=== PROTECTED BEFORE ===")
  console.log(JSON.stringify(protectedBefore, null, 2))
  console.log("=== BASELINE STRATEGY ===")
  console.log(JSON.stringify(baselineBefore.rows[0], null, 2))

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const t of CLEAR_TABLES) {
      let sql: string
      let params: unknown[]
      if (t === "brain_strategies") {
        sql = `DELETE FROM brain_strategies WHERE id != $1`
        params = [BASELINE]
      } else {
        sql = `DELETE FROM "${t}"`
        params = []
      }
      await client.query(sql, params)
    }
    await client.query("COMMIT")
    console.log("=== RESET COMMITTED ===")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("RESET FAILED — rolled back:", e)
    process.exit(1)
  } finally {
    client.release()
  }

  const after: Record<string, number> = {}
  for (const t of CLEAR_TABLES) {
    const r = await pool.query(`SELECT count(*) AS n FROM "${t}"`)
    after[t] = Number(r.rows[0].n)
  }
  const protectedAfter: Record<string, number> = {}
  for (const t of ["brain_initialization", "brain_schedules", "brain_runs", "brain_memory", "brain_research_runs", "brain_sources"]) {
    const r = await pool.query(`SELECT count(*) AS n FROM "${t}"`)
    protectedAfter[t] = Number(r.rows[0].n)
  }
  const baselineAfter = await pool.query(`SELECT id, status, provenance, strategy_type, version, activated_at, title FROM brain_strategies WHERE id = $1`, [BASELINE])

  console.log("=== AFTER ===")
  console.log(JSON.stringify(after, null, 2))
  console.log("=== PROTECTED AFTER ===")
  console.log(JSON.stringify(protectedAfter, null, 2))
  console.log("=== BASELINE AFTER ===")
  console.log(JSON.stringify(baselineAfter.rows[0], null, 2))

  // 校验：articles / affiliate_links 必须为 0
  const checks = await pool.query(`
    SELECT
      (SELECT count(*) FROM articles) AS articles,
      (SELECT count(*) FROM affiliate_links) AS links,
      (SELECT count(*) FROM brain_strategies) AS strategies,
      (SELECT count(*) FROM brain_strategies WHERE id = $1) AS baseline
  `, [BASELINE])
  console.log("=== FINAL CHECK ===")
  console.log(JSON.stringify(checks.rows[0], null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })