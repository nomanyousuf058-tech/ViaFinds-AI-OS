import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const BASELINE = "ab30fafa-a5d8-4bcd-9344-666831efdaa2"
  const content = (await pool.query(`SELECT id, title, status FROM brain_strategies WHERE id != $1`, [BASELINE])).rows
  const contentIds = content.map(r => r.id)
  console.log("Content strategies:", content.map(r => `${r.id.slice(0,8)} ${r.status}`).join(", "))

  const refs = await pool.query(`
    SELECT 'approvals' AS tbl, count(*) AS n FROM brain_approvals WHERE strategy_id = ANY($1::uuid[])
    UNION ALL SELECT 'execution_plans', count(*) FROM brain_execution_plans WHERE strategy_id = ANY($1::uuid[])
    UNION ALL SELECT 'tasks', count(*) FROM brain_tasks WHERE strategy_id = ANY($1::uuid[])
    UNION ALL SELECT 'learnings', count(*) FROM brain_learnings WHERE strategy_id = ANY($1::uuid[])
    UNION ALL SELECT 'decisions', count(*) FROM brain_decisions WHERE id = ANY($1::uuid[])
    UNION ALL SELECT 'opportunities_ref', count(*) FROM brain_opportunities WHERE strategy_id = ANY($1::uuid[])
  `, [contentIds])
  console.log("\nReferences to content strategies:", refs.rows)

  const baselineRefs = await pool.query(`
    SELECT 'approvals' AS tbl, count(*) AS n FROM brain_approvals WHERE strategy_id = $1
    UNION ALL SELECT 'execution_plans', count(*) FROM brain_execution_plans WHERE strategy_id = $1
    UNION ALL SELECT 'tasks', count(*) FROM brain_tasks WHERE strategy_id = $1
    UNION ALL SELECT 'learnings', count(*) FROM brain_learnings WHERE strategy_id = $1
    UNION ALL SELECT 'opportunities_ref', count(*) FROM brain_opportunities WHERE strategy_id = $1
  `, [BASELINE])
  console.log("References to baseline strategy:", baselineRefs.rows)

  const opps = await pool.query(`SELECT id, provenance, status, strategy_id, research_id, execution_plan_id FROM brain_opportunities`)
  console.log("\nbrain_opportunities:", opps.rows.map(r => `${r.id.slice(0,8)} prov=${r.provenance} status=${r.status} strat=${r.strategy_id ? r.strategy_id.slice(0,8) : null} research=${r.research_id ? r.research_id.slice(0,8) : null}`).join("\n"))

  const artRefs = await pool.query(`
    SELECT 'brain_tasks' AS tbl, count(*) AS n FROM brain_tasks WHERE opportunity_id IS NOT NULL
    UNION ALL SELECT 'execution_plans', count(*) FROM brain_execution_plans WHERE opportunity_id IS NOT NULL
    UNION ALL SELECT 'articles', count(*) FROM articles WHERE opportunity_id IS NOT NULL
    UNION ALL SELECT 'brain_opportunities_self', count(*) FROM brain_opportunities WHERE execution_plan_id IS NOT NULL
  `)
  console.log("\nOpportunity references:", artRefs.rows)
}
run().catch(e => { console.error(e); process.exit(1) })
