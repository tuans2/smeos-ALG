import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { getTrackingPipeline } from "@/modules/greeting-card/use-cases/get-tracking-pipeline"
import { createShareLink, listShareLinks, markSendLinkCopied, openShareLink } from "@/modules/greeting-card/use-cases/share-links"

/** Link sao chép mang tên người bấm (PO 06/10/2026): mọi đơn đều có người phụ trách. */

const ORDER = {
  customerName: "Khách Hoa", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: link sao chép mang tên người bấm", () => {
  let a: Tenant
  let b: Tenant
  let lan: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const user = await prisma.users.create({ data: { id: randomUUID(), email: `lan-${randomUUID()}@vi-du.test`, name: "Lan" } })
    await prisma.memberships.create({ data: { id: randomUUID(), organization_id: a.organizationId, user_id: user.id, role_id: saleRole!.id, status: "ACTIVE", joined_at: new Date() } })
    lan = { ...a.ctx, userId: user.id, capabilities: new Set(["R1", "R2", "R9"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalogWithProduct() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-S", name: "Bó S", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-s", name: "Bộ S", productIds: [product.id], createdBy: a.userId })
    return { product, catalog }
  }

  it("link bộ sưu tập Lan sao chép: mỗi khách mở một phiên của Lan; đặt đơn → đơn của Lan", async () => {
    const { product, catalog } = await catalogWithProduct()
    const share = await createShareLink(lan, { catalogId: catalog.id, channel: "facebook" })
    expect(share.path).toMatch(/^\/s\/[0-9A-Z]{10}$/)

    const first = await openShareLink(share.code, null)
    const again = await openShareLink(share.code, first!.sendCode) // tải lại trang — cùng khách
    const second = await openShareLink(share.code, null) // khách khác trên Fanpage
    expect(again!.sendCode).toBe(first!.sendCode)
    expect(second!.sendCode).not.toBe(first!.sendCode)

    const sessions = await prisma.greeting_sessions.findMany({ where: { organization_id: a.organizationId } })
    expect(sessions.map((s) => s.sale_id)).toEqual([lan.userId, lan.userId])

    await selectBrochureProduct(first!.sendCode, product.id)
    const order = await submitBrochureOrder(first!.sendCode, ORDER)
    const items = await getTrackingPipeline(a.ctx)
    expect(items.find((i) => i.orderId === order.orderId)).toMatchObject({ saleName: "Lan", linkKind: "SHARED", channel: "Link bộ sưu tập · Facebook", customerName: "Khách Hoa" })
    expect(items.find((i) => i.sendCode === second!.sendCode)).toMatchObject({ type: "SESSION", saleName: "Lan", currentStepTitle: "Khách đã mở — đang xem mẫu" })

    expect((await listShareLinks(lan))[0]).toMatchObject({ ownerName: "Lan", opens: 2, orders: 1, channel: "Facebook" })
  })

  it("link riêng: chưa sao chép thì chưa tính giờ; sao chép xong mới bắt đầu tính 'khách chưa mở'", async () => {
    const { catalog } = await catalogWithProduct()
    const link = await createSendLink(lan, { catalogId: catalog.id })
    await prisma.greeting_sessions.updateMany({ where: { send_code: link.sendCode }, data: { created_at: new Date(Date.now() - 60 * 60_000) } })
    let row = (await getTrackingPipeline(a.ctx)).find((i) => i.sendCode === link.sendCode)
    expect(row).toMatchObject({ currentStepTitle: "Đã tạo link — chưa sao chép gửi khách", stuck: null, copiedAt: null })

    await markSendLinkCopied(lan, link.sendCode)
    await markSendLinkCopied(lan, link.sendCode) // chép lại — giữ mốc đầu
    expect(await prisma.greeting_journey_events.count({ where: { organization_id: a.organizationId, event_type: "LINK_COPIED" } })).toBe(1)
    row = (await getTrackingPipeline(a.ctx)).find((i) => i.sendCode === link.sendCode)
    expect(row?.currentStepTitle).toBe("Đã gửi link — khách chưa mở")
    expect(row?.stuck).toBeNull() // vừa gửi, chưa quá 5 phút
    expect(Date.parse(row!.stepStartedAt)).toBeGreaterThan(Date.now() - 60_000)
  })

  it("đơn từ link cũ (không qua nút Sao chép) giao cho người Điều hành chọn, mặc định chủ tiệm", async () => {
    const { product, catalog } = await catalogWithProduct()
    const o1 = await submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id })
    expect((await prisma.greeting_sessions.findFirstOrThrow({ where: { order_id: o1.orderId } })).sale_id).toBe(a.userId)

    // Đơn cũ ghi "public" (trước tính năng này) vẫn hiện người phụ trách mặc định
    await prisma.greeting_sessions.updateMany({ where: { order_id: o1.orderId }, data: { sale_id: "public" } })
    expect((await getTrackingPipeline(a.ctx)).find((i) => i.orderId === o1.orderId)).toMatchObject({ saleName: "Người dùng alpha", saleId: a.userId })

    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_default_owner: { user_id: lan.userId } } } })
    expect((await getTrackingPipeline(a.ctx)).find((i) => i.orderId === o1.orderId)?.saleName).toBe("Lan")
    const o2 = await submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id, customerPhone: "0987654322" })
    expect((await prisma.greeting_sessions.findFirstOrThrow({ where: { order_id: o2.orderId } })).sale_id).toBe(lan.userId)
  })

  it("cách ly tổ chức: không sao chép bộ sưu tập / không ghi mốc link của tiệm khác; mã sai → null", async () => {
    const { catalog } = await catalogWithProduct()
    const link = await createSendLink(lan, { catalogId: catalog.id })
    expect(await codeOf(createShareLink(b.ctx, { catalogId: catalog.id }))).toBe("NOT_FOUND")
    expect(await codeOf(markSendLinkCopied(b.ctx, link.sendCode))).toBe("NOT_FOUND")
    expect(await openShareLink("KHONGCOMA1", null)).toBeNull()
    expect(await openShareLink("abc", null)).toBeNull()
    expect(await prisma.greeting_share_links.count({ where: { organization_id: b.organizationId } })).toBe(0)
  })
})
