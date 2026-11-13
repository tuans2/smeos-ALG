import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Mọi khoá ngoại phải có index hỗ trợ (ADR-015 D-O6, bước O-1). Không có index thì xoá hay đổi
 * dòng cha (SET NULL / CASCADE / RESTRICT) quét toàn bảng con, và tra theo cha chậm dần theo dữ liệu.
 *
 * Index được coi là hỗ trợ khi các cột đầu của nó trùng tập cột khoá ngoại, hoặc cột đầu tiên của nó là
 * cột đầu tiên của khoá ngoại. Khoá ngoại về `organizations` qua riêng `organization_id` đã có luật
 * `@@index([organization_id])` của tenancy nên bỏ qua ở đây.
 */
function foreignKeysWithoutIndex(schema: string): string[] {
  const missing: string[] = []
  for (const [, name, body] of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const text = body ?? ""
    const indexes = [...text.matchAll(/@@(?:index|unique|id)\(\[([^\]]+)\]/g)].map((m) =>
      (m[1] ?? "").split(",").map((c) => c.trim().split("(")[0] ?? "")
    )
    for (const line of text.split("\n")) {
      const field = line.match(/^\s+(\w+)\s+\w+/)
      if (field?.[1] && /@id\b|@unique\b/.test(line)) indexes.push([field[1]])
    }
    for (const rel of text.matchAll(/@relation\((?:"[^"]*",\s*)?fields:\s*\[([^\]]+)\]/g)) {
      const cols = (rel[1] ?? "").split(",").map((c) => c.trim())
      if (cols.length === 1 && cols[0] === "organization_id") continue
      const supported = indexes.some((ix) => {
        const lead = ix.slice(0, cols.length)
        return (lead.length === cols.length && cols.every((c) => lead.includes(c))) || ix[0] === cols[0]
      })
      if (!supported) missing.push(`${name}(${cols.join(", ")})`)
    }
  }
  return [...new Set(missing)].sort()
}

describe("khoá ngoại có index", () => {
  it("mọi khoá ngoại trong prisma/schema.prisma có index hỗ trợ", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8")
    expect(foreignKeysWithoutIndex(schema), "thêm @@index([...]) cho cột khoá ngoại").toEqual([])
  })

  it("luật bắt được khoá ngoại thiếu index", () => {
    const sample = [
      "model a {",
      "  id String @id",
      "  b_id String",
      "  b b @relation(fields: [b_id], references: [id])",
      "}",
    ].join("\n")
    expect(foreignKeysWithoutIndex(`${sample}\n`)).toEqual(["a(b_id)"])
  })
})
