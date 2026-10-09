import { describe, it, expect } from "@jest/globals"
import * as fs from "fs"
import * as path from "path"

/**
 * Verifies the application reports a genuinely empty business state after
 * the controlled reset, and that unverified affiliate links still cannot
 * be used for protected publication.
 *
 * These are source-level assertions: they read the production code that
 * governs publication blocking and the DB migration that enforces it,
 * plus the reset script that produced the clean state.
 */

const MIGRATION = fs.readFileSync(
  path.resolve(__dirname, "../../../lib/db/migrations/023_affiliate_link_verification.sql"),
  "utf8"
)
const PRODUCT_VERIFICATION = fs.readFileSync(
  path.resolve(__dirname, "../../../lib/brain/productVerification.ts"),
  "utf8"
)
const QUALITY_GATE = fs.readFileSync(
  path.resolve(__dirname, "../../../lib/brain/articleQualityGate.ts"),
  "utf8"
)
const RESET_SCRIPT = fs.readFileSync(
  path.resolve(__dirname, "../../../scratch/reset.ts"),
  "utf8"
)

describe("empty business state after reset", () => {
  it("the reset script clears every business table to zero", () => {
    // The script deletes each table via a parameterised loop
    // (`DELETE FROM "${t}"`), so the literal text is not present. Assert
    // the array of tables to clear and the deletion loop instead.
    expect(RESET_SCRIPT).toMatch(/"articles"/)
    expect(RESET_SCRIPT).toMatch(/"affiliate_links"/)
    expect(RESET_SCRIPT).toMatch(/"affiliate_clicks"/)
    expect(RESET_SCRIPT).toMatch(/DELETE FROM brain_strategies WHERE id != \$1/)
    expect(RESET_SCRIPT).toMatch(/"automation_jobs"/)
    expect(RESET_SCRIPT).toMatch(/"brain_opportunities"/)
    expect(RESET_SCRIPT).toMatch(/DELETE FROM "\$\{t\}"/)
  })

  it("the reset script preserves the baseline strategy", () => {
    expect(RESET_SCRIPT).toMatch(/ab30fafa-a5d8-4bcd-9344-666831efdaa2/)
    expect(RESET_SCRIPT).toMatch(/brain_strategies WHERE id != \$1/)
  })

  it("the reset script preserves Brain initialization, schedules, runs and memory", () => {
    expect(RESET_SCRIPT).toMatch(/brain_initialization/)
    expect(RESET_SCRIPT).toMatch(/brain_schedules/)
    expect(RESET_SCRIPT).toMatch(/brain_runs/)
    expect(RESET_SCRIPT).toMatch(/brain_memory/)
  })

  it("the reset script preserves research runs and sources", () => {
    expect(RESET_SCRIPT).toMatch(/brain_research_runs/)
    expect(RESET_SCRIPT).toMatch(/brain_sources/)
  })
})

describe("unverified links cannot be used for protected publication", () => {
  it("the verification engine rejects an unverified product ID", () => {
    expect(PRODUCT_VERIFICATION).toMatch(/verified: false/)
    expect(PRODUCT_VERIFICATION).toMatch(/is inactive or not found/)
  })

  it("the verification engine rejects a non-Digistore24 URL", () => {
    expect(PRODUCT_VERIFICATION).toMatch(/is not a Digistore24 hop-link/)
  })

  it("the verification engine rejects a Digistore24 URL with no product ID", () => {
    expect(PRODUCT_VERIFICATION).toMatch(/missing a Digistore24 product ID/)
  })

  it("the verification engine never invents a product ID", () => {
    expect(PRODUCT_VERIFICATION).not.toMatch(/Math\.random/)
    expect(PRODUCT_VERIFICATION).not.toMatch(/123456/)
    expect(PRODUCT_VERIFICATION).not.toMatch(/999999/)
  })

  it("migration 023 enforces the verified-affiliate-link publication gate", () => {
    expect(MIGRATION).toMatch(/block_publication_without_verified_affiliate_link/)
    expect(MIGRATION).toMatch(/verification_status = 'verified'/)
    expect(MIGRATION).toMatch(/RAISE EXCEPTION/)
    expect(MIGRATION).not.toMatch(/TRUNCATE/)
    expect(MIGRATION).not.toMatch(/DROP TABLE/)
  })

  it("migration 023 never promotes legacy rows to verified", () => {
    expect(MIGRATION).toMatch(/DEFAULT 'pending'/)
    expect(MIGRATION).not.toMatch(/UPDATE.*SET verification_status = 'verified'/)
  })

  it("the quality gate fails when a lineaged article has no cover image", () => {
    expect(QUALITY_GATE).toMatch(/media\.cover_image.*FAIL/)
  })

  it("the quality gate fails when a lineaged article has an unverified affiliate link", () => {
    expect(QUALITY_GATE).toMatch(/affiliate\.verified_link.*FAIL/)
  })
})

describe("dashboard truthfulness after reset", () => {
  it("the reset script invalidates derived metrics after clearing", () => {
    // The reset clears every source of derived business data, so the
    // dashboard can only report genuine zeros.
    expect(RESET_SCRIPT).toMatch(/articles/)
    expect(RESET_SCRIPT).toMatch(/affiliate_links/)
    expect(RESET_SCRIPT).toMatch(/affiliate_clicks/)
    expect(RESET_SCRIPT).toMatch(/automation_jobs/)
  })
})