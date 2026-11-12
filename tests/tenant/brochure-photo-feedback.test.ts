import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { POST as approvePhoto } from "@/app/api/v1/public/brochure/tracking/[code]/approve-photo/route"
import { POST as photoFeedback } from "@/app/api/v1/public/brochure/tracking/[code]/photo-feedback/route"
import { GET as trackingGet } from "@/app/api/v1/public/brochure/tracking/[code]/route"
import * as R from "@/app/api/v1/public/_contracts/responses-greeting"
import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { ownerCookie } from "../helpers/brochure-owner"
import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 5.13 (GD1 Bước 6, E-10) — khách góp ý ảnh thành phẩm thay vì đồng ý. */
const BASE = "http://localhost/api/v1/public/brochure/tracking"
const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Góp Ý", customerPhone: "0987 650 001", recipientName: "Người Nhận", recipientPhone: "0912 340 001",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}

describe("khách góp ý ảnh thành phẩm", () => {
  let a: Tenant
  let staff: TenantContext
  let catalogId: string
  let productId: string

  const post = (url: string, body: unknown, sendCode?: string) =>
    new Request(url, { method: "POST", headers: { "content-type": "application/json", ...(sendCode ? ownerCookie(sendCode) : {}) }, body: JSON.stringify(body) })
  const code = (c: string) => ({ params: Promise.resolve({ code: c }) })
  const status = async (c: string, sendCode: string) =>
    ((await (await trackingGet(new Request(`${BASE}/${c}?link=${sendCode}`, { headers: ownerCookie(sendCode) }), code(c))).json()) as { order: { photoApproval: { status: string } } }).order.photoApproval.status
  async function uploadPhoto(orderId: string) {
    const asset = await prisma.assets.create({ data: {
      id: randomUUID(), organization_id: a.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
      storage_key: `org/${a.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: a.userId,
    } })
    await prisma.order_qc_records.create({ data: { organization_id: a.organizationId, order_id: orderId, notes: "PRODUCT_PHOTO_UPLOADED", image_asset_ids: [asset.id] } })
  }

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("gop-y-anh")
    staff = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R9"]) }
    const p = await new ProductRepository().create(a.ctx, { code: "GY-1", name: "Bó góp ý", attributes: { price: 450000 } })
    productId = p!.id
    catalogId = (await new GreetingCardRepository().createCatalog(a.ctx, { code: "gop-y", name: "Bộ góp ý", productIds: [productId], createdBy: a.userId })).id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("góp ý dừng tự duyệt, ghi vào đơn; ảnh mới chạy lại đồng hồ; người lạ → 404; góp ý lần hai → 409", async () => {
    const link = await createSendLink(staff, { catalogId })
    await selectBrochureProduct(link.sendCode, productId)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    const c = order.orderCode
    const url = `${BASE}/${c}/photo-feedback?link=${link.sendCode}`

    expect((await photoFeedback(post(url, { message: "Cho thêm hoa trắng" }, link.sendCode), code(c))).status).toBe(409)
    await uploadPhoto(order.orderId)
    expect(await status(c, link.sendCode)).toBe("PENDING")

    expect((await photoFeedback(post(url, { message: "Cho thêm hoa trắng" }), code(c))).status).toBe(404)
    expect((await photoFeedback(post(url, { message: "ok" }, link.sendCode), code(c))).status).toBe(400)
    await expectContract(await photoFeedback(post(url, { message: "Cho thêm hoa trắng, bó tròn hơn" }, link.sendCode), code(c)), 201, R.photoFeedbackResponse, "photo-feedback")
    expect(await status(c, link.sendCode)).toBe("FEEDBACK")
    expect((await photoFeedback(post(url, { message: "Thêm nơ đỏ" }, link.sendCode), code(c))).status).toBe(409)

    const saved = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId }, select: { internal_note: true } })
    expect(saved.internal_note).toContain("[Khách góp ý ảnh] Cho thêm hoa trắng, bó tròn hơn")
    expect(await prisma.order_qc_records.count({ where: { order_id: order.orderId, notes: "CUSTOMER_PHOTO_FEEDBACK", status: "REWORK_REQUESTED" } })).toBe(1)

    await new Promise((r) => setTimeout(r, 5))
    await uploadPhoto(order.orderId)
    expect(await status(c, link.sendCode)).toBe("PENDING")
    expect((await approvePhoto(post(`${BASE}/${c}/approve-photo?link=${link.sendCode}`, {}, link.sendCode), code(c))).status).toBe(200)
    expect(await status(c, link.sendCode)).toBe("APPROVED")
    expect((await photoFeedback(post(url, { message: "Thêm nơ đỏ" }, link.sendCode), code(c))).status).toBe(409)
  })
})
