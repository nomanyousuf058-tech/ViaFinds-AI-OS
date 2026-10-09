import { describe, it, expect } from "@jest/globals"
import * as fs from "fs"
import * as path from "path"

const src = fs.readFileSync(
  path.resolve(__dirname, "../../../lib/brain/articleQualityGate.ts"),
  "utf8"
)

describe("articleQualityGate — image integrity", () => {
  it("FAILs when a lineaged article has no cover image", () => {
    expect(src).toMatch(/media\.cover_image.*FAIL/)
  })

  it("FAILs on an invalid image URL for lineaged articles", () => {
    expect(src).toMatch(/Cover image URL is invalid/)
  })

  it("only warns about a missing image for non-lineaged articles", () => {
    expect(src).toMatch(/hasLineage/)
    // The WARNING branch must be guarded by the lineage check.
    expect(src).toMatch(/else if \(!article\.cover_image_url\)/)
    // The FAIL branch must be inside the lineage guard.
    expect(src).toMatch(/if \(hasLineage\)[\s\S]*?push\('media\.cover_image', 'FAIL'/)
  })
})

describe("articleQualityGate — verified affiliate link", () => {
  it("FAILs when a lineaged article has an affiliate URL but no verified link row", () => {
    expect(src).toMatch(/affiliate\.verified_link.*FAIL/)
  })
})
