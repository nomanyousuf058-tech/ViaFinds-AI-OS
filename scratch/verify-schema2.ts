import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"

async function verify() {
  const pool = getPool()
  const constraint = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid, true) AS def
    FROM pg_constraint
    WHERE conname = 'chk_affiliate_link_verification_status'
  `)
  console.log('=== CONSTRAINT ===')
  constraint.rows.forEach(r => console.log(`${r.conname}: ${r.def}`))

  const counts = await pool.query(`
    SELECT
      (SELECT count(*) FROM articles) AS articles,
      (SELECT count(*) FROM articles WHERE status='published') AS published,
      (SELECT count(*) FROM affiliate_links) AS links,
      (SELECT count(*) FROM affiliate_links WHERE verification_status='verified') AS verified_links,
      (SELECT count(*) FROM brain_initialization) AS init,
      (SELECT count(*) FROM brain_strategies WHERE status='active') AS active_strategies,
      (SELECT count(*) FROM brain_schedules) AS schedules,
      (SELECT count(*) FROM brain_runs) AS runs,
      (SELECT count(*) FROM automation_jobs) AS jobs
  `)
  console.log('\n=== COUNTS ===')
  console.log(counts.rows[0])

  const links = await pool.query(`
    SELECT id, product_id, network, destination_url, short_code, verification_status, created_at
    FROM affiliate_links
    ORDER BY created_at
  `)
  console.log('\n=== LEGACY AFFILIATE LINKS (' + links.rows.length + ') ===')
  links.rows.forEach((r, i) => console.log(`${i+1}. id=${r.id} network=${r.network} product_id=${r.product_id} status=${r.verification_status} url=${r.destination_url}`))
}
verify().catch(e => { console.error(e); process.exit(1) })
