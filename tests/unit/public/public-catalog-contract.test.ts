import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"

/**
 * Hai route `public/catalog/{slug}/lead|order` nằm trong vùng Catalog đóng băng nên tự khai lược đồ; OpenAPI
 * dùng bản sao ở `_contracts/requests.ts`. Cùng bộ mẫu gửi tới route thật và bản sao — kết luận phải trùng.
 */
const captureCatalogLead = vi.fn(async () => ({ leadId: "l-1" }))
const placePublicCatalogOrder = vi.fn(async () => ({ orderCode: "DH-1", totalVnd: 1, needsQuote: false, payment: null }))
vi.mock("@/modules/acquisition/use-cases/capture-lead", () => ({ captureCatalogLead: () => captureCatalogLead() }))
vi.mock("@/modules/orders/use-cases/place-public-catalog-order", () => ({ placePublicCatalogOrder: () => placePublicCatalogOrder() }))

import { POST as leadRoute } from "@/app/api/v1/public/catalog/[slug]/lead/route"
import { POST as orderRoute } from "@/app/api/v1/public/catalog/[slug]/order/route"
import { catalogLeadBody, catalogOrderBody } from "@/app/api/v1/public/_contracts/requests"
import { resetRateLimits } from "@/core/http/rate-limit"

const send = (body: unknown) => new Request("http://localhost/api/v1/public/catalog/c/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const params = { params: Promise.resolve({ slug: "c" }) }
const accepts = (schema: z.ZodType, value: unknown) => schema.safeParse(value).success
const lead = { name: "Lan", phone: "0901234567", consent: true }
const order = { productId: "p-1", quantity: 1, name: "Mai", phone: "0907654321", address: "12 Lê Lợi" }

const LEAD_SAMPLES: unknown[] = [lead, { ...lead, message: "Hỏi giá", ref: "abc", utm: { source: "fb" } }, {}, { ...lead, consent: "yes" }, { ...lead, name: "x".repeat(201) }, { ...lead, utm: { source: "x".repeat(101) } }, null]
const ORDER_SAMPLES: unknown[] = [order, { ...order, deliveryDate: "2026-11-20", timeSlot: "08:00 - 10:00", note: "Gọi trước" }, {}, { ...order, quantity: 1.5 }, { ...order, address: "x".repeat(601) }, { ...order, productId: 5 }, null]

describe("bản sao lược đồ Catalog công khai khớp route đóng băng", () => {
  beforeEach(() => resetRateLimits())

  it.each(LEAD_SAMPLES.map((s) => [JSON.stringify(s)?.slice(0, 60), s]))("lead %s", async (_l, sample) => {
    const res = await leadRoute(send(sample), params)
    expect(res.status === 201, `HTTP ${res.status}`).toBe(accepts(catalogLeadBody, sample))
  })

  it.each(ORDER_SAMPLES.map((s) => [JSON.stringify(s)?.slice(0, 60), s]))("order %s", async (_l, sample) => {
    const res = await orderRoute(send(sample), params)
    expect(res.status === 201, `HTTP ${res.status}`).toBe(accepts(catalogOrderBody, sample))
  })
})
