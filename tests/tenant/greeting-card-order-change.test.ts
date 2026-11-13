import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { decideOrderChange, submitOrderChange } from "@/modules/greeting-card/use-cases/order-change"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"
import { getInbox } from "@/modules/greeting-card/use-cases/get-inbox"

/** Khách xin đổi thông tin đơn sau khi đặt (08/10/2026): xác minh, khoá khi cắm hoa, duyệt, cách ly tổ chức. */

const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1", cardMessage: "Chúc mừng",
}
const PROOF = { phoneLast4: "4321" }
const req = () => new Request("http://localhost/api")

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: khách xin đổi thông tin đơn", () => {
  let a: Tenant
  let b: Tenant
  let staffA: TenantContext
  let staffB: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    staffA = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R4", "R5", "R9", "F2"]) }
    staffB = { ...b.ctx, capabilities: new Set(["R1", "R2", "R3", "R4", "R5", "R9", "F2"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function placeOrder() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-D", name: "Bó D", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-d", name: "Bộ D", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(staffA, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return submitBrochureOrder(link.sendCode, ORDER)
  }

  it("sai 4 số cuối hoặc mã đơn lạ → 404; không đổi gì → lỗi; hai yêu cầu cùng lúc → 409", async () => {
    const order = await placeOrder()
    expect(await codeOf(submitOrderChange(req(), order.orderCode, { phoneLast4: "0000" }, { cardMessage: "Mới" }))).toBe("NOT_FOUND")
    expect(await codeOf(submitOrderChange(req(), "DH000000-XXXXXXXX", PROOF, { cardMessage: "Mới" }))).toBe("NOT_FOUND")
    expect(await codeOf(submitOrderChange(req(), order.orderCode, PROOF, { cardMessage: "Chúc mừng" }))).toBe("VALIDATION_FAILED")
    await submitOrderChange(req(), order.orderCode, PROOF, { cardMessage: "Chúc mừng sinh nhật mẹ" })
    expect(await codeOf(submitOrderChange(req(), order.orderCode, PROOF, { deliveryNote: "Gọi trước" }))).toBe("CONFLICT")
  })

  it("nhân viên duyệt → đơn cập nhật, khách thấy lịch sử; tổ chức khác không duyệt được", async () => {
    const order = await placeOrder()
    const sent = await submitOrderChange(req(), order.orderCode, PROOF, {
      deliveryTimeSlot: "14:00 - 16:00", cardMessage: "Chúc mừng sinh nhật mẹ", deliveryNote: "Gửi bảo vệ", note: "Mẹ đi làm về muộn",
    })
    expect(sent.changes.map((c) => c.field)).toEqual(["schedule", "cardMessage", "deliveryNote"])

    const inbox = await getInbox(staffA)
    expect(inbox.actions.find((x) => x.kind === "CHANGE_REQUEST")?.change?.requestId).toBe(sent.id)
    expect(await codeOf(decideOrderChange(staffB, { requestId: sent.id, approve: true, note: "" }))).toBe("NOT_FOUND")
    expect(await codeOf(decideOrderChange(staffA, { requestId: sent.id, approve: false, note: "" }))).toBe("VALIDATION_FAILED")

    const decided = await decideOrderChange(staffA, { requestId: sent.id, approve: true, note: "" })
    expect(decided).toMatchObject({ status: "APPROVED", feeDeltaVnd: 0 })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(row.delivery_window).toMatchObject({ date: DATE, timeSlot: "14:00 - 16:00" })
    expect(row.card_message).toBe("Chúc mừng sinh nhật mẹ")
    expect(row.delivery_address).toMatchObject({ notes: "Gửi bảo vệ", recipientName: "Người Nhận", phone: "0912345678" })
    expect(await codeOf(decideOrderChange(staffA, { requestId: sent.id, approve: true, note: "" }))).toBe("CONFLICT")

    const tracking = await getBrochureTracking(order.orderCode, PROOF)
    expect(tracking.status === "FOUND" && tracking.order.change?.history[0]).toMatchObject({ status: "APPROVED" })
    expect(tracking.status === "FOUND" && tracking.order.change?.pending).toBeNull()
    // Trang theo dõi không trả SĐT, kể cả bản đầy đủ
    expect(JSON.stringify(tracking)).not.toContain("0912345678")
    // Đổi SĐT người nhận: lịch sử trên trang theo dõi chỉ còn 3 số cuối
    const phone = await submitOrderChange(req(), order.orderCode, PROOF, { recipientPhone: "0977000111" })
    await decideOrderChange(staffA, { requestId: phone.id, approve: true, note: "" })
    const after = await getBrochureTracking(order.orderCode, PROOF)
    expect(JSON.stringify(after)).not.toContain("0977000111")
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).delivery_address).toMatchObject({ phone: "0977000111" })
    const anon = await getBrochureTracking(order.orderCode)
    expect(anon.status === "FOUND" && anon.order.change).toBeNull()
  })

  it("khoá từ lúc bắt đầu cắm hoa: khách không gửi được, yêu cầu đang chờ không duyệt được", async () => {
    const order = await placeOrder()
    const sent = await submitOrderChange(req(), order.orderCode, PROOF, { recipientName: "Người Nhận Mới" })
    await prisma.orders.update({ where: { id: order.orderId }, data: { production_status: "ARRANGING" } })
    expect(await codeOf(submitOrderChange(req(), order.orderCode, PROOF, { cardMessage: "Khác" }))).toBe("CONFLICT")
    expect(await codeOf(decideOrderChange(staffA, { requestId: sent.id, approve: true, note: "" }))).toBe("CONFLICT")
    // Từ chối vẫn được để đóng yêu cầu
    expect(await decideOrderChange(staffA, { requestId: sent.id, approve: false, note: "Đã bắt đầu cắm hoa" })).toMatchObject({ status: "REJECTED" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(row.delivery_address).toMatchObject({ recipientName: "Người Nhận" })
  })
})
