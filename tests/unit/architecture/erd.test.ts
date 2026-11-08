import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { buildErdDoc, DOMAINS, OUTPUT_PATH, SCHEMA_PATH } from "../../../scripts/gen-erd.mjs"

/** Kế hoạch DB, bước P3-03 (ARC-027): ERD theo miền sinh từ schema, không sửa tay. */
describe("ERD theo miền", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8")

  it("tệp sinh khớp schema hiện tại", () => {
    expect(readFileSync(OUTPUT_PATH, "utf8"), "chạy `npm run gen:erd`").toBe(buildErdDoc(schema))
  })

  it("mỗi model thuộc đúng một miền", () => {
    const tables = (DOMAINS as Array<[string, string[]]>).flatMap(([, t]) => t)
    expect(new Set(tables).size).toBe(tables.length)
    expect([...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]).sort()).toEqual([...tables].sort())
  })
})
