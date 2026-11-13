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
import { updateLinkCustomer } from "@/modules/greeting-card/use-cases/link-customer"
import { getTrackingPipeline } from "@/modules/greeting-card/use-cases/get-tracking-pipeline"

/** Sale ghi tên khách lên link đã gửi chưa có đơn + thẻ hiện mốc gửi/mở link (PO 16/10/2026). */

const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: ghi tên khách lên link", () => {
  let a: Tenant
  let b: Tenant
  let lan: TenantContext
  let mai: TenantContext

  async function sale(name: string): Promise<TenantContext> {
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const user = await prisma.users.create({ data: { id: randomUUID(), email: `${name}-${randomUUID()}@vi-du.test`, name } })
    await prisma.memberships.create({ data: { id: randomUUID(), organization_id: a.organizationId, user_id: user.id, role_id: saleRole!.id, status: "ACTIVE", joined_at: new Date() } })
    return { ...a.ctx, userId: user.id, capabilities: new Set(["R1", "R2", "R9"]) }
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    lan = await sale("lan")
    mai = await sale("mai")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function linkBy(seller: TenantContext, code: string) {
    const product = await new ProductRepository().create(a.ctx, { code, name: `Bó ${code}`, attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: code.toLowerCase(), name: `Bộ ${code}`, productIds: [product.id], createdBy: a.userId })
    return { ...(await createSendLink(seller, { catalogId: catalog.id })), productId: product.id }
  }

  it("ghi tên + SĐT: danh sách hiện tên thật, kèm lúc tạo link và lúc khách mở", async () => {
    const link = await linkBy(lan, "L1")
    const before = (await getTrackingPipeline(lan)).find((i) => i.sessionId === link.sessionId)
    expect(before).toMatchObject({ customerName: "Khách đang xem mẫu", openedAt: null })
    expect(before?.createdAt).toBeTruthy()

    const openedAt = new Date()
    await prisma.greeting_sessions.update({ where: { id: link.sessionId }, data: { status: "OPENED", opened_at: openedAt } })
    expect(await updateLinkCustomer(lan, link.sessionId, { customerName: "  Chị Lan  ", customerPhone: "0912 345 678" }))
      .toEqual({ customerName: "Chị Lan", customerPhone: "0912345678" })

    const after = (await getTrackingPipeline(lan)).find((i) => i.sessionId === link.sessionId)
    expect(after).toMatchObject({ customerName: "Chị Lan", customerPhone: "0912345678", openedAt: openedAt.toISOString() })
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "greeting_card.link.customer_update" } })).toBe(1)
  })

  it("tổ chức khác 404; sale 'chỉ khách của mình' không sửa link của sale khác (404); dữ liệu sai 422", async () => {
    const link = await linkBy(lan, "L2")
    expect(await codeOf(updateLinkCustomer(b.ctx, link.sessionId, { customerName: "X" }))).toBe("NOT_FOUND")
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_visibility: { mode: "OWN", members: {} } } } })
    expect(await codeOf(updateLinkCustomer(mai, link.sessionId, { customerName: "X" }))).toBe("NOT_FOUND")
    expect(await codeOf(updateLinkCustomer(lan, link.sessionId, { customerName: "   " }))).toBe("VALIDATION_FAILED")
    expect(await codeOf(updateLinkCustomer(lan, link.sessionId, { customerName: "Chị Lan", customerPhone: "123" }))).toBe("VALIDATION_FAILED")
    const row = await prisma.greeting_sessions.findUniqueOrThrow({ where: { id: link.sessionId } })
    expect(row.customer_name).toBeNull()
  })

  it("link đã thành đơn: không sửa được (409) — thông tin khách lấy theo đơn", async () => {
    const link = await linkBy(lan, "L3")
    await selectBrochureProduct(link.sendCode, link.productId)
    await submitBrochureOrder(link.sendCode, ORDER)
    expect(await codeOf(updateLinkCustomer(lan, link.sessionId, { customerName: "Chị Lan" }))).toBe("CONFLICT")
  })
})
