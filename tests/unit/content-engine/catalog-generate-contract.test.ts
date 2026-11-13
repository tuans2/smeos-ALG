import { describe, expect, it, vi } from "vitest"

/**
 * `POST /content-engine/catalog-generate` nằm trong vùng Catalog đóng băng (PO 01/11/2026) nên tự khai lược đồ thân;
 * OpenAPI nội bộ dùng bản sao `catalogGenerateBody` ở `_contracts/requests-content.ts`. Cùng bộ mẫu gửi tới route thật
 * và bản sao — kết luận nhận/từ chối phải trùng.
 */
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({
  requireTenantContext: async () => ({ ctx: { organizationId: "org-1", userId: "u-1", capabilities: new Set(["J7"]) } }),
}))
vi.mock("@/modules/profiles/use-cases/get-business-profile", () => ({ getBusinessProfile: async () => null }))
vi.mock("@/modules/product-copies/use-cases/get-approved-selling-notes", () => ({ getApprovedSellingNotes: async () => new Map() }))
vi.mock("@/modules/content-engine/use-cases/generate-catalog-content.use-case", () => ({ executeGenerateCatalogContent: async () => ({ title: "x" }) }))

import { catalogGenerateBody } from "@/app/api/v1/_contracts/requests-content"
import { POST } from "@/app/api/v1/content-engine/catalog-generate/route"

const ok = { collectionName: "Hoa Tết 2027" }
const SAMPLES: unknown[] = [
  ok,
  { ...ok, occasion: "Tết", productCount: 3, styleVariant: "EDITORIAL_LOOKBOOK", userDirectives: "ấm áp", productIds: ["p-1"] },
  {},
  { collectionName: "" },
  { ...ok, productCount: -1 },
  { ...ok, productCount: 1.5 },
  { ...ok, styleVariant: "KHAC" },
  { ...ok, productIds: Array.from({ length: 51 }, (_, i) => `p-${i}`) },
  { ...ok, productIds: ["x".repeat(65)] },
  null,
]

describe("bản sao lược đồ catalog-generate khớp route đóng băng", () => {
  it.each(SAMPLES.map((s) => [JSON.stringify(s)?.slice(0, 60), s]))("%s", async (_label, sample) => {
    const res = await POST(new Request("http://localhost/api/v1/content-engine/catalog-generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sample) }))
    expect(res.status === 200, `HTTP ${res.status}`).toBe(catalogGenerateBody.safeParse(sample).success)
  })
})
