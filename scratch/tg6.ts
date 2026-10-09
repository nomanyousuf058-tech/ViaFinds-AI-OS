import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
async function run() {
  const pool = getPool()
  try {
    const r = await pool.query(`INSERT INTO brain_strategies (title, strategy_type, objective, status, description, reason, evidence, evidence_refs, assumptions, unknowns, unavailable_data, risks, constraints, expected_observations, success_conditions, failure_conditions, opportunity_ids, decision_ids, research_ids, learning_ids, parent_strategy_id, version, evidence_strength, outcome_status, freshness, conflict_flags, provenance, confidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING id`,
      ["T","CONTENT_STRATEGY","O","active","D","R",JSON.stringify({}),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),JSON.stringify([]),null,1,"MODERATE_EVIDENCE","OBSERVING",JSON.stringify({}),JSON.stringify([]),"TEST",1.0])
    console.log("INSERT OK id=", r.rows[0].id)
    await pool.query(`DELETE FROM brain_strategies WHERE id = $1`, [r.rows[0].id])
  } catch (e) { console.log("INSERT FAILED:", e.message.split("\n")[0]) }
}
run().catch(e => { console.error(e); process.exit(1) })