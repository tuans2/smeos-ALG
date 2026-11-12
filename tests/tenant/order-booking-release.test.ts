import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as postCancel } from "@/app/api/v1/orders/[id]/cancel/route"
import { POST as postCoordinatorOrder } from "@/app/api/v1/coordinator/orders/route"
import { POST as postCoordinatorCancel } from "@/app/api/v1/coordinator/orders/[id]/cancel/route"
import { flushBackground } from "@/core/runtime/background"
import { AvailabilityRepository } from "@/modules/availability/infra/availability-repository"
import { BrochurePaymentRepository } from "@/modules/greeting-card/infra/brochure-payment-repository"
import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { DismissalRepository } from "@/modules/greeting-card/infra/dismissal-repository"
import { DismissalRestoreRepository } from "@/modules/greeting-card/infra/dismissal-restore-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"
const CHECK_IN = "2026-12-20"
const CHECK_OUT = "2026-12-22"

/**
 * Audit User Journey UJ-23 (A1): huỷ đơn theo MỌI đường phải trả lại lịch đặt chỗ (`product_bookings`) trong cùng giao
 * dịch huỷ — trước đây `releaseOrderBooking` không ai gọi, phòng của đơn đã huỷ vẫn chặn khách sau. Khôi phục đơn đã bỏ
 * hiển thị thì giữ lại phòng; phòng đã có người khác đặt → 409, đơn vẫn huỷ.
 */
