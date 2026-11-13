import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { ProductLookupResult } from "@/modules/products/domain/product-lookup"
import { needsScan, parseScanParams, scanProducts } from "../scan-products"

const ctx = { organizationId: "org-1", userId: "u-1" } as unknown as TenantContext

function product(i: number, name: string, price: number | null): ProductLookupResult {
  return {
    id: `p${i}`, code: `C${i}`, name, category: null, shape: null, facing: null, container: null,
    status: "ACTIVE", branch_id: null, price_vnd: price, pricing: null, redacted_fields: [],
    attributes: price === null ? null : { price },
    commerce: { barcode: null, cost_price_vnd: null, vat_percent: null, weight_grams: null, tags: [] },
  }
}

/** 250 sản phẩm chia 3 trang server; chỉ sản phẩm chia hết cho 50 là "kệ hoa viếng". */
const ALL = Array.from({ length: 250 }, (_, i) => product(i, i % 50 === 0 ? `Kệ hoa viếng ${i}` : `Bó hồng ${i}`, 100_000 + i * 1000))
const list = vi.fn(async (_c: TenantContext, _f: unknown, o: { limit?: number; cursor?: string | null }) => {
  const start = o.cursor ? Number(o.cursor) : 0
  const end = start + (o.limit ?? 100)
  return { data: ALL.slice(start, end), next_cursor: end < ALL.length ? String(end) : null }
})

describe("scanProducts", () => {
  it("only scans when occasion/price/sort is set", () => {
    expect(needsScan({})).toBe(false)
    expect(needsScan({ occasion: "all", priceRange: "all", sortBy: "default" })).toBe(false)
    expect(needsScan({ occasion: "chia_buon" })).toBe(true)
    expect(needsScan({ sortBy: "price_desc" })).toBe(true)
  })

  it("finds matches beyond the first server page and counts them over the whole catalogue", async () => {
    const res = await scanProducts(ctx, {}, { occasion: "chia_buon" }, { limit: 2 }, list as never)
    expect(res.total).toBe(5)
    expect(res.data.map((p) => p.id)).toEqual(["p0", "p50"])
    expect(res.next_cursor).toBe("o:2")
    const next = await scanProducts(ctx, {}, { occasion: "chia_buon" }, { limit: 2, cursor: res.next_cursor }, list as never)
    expect(next.data.map((p) => p.id)).toEqual(["p100", "p150"])
  })

  it("sorts across all pages", async () => {
    const res = await scanProducts(ctx, {}, { sortBy: "price_desc" }, { limit: 1 }, list as never)
    expect(res.data[0]?.id).toBe("p249")
    expect(res.total).toBe(250)
    expect(res.truncated).toBe(false)
  })

  it("parses query params and rejects unknown values", () => {
    expect(parseScanParams(new URLSearchParams("occasion=chia_buon&sort=price_asc"))).toEqual({ occasion: "chia_buon", sortBy: "price_asc" })
    expect(parseScanParams(new URLSearchParams("price_range=custom&price_min=100&price_max=900"))).toEqual({
      priceRange: "custom",
      customMinPrice: 100,
      customMaxPrice: 900,
    })
    expect(() => parseScanParams(new URLSearchParams("occasion=xyz"))).toThrow()
    expect(() => parseScanParams(new URLSearchParams("sort=random"))).toThrow()
  })

  it("rejects a malformed cursor", async () => {
    await expect(scanProducts(ctx, {}, { sortBy: "name_asc" }, { limit: 1, cursor: "abc" }, list as never)).rejects.toThrow()
  })
})
