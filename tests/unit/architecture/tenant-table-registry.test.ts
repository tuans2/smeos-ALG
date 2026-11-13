import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { buildRegistrySource, OUTPUT_PATH, SCHEMA_PATH } from "../../../scripts/gen-tenant-table-registry.mjs"
import { TABLE_REGISTRY, TABLES_CHILD_FIRST, TENANT_SCOPED_TABLES } from "@/core/tenancy/generated/tenant-table-registry"

/**
 * Sổ bảng-thuộc-tenant (ADR-016 D-S1) phải khớp đúng `prisma/schema.prisma`.
 * Đỏ = sửa schema mà chưa sinh lại sổ: chạy `npm run gen:tenant-registry`.
 */
describe("sổ bảng-thuộc-tenant", () => {
  it("tệp sinh khớp schema hiện tại", () => {
    const expected = buildRegistrySource(readFileSync(SCHEMA_PATH, "utf8"))
    expect(readFileSync(OUTPUT_PATH, "utf8"), "chạy `npm run gen:tenant-registry`").toBe(expected)
  })

  it("mọi bảng TENANT có trong danh sách TENANT_SCOPED_TABLES và ngược lại", () => {
    const tenant = Object.entries(TABLE_REGISTRY).filter(([, e]) => e.scope === "TENANT").map(([n]) => n)
    expect([...TENANT_SCOPED_TABLES]).toEqual(tenant)
  })

  it("cột có tên kiểu dữ liệu cá nhân phải có nhãn `/// @pii` (ADR-014 D-P1)", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8")
    const pattern = /(phone|email|address|tax_code|customer_name|recipient_name|contact_name|vat_company)/i
    const missing: string[] = []
    for (const [, model, body] of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
      for (const line of (body ?? "").split("\n")) {
        const col = line.match(/^\s+(\w+)\s+(String|Json)\??/)?.[1]
        if (col && pattern.test(col) && !TABLE_REGISTRY[model ?? ""]?.pii?.[col]) missing.push(`${model}.${col}`)
      }
    }
    expect(missing, "thêm `/// @pii <loại>` ngay trên cột").toEqual([])
  })

  it("TABLES_CHILD_FIRST: đủ mọi bảng một lần; mọi bảng trỏ tới organizations/users đứng trước chúng", () => {
    expect([...TABLES_CHILD_FIRST].sort()).toEqual(Object.keys(TABLE_REGISTRY).sort())
    const at = (t: string) => TABLES_CHILD_FIRST.indexOf(t)
    for (const [name, entry] of Object.entries(TABLE_REGISTRY)) {
      for (const root of ["organizations", "users"]) {
        if (entry.parents.includes(root)) expect(at(name), `${name} phải đứng trước ${root}`).toBeLessThan(at(root))
      }
    }
  })

  it("bảng tenant chỉ trỏ khoá ngoại tới bảng có trong sổ", () => {
    for (const [name, entry] of Object.entries(TABLE_REGISTRY)) {
      for (const parent of entry.parents) expect(TABLE_REGISTRY[parent], `${name} → ${parent}`).toBeDefined()
    }
  })
})
