import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  const BASELINE = "ab30fafa-a5d8-4bcd-9344-666831efdaa2"
  const r = await pool.query(`
    SELECT
      (SELECT count(*) FROM articles) AS articles,
      (SELECT count(*) FROM affiliate_links) AS links,
      (SELECT count(*) FROM brain_strategies) AS strategies,
      (SELECT count(*) FROM brain_strategies WHERE id = $1) AS baseline,
      (SELECT count(*) FROM brain_initialization) AS init,
      (SELECT count(*) FROM brain_schedules) AS schedules,
      (SELECT count(*) FROM brain_runs) AS runs,
      (SELECT count(*) FROM brain_memory) AS memory,
      (SELECT count(*) FROM brain_research_runs) AS research,
      (SELECT count(*) FROM brain_sources) AS sources,
      (SELECT count(*) FROM brain_observations) AS observations,
      (SELECT count(*) FROM brain_verifications) AS verifications,
      (SELECT count(*) FROM brain_learnings) AS learnings,
      (SELECT count(*) FROM brain_reports) AS reports,
      (SELECT count(*) FROM brain_decisions) AS decisions,
      (SELECT count(*) FROM brain_opportunities) AS opportunities,
      (SELECT count(*) FROM automation_jobs) AS jobs
  `, [BASELINE])
  console.log("=== FINAL STATE ===")
  console.log(JSON.stringify(r.rows[0], null, 2))
}
run().catch(e => { console.error(e); process.exit(1) })