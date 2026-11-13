import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { CatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import { BrochureCheckoutRepository } from "@/modules/greeting-card/infra/brochure-checkout-repository"
import { isActiveOrgMember } from "@/modules/orders/infra/order-lead-link"
import { PublicOrderRepository } from "@/modules/orders/infra/public-order-repository"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { placePublicCatalogOrder } from "@/modules/orders/use-cases/place-public-catalog-order"
import { assertAcceptingPublicOrders } from "@/modules/subscription/use-cases/public-order-guard"

/**
 * Đặt hàng công khai: đơn, khách và lead gắn vào đúng tổ chức của catalog (không nhận tổ chức từ client).
 * Trang catalog (sản phẩm/giá) được thay bằng bản cố định — phần đó có ca thử riêng.
 */
describe("cách ly tenant — đặt hàng trên catalog công khai", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await createCatalogLink({ ...a.ctx, capabilities: new Set([...a.ctx.capabilities, "J1"]) }, { slug: "catalog-a", name: "A", description: null, filters: null })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đơn vào tổ chức của catalog, gắn lead mở cùng SĐT của chính tổ chức đó", async () => {
    const leadB = await prisma.leads.create({
      data: { organization_id: b.organizationId, name: "Lan", phone: "0901234567", source: "MANUAL", consent_at: new Date(), consent_version: "x" },
    })
    // Sản phẩm phải có thật: order_items.product_id có khoá ngoại về products.
    const product = await prisma.products.create({ data: { organization_id: a.organizationId, code: "HH01", name: "Bó hồng" } })
    const r = await placePublicCatalogOrder("catalog-a", { productId: product.id, quantity: 1, name: "Lan", phone: "0901234567", address: "12 Lê Lợi" }, undefined, {
      catalogLinks: new CatalogLinkRepository(),
      catalog: async () => ({ status: "ACTIVE", entryActions: { order: true, contact: true }, products: [{ id: product.id, code: "HH01", name: "Bó hồng", price: 450_000 }] }) as never,
      repo: new PublicOrderRepository(),
      customers: new BrochureCheckoutRepository(),
      isMember: isActiveOrgMember,
      ingest: ingestOrder,
      verifier: { name: "test", verify: async () => true },
      now: () => new Date(),
      acceptsOrders: assertAcceptingPublicOrders,
    })
    const order = await prisma.orders.findFirstOrThrow({ where: { code: r.orderCode } })
    expect(order).toMatchObject({ organization_id: a.organizationId, source: "CATALOG", lead_id: null })
    const customer = await prisma.customers.findUniqueOrThrow({ where: { id: order.customer_id! } })
    expect(customer.organization_id).toBe(a.organizationId)
    expect((await prisma.leads.findUniqueOrThrow({ where: { id: leadB.id } })).converted_order_id).toBeNull()
    expect(await prisma.orders.count({ where: { organization_id: b.organizationId } })).toBe(0)
  })
})
