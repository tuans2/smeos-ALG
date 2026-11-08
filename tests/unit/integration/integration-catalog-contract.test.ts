import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"

/**
 * Ba route `integration/catalog-links*` nằm trong vùng Catalog đóng băng nên tự khai lược đồ; OpenAPI dùng
 * bản sao ở `contracts/http-requests.ts`. Test này gửi cùng một bộ mẫu tới CHÍNH route đóng băng và tới
 * bản sao: kết luận hợp lệ/không hợp lệ phải trùng nhau (audit API đợt 4, 07/11/2026).
 */
const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u-1", branchId: null, capabilities: new Set(["J1", "J2"]) }
vi.mock("@/modules/integration/use-cases/resolve-integration-context", () => ({
  requireIntegrationContext: async () => ({ source: "sso", organizationId: "org-a", userId: "u-1" }),
  toTenantContext: async () => ctx,
}))
const link = { id: "l-1", slug: "bst-tet" }
const createCatalogLink = vi.fn(async () => link)
const updateCatalogLink = vi.fn(async () => link)
const listCatalogLinks = vi.fn<(...args: unknown[]) => Promise<(typeof link)[]>>(async () => [link])
vi.mock("@/modules/catalog-links/use-cases/create-catalog-link", () => ({ createCatalogLink: () => createCatalogLink() }))
vi.mock("@/modules/catalog-links/use-cases/update-catalog-link", () => ({ updateCatalogLink: () => updateCatalogLink() }))
vi.mock("@/modules/catalog-links/use-cases/list-catalog-links", () => ({ listCatalogLinks: (...args: unknown[]) => listCatalogLinks(...args) }))

import { GET as listRoute, POST as createRoute } from "@/app/api/v1/integration/catalog-links/route"
import { PATCH as updateRoute } from "@/app/api/v1/integration/catalog-links/[slug]/route"
import { createCatalogLinkBody, listCatalogLinksQuery, updateCatalogLinkBody } from "@/modules/integration/contracts/http-requests"

const BASE = "http://localhost/api/v1/integration/catalog-links"
const send = (method: string, body: unknown) =>
  new Request(BASE, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const slugParams = { params: Promise.resolve({ slug: "bst-tet" }) }

const CREATE_SAMPLES: unknown[] = [
  { slug: "bst-tet", name: "Bộ sưu tập Tết" },
  { slug: "bst-tet", name: "Tết", description: null, filters: { category: "bo-hoa" } },
  { slug: "bst-tet", name: "Tết", filters: null },
  {},
  { slug: "", name: "Tết" },
  { slug: "bst-tet", name: "" },
  { slug: "bst-tet", name: "Tết", filters: "bo-hoa" },
  { slug: "bst-tet", name: "Tết", description: 5 },
  null,
]
const UPDATE_SAMPLES: unknown[] = [{}, { name: "Mới" }, { description: null, filters: null }, { name: "" }, { filters: [1] }, null]
const QUERY_SAMPLES = ["", "?include_revoked=true", "?include_revoked=1", "?include_revoked=false", "?include_revoked=0", "?include_revoked=khong"]

async function verdict(response: Response): Promise<boolean> {
  if (response.status === 400) return false
  expect(response.status).toBeLessThan(300)
  return true
}

const accepts = (schema: z.ZodType, value: unknown) => schema.safeParse(value).success

describe("bản sao lược đồ Catalog khớp route đóng băng", () => {
  beforeEach(() => {
    createCatalogLink.mockClear()
    updateCatalogLink.mockClear()
  })

  it.each(CREATE_SAMPLES.map((sample) => [JSON.stringify(sample), sample]))("POST %s", async (_label, sample) => {
    expect(await verdict(await createRoute(send("POST", sample)))).toBe(accepts(createCatalogLinkBody, sample))
  })

  it.each(UPDATE_SAMPLES.map((sample) => [JSON.stringify(sample), sample]))("PATCH %s", async (_label, sample) => {
    expect(await verdict(await updateRoute(send("PATCH", sample), slugParams))).toBe(accepts(updateCatalogLinkBody, sample))
  })

  it.each(QUERY_SAMPLES)("GET %s", async (query) => {
    const route = await listRoute(new Request(`${BASE}${query}`))
    const value = Object.fromEntries(new URL(`${BASE}${query}`).searchParams)
    expect(await verdict(route)).toBe(accepts(listCatalogLinksQuery, value))
  })

  // `z.coerce.boolean()` từng đọc "false" thành true — PO 07/11/2026 cho sửa (audit đợt 4, phát hiện ngoài phạm vi)
  it.each([
    ["?include_revoked=false", false],
    ["?include_revoked=0", false],
    ["", false],
    ["?include_revoked=true", true],
  ] as const)("GET %s → includeRevoked %s", async (query, expected) => {
    listCatalogLinks.mockClear()
    await listRoute(new Request(`${BASE}${query}`))
    expect(listCatalogLinks).toHaveBeenCalledWith(ctx, { includeRevoked: expected })
  })
})
