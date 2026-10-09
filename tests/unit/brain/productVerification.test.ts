import { describe, it, expect } from "@jest/globals"
import { productVerification } from "@/lib/brain/productVerification"

describe("productVerification — no fabricated product IDs", () => {
  it("rejects a missing product ID", async () => {
    const r = await productVerification.verifyProduct(null)
    expect(r.verified).toBe(false)
    if (!r.verified) expect(r.reason).toMatch(/missing/i)
  })

  it("rejects a non-numeric product ID", async () => {
    const r = await productVerification.verifyProduct("abc")
    expect(r.verified).toBe(false)
  })

  it("rejects a placeholder product ID", async () => {
    const r = await productVerification.verifyProduct(123456)
    expect(r.verified).toBe(false)
  })

  it("rejects a placeholder product ID 999999", async () => {
    const r = await productVerification.verifyProduct(999999)
    expect(r.verified).toBe(false)
  })

  it("rejects an empty string product ID", async () => {
    const r = await productVerification.verifyProduct("")
    expect(r.verified).toBe(false)
  })

  it("never generates a product ID via Math.random", () => {
    const src = require("fs").readFileSync(
      require("path").resolve(__dirname, "../../../lib/brain/productVerification.ts"),
      "utf8"
    )
    expect(src).not.toMatch(/Math\.random/)
    expect(src).not.toMatch(/123456/)
    expect(src).not.toMatch(/999999/)
  })
})

describe("productVerification — affiliate URL integrity", () => {
  it("rejects a non-Digistore24 URL", async () => {
    const r = await productVerification.verifyAffiliateUrl("https://example.com/product/123")
    expect(r.verified).toBe(false)
  })

  it("rejects a Digistore24 URL without a product ID", async () => {
    const r = await productVerification.verifyAffiliateUrl("https://www.digistore24.com/redir/AUTO/AFFILIATE")
    expect(r.verified).toBe(false)
  })

  it("rejects an empty URL", async () => {
    const r = await productVerification.verifyAffiliateUrl(null)
    expect(r.verified).toBe(false)
  })

  it("rejects a malformed URL", async () => {
    const r = await productVerification.verifyAffiliateUrl("not a url")
    expect(r.verified).toBe(false)
  })

  it("extracts the product ID from the URL, never invents one", () => {
    const src = require("fs").readFileSync(
      require("path").resolve(__dirname, "../../../lib/brain/productVerification.ts"),
      "utf8"
    )
    expect(src).toMatch(/extractDs24RedirProductId/)
  })
})
