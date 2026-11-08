import { beforeEach, describe, expect, it, vi } from "vitest"

/** PO 07/11/2026 (audit API-09): `GET /public/catalog/{slug}` giới hạn 60 lần/phút/IP. */
const getPublicCatalog = vi.fn(async () => ({ status: "REVOKED", catalogName: "Tết" }))
vi.mock("@/modules/catalog-links/use-cases/get-public-catalog", () => ({ getPublicCatalog: () => getPublicCatalog() }))

import { resetRateLimits } from "@/core/http/rate-limit"
import { GET } from "@/app/api/v1/public/catalog/[slug]/route"

const view = (ip: string) =>
  GET(new Request("http://localhost/api/v1/public/catalog/bst-tet", { headers: { "x-forwarded-for": ip } }), {
    params: Promise.resolve({ slug: "bst-tet" }),
  })

describe("GET /public/catalog/{slug} — giới hạn tần suất", () => {
  beforeEach(() => {
    resetRateLimits()
    getPublicCatalog.mockClear()
  })

  it("60 lần/phút mỗi IP; lần 61 → 429 kèm Retry-After, không đọc catalog", async () => {
    for (let i = 0; i < 60; i++) expect((await view("203.0.113.7")).status).toBe(200)
    const res = await view("203.0.113.7")
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).not.toBeNull()
    expect(getPublicCatalog).toHaveBeenCalledTimes(60)
  })

  it("IP khác vẫn xem được", async () => {
    for (let i = 0; i < 61; i++) await view("203.0.113.7")
    expect((await view("198.51.100.9")).status).toBe(200)
  })
})
