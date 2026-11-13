import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { recordCatalogEvent } from "@/modules/greeting-card/use-cases/catalog-channel-events"
import { recordCustomerJourneyEvent } from "@/modules/greeting-card/use-cases/customer-journey"
import { getCatalogHearts } from "@/modules/greeting-card/use-cases/get-catalog-hearts"

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

/** Tổng tim của bộ sưu tập: link riêng + link công khai, 1 tim/khách/mẫu, cách ly tổ chức. */
describe("greeting-card: mẫu được thả tim nhiều nhất", () => {
  let a: Tenant
  let b: Tenant
  let catalogId: string
  let p1: string
  let p2: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const products = new ProductRepository()
    p1 = (await products.create(a.ctx, { code: "FL-1", name: "Hồng" })).id
    p2 = (await products.create(a.ctx, { code: "FL-2", name: "Cúc" })).id
    catalogId = (await new GreetingCardRepository().createCatalog(a.ctx, { code: "bst", name: "BST", productIds: [p1, p2], createdBy: a.userId })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("cộng link công khai + link riêng; thả lặp tính 1; bỏ tim thì trừ", async () => {
    const pub = (visitorId: string, type: "LIKE" | "UNLIKE", productId: string) =>
      recordCatalogEvent({ catalogId, channel: "zalo", eventType: type, visitorId, productId })
    expect(await pub("visitor-0001", "LIKE", p2)).toBe(true)
    expect(await pub("visitor-0001", "LIKE", p2)).toBe(true)
    expect(await pub("visitor-0002", "LIKE", p2)).toBe(true)
    expect(await pub("visitor-0002", "LIKE", p1)).toBe(true)
    expect(await pub("visitor-0002", "UNLIKE", p1)).toBe(true)

    const link = await createSendLink(a.ctx, { catalogId })
    await recordCustomerJourneyEvent(link.sendCode, { event: "product_liked", productId: p1 })

    const res = await getCatalogHearts(a.ctx, catalogId)
    expect(res.totalHearts).toBe(3)
    expect(res.rows.map((r) => [r.code, r.hearts, r.privateHearts, r.publicHearts])).toEqual([
      ["FL-2", 2, 0, 2],
      ["FL-1", 1, 1, 0],
    ])
  })

  it("tim cho mẫu không thuộc bộ sưu tập bị từ chối; tổ chức khác đọc bảng → 404", async () => {
    const foreign = (await new ProductRepository().create(b.ctx, { code: "X", name: "Lạ" })).id
    expect(await recordCatalogEvent({ catalogId, channel: "zalo", eventType: "LIKE", visitorId: "visitor-0003", productId: foreign })).toBe(false)
    expect(await codeOf(getCatalogHearts(b.ctx, catalogId))).toBe("NOT_FOUND")
  })
})
