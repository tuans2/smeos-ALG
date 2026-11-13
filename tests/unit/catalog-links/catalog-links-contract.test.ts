import { describe, expect, it, vi } from "vitest"

/**
 * `/catalog-links` nằm trong vùng Catalog đóng băng (PO 01/11/2026) nên tự khai lược đồ; OpenAPI nội bộ dùng bản sao ở
 * `_contracts/requests-final.ts`. Cùng bộ mẫu gửi tới route thật và bản sao — kết luận nhận/từ chối phải trùng.
 */
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({
  requireTenantContext: async () => ({ ctx: { organizationId: "org-1", userId: "u-1", capabilities: new Set(["J1", "J2"]) } }),
}))
vi.mock("@/modules/catalog-links/use-cases/create-catalog-link", () => ({ createCatalogLink: async () => ({ slug: "x" }) }))
vi.mock("@/modules/catalog-links/use-cases/list-catalog-links", () => ({ listCatalogLinks: async () => [] }))
vi.mock("@/modules/catalog-links/use-cases/update-catalog-link", () => ({ updateCatalogLink: async () => ({ slug: "x" }) }))
vi.mock("@/modules/catalog-links/use-cases/get-catalog-link", () => ({ getCatalogLinkBySlug: async () => null }))

import { catalogLinksQuery, createCatalogLinkBody, updateCatalogLinkBody } from "@/app/api/v1/_contracts/requests-final"
import { PATCH } from "@/app/api/v1/catalog-links/[slug]/route"
import { GET, POST } from "@/app/api/v1/catalog-links/route"

const BASE = "http://localhost/api/v1/catalog-links"
const send = (method: string, url: string, body: unknown) =>
  new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const ok = (status: number) => status >= 200 && status < 300

const CREATE: unknown[] = [
  { name: "Hoa Tết" },
  { name: "Hoa Tết", slug: "hoa-tet", description: null, filters: { tag: "tet" } },
  { name: "" },
  { slug: "" , name: "x" },
  { name: "x", filters: "khong-phai-doi-tuong" },
  {},
  null,
]
const PATCHES: unknown[] = [{}, { name: "Mới" }, { description: null }, { name: "" }, { filters: [1] }, null]
const QUERIES = ["", "?include_revoked=true", "?include_revoked=0", "?include_revoked=abc"]

describe("bản sao lược đồ catalog-links khớp route đóng băng", () => {
  it.each(CREATE.map((s) => [JSON.stringify(s), s]))("POST %s", async (_l, sample) => {
    expect(ok((await POST(send("POST", BASE, sample))).status)).toBe(createCatalogLinkBody.safeParse(sample).success)
  })
  it.each(PATCHES.map((s) => [JSON.stringify(s), s]))("PATCH %s", async (_l, sample) => {
    const res = await PATCH(send("PATCH", `${BASE}/x`, sample), { params: Promise.resolve({ slug: "x" }) })
    expect(ok(res.status)).toBe(updateCatalogLinkBody.safeParse(sample).success)
  })
  it.each(QUERIES.map((q) => [q || "(trống)", q]))("GET %s", async (_l, q) => {
    const res = await GET(new Request(`${BASE}${q}`))
    expect(ok(res.status)).toBe(catalogLinksQuery.safeParse(Object.fromEntries(new URL(`${BASE}${q}`).searchParams)).success)
  })
})
