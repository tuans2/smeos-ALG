import { describe, expect, it } from "vitest"
import { buildNav } from "../nav-model"
import { PLATFORM_TOOL_REGISTRY } from "@/modules/toolkit/domain/tool-registry"
import { PRIVATE_COLLECTION, PUBLIC_COLLECTION } from "@/modules/toolkit/domain/collection-names"

// PO 09/11/2026: "Bộ sưu tập chung" (/catalog) và "Bộ sưu tập riêng" (/the-chao), kèm mô tả mục đích.
describe("tên hai loại bộ sưu tập trên menu", () => {
  it.each(["FLORAL", "FASHION", "FNB"])("ngành %s: cùng tên + mô tả mục đích", (industry) => {
    const entries = buildNav(() => true, null, industry).groups.flatMap((g) => g.entries)
    expect(entries.find((e) => e.href === "/catalog")).toMatchObject({ label: PUBLIC_COLLECTION.name, hint: PUBLIC_COLLECTION.hint })
    expect(entries.find((e) => e.href === "/the-chao")).toMatchObject({ label: PRIVATE_COLLECTION.name, hint: PRIVATE_COLLECTION.hint })
  })

  it("thư viện công cụ dùng đúng tên và mô tả", () => {
    expect(PLATFORM_TOOL_REGISTRY.find((t) => t.href === "/catalog")).toMatchObject({ name: PUBLIC_COLLECTION.name, description: PUBLIC_COLLECTION.hint })
    expect(PLATFORM_TOOL_REGISTRY.find((t) => t.href === "/the-chao")).toMatchObject({ name: PRIVATE_COLLECTION.name, description: PRIVATE_COLLECTION.hint })
  })

  it("tên ngắn gọn (≤ 5 từ, OPERATING_PRINCIPLES §6)", () => {
    for (const n of [PUBLIC_COLLECTION.name, PRIVATE_COLLECTION.name]) expect(n.split(/\s+/).length).toBeLessThanOrEqual(5)
  })
})
