import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { POST as approvePhoto } from "@/app/api/v1/public/brochure/tracking/[code]/approve-photo/route"
import { POST as changeRequest } from "@/app/api/v1/public/brochure/tracking/[code]/change-request/route"
import { POST as flowerResponse } from "@/app/api/v1/public/brochure/tracking/[code]/flower-substitute-response/route"
import { GET as trackingGet, POST as trackingVerify } from "@/app/api/v1/public/brochure/tracking/[code]/route"
import { POST as substituteResponse } from "@/app/api/v1/public/brochure/tracking/[code]/substitute-response/route"
import { POST as catalogAvailability } from "@/app/api/v1/public/greeting-catalog/[id]/check-availability/route"
import { POST as catalogEvent } from "@/app/api/v1/public/greeting-catalog/[id]/event/route"
import { POST as catalogInquiry } from "@/app/api/v1/public/greeting-catalog/[id]/inquiry/route"
import { POST as catalogOrder } from "@/app/api/v1/public/greeting-catalog/[id]/order/route"
import { POST as catalogQuote } from "@/app/api/v1/public/greeting-catalog/[id]/quote/route"
import * as R from "@/app/api/v1/public/_contracts/responses-greeting"
import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { proposeFlowerSubstitute } from "@/modules/greeting-card/use-cases/flower-substitute"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { proposeSubstitute } from "@/modules/greeting-card/use-cases/substitute"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { ownerCookie } from "../helpers/brochure-owner"
import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi — theo dõi đơn Thẻ chào `/public/brochure/tracking/{code}/*` và catalog Thẻ chào
 * `/public/greeting-catalog/{id}/*` (audit API đợt 6). Cũng là test khoá hành vi (B5).
 */
