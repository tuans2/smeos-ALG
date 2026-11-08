import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { POST as checkAvailability } from "@/app/api/v1/public/brochure/[sendCode]/check-availability/route"
import { POST as claim } from "@/app/api/v1/public/brochure/[sendCode]/claim/route"
import { POST as journeyEvent } from "@/app/api/v1/public/brochure/[sendCode]/event/route"
import { GET as history } from "@/app/api/v1/public/brochure/[sendCode]/history/route"
import { POST as inquiry } from "@/app/api/v1/public/brochure/[sendCode]/inquiry/route"
import { POST as open } from "@/app/api/v1/public/brochure/[sendCode]/open/route"
import { POST as order } from "@/app/api/v1/public/brochure/[sendCode]/order/route"
import { POST as paymentNotify } from "@/app/api/v1/public/brochure/[sendCode]/payment-notify/route"
import { POST as paymentProof } from "@/app/api/v1/public/brochure/[sendCode]/payment-proof/route"
import { POST as quote } from "@/app/api/v1/public/brochure/[sendCode]/quote/route"
import { POST as reorder } from "@/app/api/v1/public/brochure/[sendCode]/reorder/route"
import { GET as view } from "@/app/api/v1/public/brochure/[sendCode]/route"
import { POST as select } from "@/app/api/v1/public/brochure/[sendCode]/select/route"
import { POST as unlock } from "@/app/api/v1/public/brochure/[sendCode]/unlock/route"
import * as R from "@/app/api/v1/public/_contracts/responses-greeting"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { ownerCookie } from "../helpers/brochure-owner"
import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi — phiên khách Thẻ chào `/public/brochure/{sendCode}/*` (audit API đợt 6, PO 07/11/2026).
 * Đi đúng một vòng của khách: nhận phiên → xem → chọn mẫu → hỏi giá → đặt → báo đã chuyển khoản → xem lịch
 * sử → mở khoá trên máy khác → đặt thêm. Đây cũng là test khoá hành vi (B5) trước khi chạm route Thẻ chào.
 */
const BASE = "http://localhost/api/v1/public/brochure"
const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)

describe("hợp đồng — phiên khách Thẻ chào", () => {
  let a: Tenant
  let sendCode: string
  let productId: string
  const ps = () => ({ params: Promise.resolve({ sendCode }) })
  const req = (path: string, body?: unknown, owner = true) =>
    new Request(`${BASE}/${sendCode}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(owner ? ownerCookie(sendCode) : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("the-chao-hop-dong")
    const products = new ProductRepository()
    const x = await products.create(a.ctx, { code: "HD-TC1", name: "Bó hồng đỏ", attributes: { price: 500000 } })
    const y = await products.create(a.ctx, { code: "HD-TC2", name: "Bó cúc trắng", attributes: { price: 350000 } })
    productId = x.id
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "hd-tc", name: "Bộ hợp đồng", productIds: [x.id, y.id], createdBy: a.userId })
    sendCode = (await createSendLink(a.ctx, { catalogId: catalog.id })).sendCode
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("một vòng đặt hàng của khách", async () => {
    await expectContract(await claim(req("/claim", {}, false), ps()), 200, R.brochureClaimResponse, "brochure-claim")
    await expectContract(await view(req(""), ps()), 200, R.brochureViewResponse, "brochure-view")
    await expectContract(await open(req("/open", {}), ps()), 200, R.brochureOpenResponse, "brochure-open")
    await expectContract(await journeyEvent(req("/event", { event: "product_viewed", productId }), ps()), 200, R.brochureEventResponse, "brochure-event")
    await expectContract(await select(req("/select", { productId }), ps()), 200, R.brochureSelectResponse, "brochure-select")
    await expectContract(await view(req(""), ps()), 200, R.brochureViewResponse, "brochure-view")
    await expectContract(await checkAvailability(req("/check-availability", { productId, deliveryDate: DATE }), ps()), 200, R.availabilityResponse, "availability")
    await expectContract(
      await inquiry(req("/inquiry", { productId, customerName: "Khách Hỏi", customerPhone: "0987654321", message: "Mẫu này còn không ạ?" }), ps()),
      201, R.inquiryResponse, "inquiry"
    )
    await expectContract(await quote(req("/quote", { deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00" }), ps()), 200, R.quoteResponse, "quote")
    await expectContract(await quote(req("/quote", { voucherCode: "KHONG-CO" }), ps()), 200, R.quoteResponse, "quote")
    await expectContract(
      await order(req("/order", {
        customerName: "Khách Hàng", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
        confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00",
        deliveryAddress: "123 Đường Hoa, Quận 1, TP.HCM", cardMessage: "Chúc mừng sinh nhật mẹ",
      }), ps()),
      201, R.brochureOrderResponse, "brochure-order"
    )
    await expectContract(await view(req(""), ps()), 200, R.brochureViewResponse, "brochure-view")

    const form = new FormData()
    form.set("file", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])], "bill.jpg", { type: "image/jpeg" }))
    form.set("purpose", "DEPOSIT")
    const proof = await paymentProof(new Request(`${BASE}/${sendCode}/payment-proof`, { method: "POST", headers: ownerCookie(sendCode), body: form }), ps())
    const proofBody = await expectContract(proof, 200, R.paymentProofResponse, "payment-proof")
    const proofAssetId = proofBody.assetId as string
    await expectContract(await paymentNotify(req("/payment-notify", { proofAssetId }), ps()), 200, R.paymentNotifyResponse, "payment-notify")

    await expectContract(await history(req("/history"), ps()), 200, R.brochureHistoryResponse, "brochure-history")
    const unlocked = await unlock(req("/unlock", { phoneLast4: "4321" }, false), ps())
    expect(unlocked.headers.get("set-cookie")).toContain(`fl_b_${sendCode}=`)
    await expectContract(unlocked, 200, R.brochureUnlockResponse, "brochure-unlock")
    expect((await unlock(req("/unlock", { phoneLast4: "0000" }, false), ps())).status).toBe(404)
    await expectContract(await reorder(req("/reorder", {}), ps()), 201, R.brochureReorderResponse, "brochure-reorder")
  })

  it("không phải chủ phiên → 404 (không lộ phiên tồn tại)", async () => {
    expect((await view(req("", undefined, false), ps())).status).toBe(404)
    expect((await select(req("/select", { productId }, false), ps())).status).toBe(404)
  })
})
