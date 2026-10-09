import * as fs from "fs"
import * as path from "path"
const p = path.resolve("tests/unit/brain", "../../../scratch/reset.ts")
console.log("Resolved:", p)
const src = fs.readFileSync(p, "utf8")
console.log("Has DELETE FROM articles:", src.includes("DELETE FROM articles"))
console.log("Has DELETE FROM \"articles\":", src.includes('DELETE FROM "articles"'))
console.log("Has DELETE FROM brain_strategies WHERE id !=:", src.includes("DELETE FROM brain_strategies WHERE id != $1"))
