#!/usr/bin/env node
// Sinh sổ bảng-thuộc-tenant từ prisma/schema.prisma (ADR-016 D-S1, bước S-1).
// Chạy: npm run gen:tenant-registry — test `tests/unit/architecture/tenant-table-registry.test.ts`
// đỏ khi tệp sinh lệch schema.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export const SCHEMA_PATH = "prisma/schema.prisma"
export const OUTPUT_PATH = "src/core/tenancy/generated/tenant-table-registry.ts"

/** Mỗi model → { scope, parents }: TENANT khi có cột `organization_id`, còn lại GLOBAL. */
export function parseSchema(schemaText) {
  const models = new Map()
  for (const m of schemaText.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const [, name, body] = m
    const tenant = /^\s+organization_id\s/m.test(body)
    const parents = new Set()
    const pii = {}
    let pendingPii = null
    for (const line of body.split("\n")) {
      const label = line.match(/^\s+\/\/\/\s*@pii\s+(\w+)/)
      if (label) { pendingPii = label[1]; continue }
      const field = line.match(/^\s+(\w+)\s+\w/)
      if (field && !line.trim().startsWith("//")) {
        if (pendingPii) pii[field[1]] = pendingPii
        pendingPii = null
      }
      const rel = line.match(/^\s+\w+\s+(\w+)\??\s+@relation\(/)
      if (rel && /fields:\s*\[/.test(line) && rel[1] !== name) parents.add(rel[1])
    }
    models.set(name, { scope: tenant ? "TENANT" : "GLOBAL", parents: [...parents].sort(), pii })
  }
  return new Map([...models].sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Thứ tự "con trước cha": mỗi bảng đứng trước mọi bảng nó trỏ khoá ngoại tới. TRUNCATE / xoá theo thứ tự
 * này khoá bảng con trước, không ngược chiều với một giao dịch đang ghi con rồi kiểm cha (tránh deadlock).
 * Vòng khoá ngoại (vd. orders ↔ vouchers): lấy bảng còn ít bảng con chưa xếp nhất trước.
 */
export function childFirstOrder(models) {
  const referencedBy = new Map([...models.keys()].map((n) => [n, 0]))
  for (const { parents } of models.values()) for (const p of parents) if (referencedBy.has(p)) referencedBy.set(p, referencedBy.get(p) + 1)
  const done = new Set()
  const order = []
  while (done.size < models.size) {
    // Bảng chưa xếp mà không còn bảng con nào chưa xếp; gặp vòng thì lấy bảng ít con chưa xếp nhất.
    const left = [...referencedBy].filter(([n]) => !done.has(n)).sort(([a, ca], [b, cb]) => ca - cb || a.localeCompare(b))
    const [name] = left[0]
    done.add(name)
    order.push(name)
    for (const p of models.get(name).parents) if (referencedBy.has(p)) referencedBy.set(p, referencedBy.get(p) - 1)
  }
  return order
}

export function buildRegistrySource(schemaText) {
  const models = parseSchema(schemaText)
  const rows = [...models].map(([name, { scope, parents, pii }]) => {
    const p = parents.length ? `[${parents.map((x) => `"${x}"`).join(", ")}]` : "[]"
    const cols = Object.entries(pii).sort(([a], [b]) => a.localeCompare(b))
    const q = cols.length ? `, pii: { ${cols.map(([c, k]) => `${c}: "${k}"`).join(", ")} }` : ""
    return `  ${name}: { scope: "${scope}", parents: ${p}${q} },`
  })
  const tenant = [...models].filter(([, v]) => v.scope === "TENANT").map(([n]) => `  "${n}",`)
  return [
    "// TỆP SINH TỰ ĐỘNG — không sửa tay. Nguồn: prisma/schema.prisma. Sinh lại: npm run gen:tenant-registry",
    "// Sổ bảng-thuộc-tenant (ADR-016 D-S1): RLS, dọn bảng của test, xuất/nhập/xoá tenant đều đọc sổ này.",
    "",
    'export type TableScope = "TENANT" | "GLOBAL"',
    "",
    "/** contact · address · tax · identity = dữ liệu cá nhân; business = liên hệ của doanh nghiệp (không mã hoá). */",
    'export type PiiCategory = "contact" | "address" | "tax" | "identity" | "free_text" | "business"',
    "",
    "export interface TableEntry {",
    "  /** TENANT = có cột organization_id; GLOBAL = bảng nền tảng hoặc của người dùng. */",
    "  readonly scope: TableScope",
    "  /** Bảng mà bảng này trỏ khoá ngoại tới (không gồm chính nó) — thứ tự xuất/nhập. */",
    "  readonly parents: readonly string[]",
    "  /** Cột dữ liệu cá nhân theo nhãn `/// @pii <loại>` trong schema (ADR-014 D-P1). */",
    "  readonly pii?: Readonly<Record<string, PiiCategory>>",
    "}",
    "",
    "export const TABLE_REGISTRY: Readonly<Record<string, TableEntry>> = {",
    ...rows,
    "}",
    "",
    "/** Mọi bảng, con trước cha (theo khoá ngoại) — thứ tự TRUNCATE/xoá an toàn. */",
    "export const TABLES_CHILD_FIRST: readonly string[] = [",
    ...childFirstOrder(models).map((n) => `  "${n}",`),
    "]",
    "",
    "/** Mọi bảng có organization_id, theo thứ tự tên. */",
    "export const TENANT_SCOPED_TABLES: readonly string[] = [",
    ...tenant,
    "]",
    "",
  ].join("\n")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUTPUT_PATH, buildRegistrySource(readFileSync(SCHEMA_PATH, "utf8")))
  console.log(`gen-tenant-table-registry: đã ghi ${OUTPUT_PATH}`)
}