describe("huỷ đơn trả lại lịch đặt chỗ", () => {
  let a: Tenant
  let productId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    productId = (await prisma.products.create({ data: { organization_id: a.organizationId, code: "PHONG-1", name: "Phòng đôi" } })).id
  })

  afterAll(async () => {
    await flushBackground()
    await disconnectDatabase()
  })

  const hold = (orderId: string | null, product = productId) =>
    prisma.product_bookings.create({
      data: { organization_id: a.organizationId, product_id: product, order_id: orderId, check_in_date: new Date(CHECK_IN), check_out_date: new Date(CHECK_OUT) },
    })
  const bookingStatus = async (orderId: string) =>
    (await prisma.product_bookings.findFirstOrThrow({ where: { order_id: orderId }, orderBy: { created_at: "desc" } })).status
  const roomFree = async (product = productId) => !(await new AvailabilityRepository().hasActiveOverlap(a.organizationId, product, CHECK_IN, CHECK_OUT))

  async function brochureOrder(status: "CONFIRMED" | "DRAFT" = "CONFIRMED") {
    const id = randomUUID()
    await prisma.orders.create({
      data: { id, organization_id: a.organizationId, code: `DH-${id.slice(0, 6)}`, source: "BROCHURE", status, total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000, created_by: a.userId },
    })
    return id
  }

  it("Sổ đơn: huỷ đơn chưa vào Điều phối → đặt chỗ CANCELLED, phòng trống lại; khoá tay của Điều hành giữ nguyên", async () => {
    const order = await ingestOrder(a.ctx, { source: "MANUAL", items: [{ productId, description: "Phòng đôi", quantity: 1, unitPriceVnd: 0 }] })
    await hold(order.id)
    const otherProduct = (await prisma.products.create({ data: { organization_id: a.organizationId, code: "PHONG-2", name: "Phòng đơn" } })).id
    const manual = await hold(null, otherProduct)
    expect(await roomFree()).toBe(false)

    const res = await postCancel(
      withSession(`${BASE}/orders/${order.id}/cancel`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }) }),
      { params: Promise.resolve({ id: order.id }) },
    )
    expect(res.status).toBe(200)
    expect(await bookingStatus(order.id)).toBe("CANCELLED")
    expect(await roomFree()).toBe(true)
    expect((await prisma.product_bookings.findUniqueOrThrow({ where: { id: manual.id } })).status).toBe("ACTIVE")
  })

  it("Điều phối: huỷ đơn → đặt chỗ CANCELLED trong cùng giao dịch", async () => {
    const body = {
      productId, customer_name: "Nguyễn Văn An", recipient_name: "Trần Thị Bình", recipient_phone: "0901 234 567",
      delivery_address: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" }, delivery_target_time: "17:00",
      delivery_target_at: new Date(Date.now() + 6 * 3600_000).toISOString(), product_title: "Phòng đôi", unit_price_vnd: 300_000, flowers: [],
    }
    const created = await postCoordinatorOrder(withSession(`${BASE}/coordinator/orders`, a.token, { method: "POST", body: JSON.stringify(body) }))
    expect(created.status).toBe(201)
    const id = ((await readJson(created)).order as { id: string }).id
    await hold(id)

    const res = await postCoordinatorCancel(
      withSession(`${BASE}/coordinator/orders/${id}/cancel`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }) }),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(200)
    expect(await bookingStatus(id)).toBe("CANCELLED")
    expect(await roomFree()).toBe(true)
  })

  it("Thẻ chào: huỷ ở sổ thu (kể cả huỷ vì hết hạn thanh toán) → trả phòng", async () => {
    const id = await brochureOrder()
    await hold(id)
    await new BrochurePaymentRepository().cancel(a.ctx, id, "Hết hạn chuyển khoản", { paymentFailed: true })
    expect(await bookingStatus(id)).toBe("CANCELLED")
    expect(await roomFree()).toBe(true)
  })

  it("Thẻ chào: duyệt đề xuất huỷ → trả phòng", async () => {
    const id = await brochureOrder()
    await hold(id)
    const repo = new CancellationRepository()
    const { id: requestId } = await repo.createProposal(a.ctx, {
      orderId: id, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 },
    })
    await repo.decide(a.ctx, { requestId, approve: true, note: "" })
    expect(await bookingStatus(id)).toBe("CANCELLED")
    expect(await roomFree()).toBe(true)
  })

  describe("Thẻ chào: bỏ hiển thị rồi khôi phục", () => {
    async function draftOrder() {
      const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
      const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: a.userId })
      const link = await createSendLink(a.ctx, { catalogId: catalog.id })
      await selectBrochureProduct(link.sendCode, product.id)
      const order = await submitBrochureOrder(link.sendCode, {
        customerName: "Khách Quen", customerPhone: "0987 654 321", recipientName: "Người Nhận", recipientPhone: "0912 345 678",
        confirmedTerms: true, selectedPromotionId: "promo-discount-10", deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
      })
      return order.orderId
    }
    const dismiss = async (orderId: string) => {
      const repo = new DismissalRepository()
      await repo.propose(a.ctx, { id: orderId, type: "ORDER", reasonId: "CHANGED_MIND", reasonText: "Khách đổi ý không mua nữa" }, false)
      await repo.decide(a.ctx, { id: orderId, type: "ORDER", approve: true })
    }

    it("bỏ hiển thị trả phòng; khôi phục giữ lại phòng", async () => {
      const id = await draftOrder()
      await hold(id)
      await dismiss(id)
      expect((await prisma.orders.findUniqueOrThrow({ where: { id } })).status).toBe("CANCELLED")
      expect(await bookingStatus(id)).toBe("CANCELLED")
      expect(await roomFree()).toBe(true)

      await new DismissalRestoreRepository().restore(a.ctx, { id, type: "ORDER" })
      expect(await bookingStatus(id)).toBe("ACTIVE")
      expect(await roomFree()).toBe(false)
    })

    it("phòng đã có khách khác giữ trong lúc đơn bị bỏ hiển thị → khôi phục 409, đơn vẫn huỷ, không giữ trùng", async () => {
      const id = await draftOrder()
      await hold(id)
      await dismiss(id)
      const other = await hold(null)

      await expect(new DismissalRestoreRepository().restore(a.ctx, { id, type: "ORDER" })).rejects.toMatchObject({ code: "CONFLICT" })
      expect((await prisma.orders.findUniqueOrThrow({ where: { id } })).status).toBe("CANCELLED")
      expect(await bookingStatus(id)).toBe("CANCELLED")
      expect((await prisma.product_bookings.findUniqueOrThrow({ where: { id: other.id } })).status).toBe("ACTIVE")
    })
  })
})
