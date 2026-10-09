import { describe, it, expect } from "@jest/globals"

describe("pipeline — no fabricated product IDs", () => {
  it("contains no Math.random product ID generation", () => {
    const fs = require("fs")
    const path = require("path")
const src = fs.readFileSync(
      path.resolve(__dirname, "../../../../lib/automation/pipeline.ts"),
      "utf8"
    )
    expect(src).not.toMatch(/Math\.floor\(100000 \+ Math\.random\(\) \* 900000\)/)
    expect(src).not.toMatch(/Math\.floor\(Math\.random\(\) \* 100000\) \+ 100000/)
    expect(src).not.toMatch(/productId.*123456/)
    expect(src).not.toMatch(/productId.*999999/)
  })

  it("contains no curated fallback product list", () => {
    const fs = require("fs")
    const path = require("path")
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../../lib/automation/pipeline.ts"),
      "utf8"
    )
    expect(src).not.toMatch(/diverseProducts/)
    expect(src).not.toMatch(/smart diverse fallback/)
  })

  it("LLM prompt forbids inventing product IDs", () => {
    const fs = require("fs")
    const path = require("path")
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../../lib/automation/pipeline.ts"),
      "utf8"
    )
    expect(src).toMatch(/NEVER invent a product ID/)
    expect(src).toMatch(/productId: null/)
    expect(src).toMatch(/verified: false/)
  })

  it("throws when no verified product is available", () => {
    const fs = require("fs")
    const path = require("path")
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../../lib/automation/pipeline.ts"),
      "utf8"
    )
    expect(src).toMatch(/No verified Digistore24 product found/)
    expect(src).toMatch(/Publication blocked/)
  })
})

describe("pipeline — provenance integrity", () => {
  it("REAL provenance requires a verified affiliate link", () => {
    const fs = require("fs")
    const path = require("path")
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../../lib/automation/pipeline.ts"),
      "utf8"
    )
    expect(src).toMatch(/provenance: hasLineage && verifiedLink \? 'REAL' : 'UNKNOWN'/)
  })
})