const BASE = "http://localhost/api/v1/public"
const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}
const FLOWERS = [
  { flowerName: "Hồng Ecuador", quantity: 10, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
  { flowerName: "Baby trắng", quantity: 3, unit: "cành", color: "Trắng", role: "Lấp đầy" },
]

describe("hợp đồng — theo dõi đơn & catalog Thẻ chào", () => {
  let a: Tenant
  let staff: TenantContext
  let catalogId: string
  let ids: { x: string; y: string; z: string }

  async function placeOrder() {
    const link = await createSendLink(staff, { catalogId })
    await selectBrochureProduct(link.sendCode, ids.x)
    return { sendCode: link.sendCode, order: await submitBrochureOrder(link.sendCode, ORDER) }
  }
  const post = (url: string, body: unknown, sendCode?: string) =>
    new Request(url, { method: "POST", headers: { "content-type": "application/json", ...(sendCode ? ownerCookie(sendCode) : {}) }, body: JSON.stringify(body) })
  const code = (c: string) => ({ params: Promise.resolve({ code: c }) })
  const cat = () => ({ params: Promise.resolve({ id: catalogId }) })

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("theo-doi-hop-dong")
    staff = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R9"]) }
    const products = new ProductRepository()
    const [x, y, z] = await Promise.all(["X", "Y", "Z"].map((k, i) => products.create(a.ctx, { code: `HD-TD${k}`, name: `Bó ${k}`, attributes: { price: 400000 + i * 50000 } })))
    ids = { x: x!.id, y: y!.id, z: z!.id }
    catalogId = (await new GreetingCardRepository().createCatalog(a.ctx, { code: "hd-td", name: "Bộ theo dõi", productIds: [x!.id, y!.id, z!.id], createdBy: a.userId })).id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("theo dõi đơn: xem (chủ link / người lạ), xác minh SĐT, đổi thông tin, duyệt ảnh", async () => {
    const { sendCode, order } = await placeOrder()
    const c = order.orderCode
    await expectContract(await trackingGet(new Request(`${BASE}/brochure/tracking/${c}?link=${sendCode}`, { headers: ownerCookie(sendCode) }), code(c)), 200, R.trackingResponse, "tracking")
    await expectContract(await trackingGet(new Request(`${BASE}/brochure/tracking/${c}`), code(c)), 200, R.trackingResponse, "tracking")
    await expectContract(await trackingVerify(post(`${BASE}/brochure/tracking/${c}`, { phoneLast4: "4321" }), code(c)), 200, R.trackingResponse, "tracking")
    expect((await trackingVerify(post(`${BASE}/brochure/tracking/${c}`, { phoneLast4: "0000" }), code(c))).status).toBe(404)
    await expectContract(
      await changeRequest(post(`${BASE}/brochure/tracking/${c}/change-request?link=${sendCode}`, { cardMessage: "Chúc mừng sinh nhật mẹ yêu, con thương mẹ" }, sendCode), code(c)),
      201, R.changeRequestResponse, "change-request"
    )
    const asset = await prisma.assets.create({ data: {
      id: randomUUID(), organization_id: a.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
      storage_key: `org/${a.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: a.userId,
    } })
    await prisma.order_qc_records.create({ data: { organization_id: a.organizationId, order_id: order.orderId, notes: "PRODUCT_PHOTO_UPLOADED", image_asset_ids: [asset.id] } })
    await expectContract(await trackingGet(new Request(`${BASE}/brochure/tracking/${c}?link=${sendCode}`, { headers: ownerCookie(sendCode) }), code(c)), 200, R.trackingResponse, "tracking")
    await expectContract(await approvePhoto(post(`${BASE}/brochure/tracking/${c}/approve-photo?link=${sendCode}`, {}, sendCode), code(c)), 200, R.approvePhotoResponse, "approve-photo")
  })

  it("khách trả lời đề xuất thay mẫu", async () => {
    const { sendCode, order } = await placeOrder()
    const proposal = await proposeSubstitute(staff, order.orderId, { reason: "Hoa hồng hôm nay bị dập", productIds: [ids.y, ids.z] })
    const c = order.orderCode
    await expectContract(await trackingGet(new Request(`${BASE}/brochure/tracking/${c}?link=${sendCode}`, { headers: ownerCookie(sendCode) }), code(c)), 200, R.trackingResponse, "tracking")
    await expectContract(
      await substituteResponse(post(`${BASE}/brochure/tracking/${c}/substitute-response?link=${sendCode}`, { proposalId: proposal.id, choice: "OPTION", productId: ids.y }, sendCode), code(c)),
      200, R.substituteResponseResponse, "substitute-response"
    )
  })

  it("khách trả lời đề xuất đổi một loại hoa", async () => {
    const { sendCode, order } = await placeOrder()
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: order.orderId } })
    await prisma.order_items.update({ where: { id: item.id }, data: { metadata: { ...(item.metadata as object), flowers: FLOWERS } } })
    const photo = await prisma.assets.create({ data: {
      id: randomUUID(), organization_id: a.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
      storage_key: `org/${a.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: a.userId,
    } })
    const proposal = await proposeFlowerSubstitute(staff, order.orderId, { reason: "Baby trắng hôm nay hết", lineIndex: 1, replacementName: "Cẩm chướng", replacementColor: "Hồng nhạt", photoAssetId: photo.id })
    const c = order.orderCode
    await expectContract(await trackingGet(new Request(`${BASE}/brochure/tracking/${c}?link=${sendCode}`, { headers: ownerCookie(sendCode) }), code(c)), 200, R.trackingResponse, "tracking")
    await expectContract(
      await flowerResponse(post(`${BASE}/brochure/tracking/${c}/flower-substitute-response?link=${sendCode}`, { proposalId: proposal.id, choice: "ACCEPT" }, sendCode), code(c)),
      200, R.flowerSubstituteResponseResponse, "flower-substitute-response"
    )
  })

  it("catalog Thẻ chào: còn hàng, sự kiện, hỏi mẫu, báo giá, đặt đơn", async () => {
    await expectContract(await catalogAvailability(post(`${BASE}/greeting-catalog/${catalogId}/check-availability`, { productId: ids.x, deliveryDate: DATE }), cat()), 200, R.availabilityResponse, "availability")
    await expectContract(await catalogEvent(post(`${BASE}/greeting-catalog/${catalogId}/event`, { type: "VIEW", visitorId: "khach-hop-dong-01" }), cat()), 202, R.catalogEventResponse, "catalog-event")
    await expectContract(
      await catalogInquiry(post(`${BASE}/greeting-catalog/${catalogId}/inquiry`, { productId: ids.x, customerName: "Khách Hỏi", customerPhone: "0987000111", message: "Mẫu này có màu khác không?" }), cat()),
      201, R.inquiryResponse, "inquiry"
    )
    await expectContract(await catalogQuote(post(`${BASE}/greeting-catalog/${catalogId}/quote`, { productId: ids.x, deliveryDate: DATE }), cat()), 200, R.quoteResponse, "quote")
    const placed = await catalogOrder(post(`${BASE}/greeting-catalog/${catalogId}/order`, { ...ORDER, productId: ids.x, tracking: { channel: "facebook", visitorId: "khach-hop-dong-01" } }), cat())
    await expectContract(placed, 201, R.catalogOrderResponse, "greeting-catalog-order")
  })
})
