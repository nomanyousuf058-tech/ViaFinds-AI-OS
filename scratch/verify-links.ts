import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getPool } from "../lib/db/client"
import { productVerification } from "../lib/brain/productVerification"

async function verify() {
  const pool = getPool()
  const links = await pool.query(`
    SELECT id, product_id, network, destination_url, short_code, verification_status, created_at
    FROM affiliate_links ORDER BY created_at
  `)

  console.log("=== LEGACY LINK VERIFICATION ===\n")
  const summary: Record<string, number> = { VERIFIED: 0, INVALID: 0, MANUAL_REQUIRED: 0, PENDING: 0 }

  for (let i = 0; i < links.rows.length; i++) {
    const r = links.rows[i]
    const result = await productVerification.verifyAffiliateUrl(r.destination_url)
    const productId = r.destination_url.match(/redir\/(\d+)/)?.[1] || null
    let classification: string
    if (result.verified) {
      classification = "VERIFIED"
    } else if (result.reason?.includes("not a Digistore24 hop-link") || result.reason?.includes("missing a Digistore24 product ID")) {
      classification = "INVALID"
    } else if (r.destination_url.includes("/AUTO")) {
      classification = "MANUAL_REQUIRED"
    } else {
      classification = "MANUAL_REQUIRED"
    }
    summary[classification]++
    console.log(`${i+1}. ${classification}`)
    console.log(`   id=${r.id}`)
    console.log(`   product_id=${productId}`)
    console.log(`   network=${r.network}`)
    console.log(`   url=${r.destination_url}`)
    console.log(`   reason=${result.verified ? "verified" : result.reason}`)
    console.log("")
  }
  console.log("=== SUMMARY ===")
  console.log(summary)
}
verify().catch(e => { console.error(e); process.exit(1) })
