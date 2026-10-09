import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"

async function verify() {
  const pool = getPool()
  const cols = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name IN ('affiliate_links','articles')
      AND column_name IN ('verification_status','verification_reason','verified_at','verified_by','verification_evidence','affiliate_link_id')
    ORDER BY table_name, ordinal_position
  `)
  console.log('=== COLUMNS ===')
  cols.rows.forEach(r => console.log(`${r.table_name}.${r.column_name}: ${r.data_type} nullable=${r.is_nullable} default=${r.column_default}`))

  const triggers = await pool.query(`
    SELECT tgname, tgtype, tgenabled
    FROM pg_trigger
    WHERE tgname LIKE '%verified_affiliate_link%'
  `)
  console.log('\n=== TRIGGERS ===')
  triggers.rows.forEach(r => console.log(`${r.tgname} type=${r.tgtype} enabled=${r.tgenabled}`))

  const fn = await pool.query(`
    SELECT proname FROM pg_proc WHERE proname = 'block_publication_without_verified_affiliate_link'
  `)
  console.log('\n=== FUNCTION ===')
  fn.rows.forEach(r => console.log(r.proname))

  const constraint = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid, true) AS def
    FROM pg_constraint
    WHERE conname = 'chk_affiliate_link_verification_status'
  `)
  console.log('\n=== CONSTRAINT ===')
  constraint.rows.forEach(r => console.log(`${r.conname}: ${r.def}`))

  const counts = await pool.query(`
    SELECT
      (SELECT count(*) FROM articles) AS articles,
      (SELECT count(*) FROM articles WHERE status='published') AS published,
      (SELECT count(*) FROM articles WHERE status='archived') AS archived,
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
}
verify().catch(e => { console.error(e); process.exit(1) })