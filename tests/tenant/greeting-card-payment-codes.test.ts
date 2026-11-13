import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { quoteBrochureSession, submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { adminConfirmBrochurePayment, reportCustomerPayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { runBackgroundSweep } from "@/modules/greeting-card/use-cases/background-sweep"
import { assignBrochureFlorist, uploadBrochureProductPhoto } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"

/** Mã thanh toán DC30/DC50 (08/10/2026): đổi cách thu, KHÔNG đổi tổng tiền; kiểm ở máy chủ; truy vết. */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: mã thanh toán đặt cọc", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: {
        settings: {
          brochure_payment: { bank_id: "VCB", account_no: "0011223344", account_name: "TIEM A" },
          brochure_policy: { deposit_percent: 0 },
          brochure_payment_plans: { codes: [{ code: "DC30", policy: "DEPOSIT_30", max_uses: 1 }, { code: "DC50", policy: "DEPOSIT_50" }] },
        },
      },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function linkFor(t: Tenant, code: string) {
    const product = await new ProductRepository().create(t.ctx, { code: `HOA-${code}`, name: "Bó hồng", attributes: { price: 2_000_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code, name: code, productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return link.sendCode
  }
  const order = (paymentCode?: string) => ({
    customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
    confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Q1",
    ...(paymentCode ? { paymentCode } : {}),
  })

  it("không mã → trả 100%; DC30 → cọc 600.000đ, tổng vẫn 2.000.000đ, có audit", async () => {
    const sendCode = await linkFor(a, "bst-1")
    expect((await quoteBrochureSession(sendCode, {})).quote.paymentPlan).toMatchObject({ policy: "FULL_PAYMENT", dueNowVnd: 2_000_000, dueLaterVnd: 0 })
    const q = await quoteBrochureSession(sendCode, { paymentCode: "dc30" })
    expect(q.errors).toEqual({})
    expect(q.quote).toMatchObject({ totalVnd: 2_000_000, paymentPlan: { policy: "DEPOSIT_30", paymentCode: "DC30", dueNowVnd: 600_000, dueLaterVnd: 1_400_000 } })

    const placed = await submitBrochureOrder(sendCode, order("DC30"))
    expect(placed.totalVnd).toBe(2_000_000)
    expect(placed.vietQr).toMatchObject({ amount: 600_000, purpose: "DEPOSIT" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: placed.orderId } })
    expect(Number(row.total_vnd)).toBe(2_000_000)
    expect(row.pricing_rule_ref).toMatchObject({ paymentPlan: { policy: "DEPOSIT_30", source: "PAYMENT_CODE", paymentCode: "DC30" } })
    const audit = await prisma.audit_logs.findFirst({ where: { organization_id: a.organizationId, action: "greeting_card.payment_code.apply" } })
    expect(audit).toMatchObject({ entity_id: placed.orderId, user_id: "customer" })
  })

  it("DC30 hết lượt → báo lỗi, không đổi cách thu; mã sai → giữ mặc định", async () => {
    await submitBrochureOrder(await linkFor(a, "bst-1"), order("DC30"))
    const second = await linkFor(a, "bst-2")
    const q = await quoteBrochureSession(second, { paymentCode: "DC30" })
    expect(q.errors.paymentCode).toMatch(/hết lượt/)
    expect(q.quote.paymentPlan).toMatchObject({ policy: "FULL_PAYMENT", paymentCode: null })
    expect(await codeOf(submitBrochureOrder(second, order("DC30")))).toBe("VALIDATION_FAILED")
    expect((await quoteBrochureSession(second, { paymentCode: "DC99" })).errors.paymentCode).toMatch(/không tồn tại/)
  })

  it("mã của tiệm khác không dùng được", async () => {
    const sendCode = await linkFor(b, "bst-b")
    expect((await quoteBrochureSession(sendCode, { paymentCode: "DC50" })).errors.paymentCode).toMatch(/không tồn tại/)
  })

  it("DC50: cọc → hoa xong + ảnh → trang theo dõi đòi phần còn lại → thu đủ → PAID", async () => {
    const sendCode = await linkFor(a, "bst-1")
    const placed = await submitBrochureOrder(sendCode, order("DC50"))
    const dep = await adminConfirmBrochurePayment(a.ctx, placed.orderId)
    expect(dep).toMatchObject({ kind: "DEPOSIT", paidVnd: 1_000_000, balanceVnd: 1_000_000 })
    await assignBrochureFlorist(a.ctx, placed.orderId, { floristNote: "Lan" })
    await uploadBrochureProductPhoto(a.ctx, placed.orderId, { skipPhoto: true, skipReason: "test" })

    const tracking = await getBrochureTracking(placed.orderCode, { sendCode })
    expect(tracking.status === "FOUND" && tracking.order.payment).toMatchObject({
      status: "PARTIALLY_PAID", paymentCode: "DC50", remainingVnd: 1_000_000, balanceDue: true,
      balanceInstructions: { amount: 1_000_000, purpose: "BALANCE" },
    })

    await adminConfirmBrochurePayment(a.ctx, placed.orderId)
    const after = await getBrochureTracking(placed.orderCode, { sendCode })
    expect(after.status === "FOUND" && after.order.payment).toMatchObject({ status: "PAID", remainingVnd: 0, balanceDue: false, balanceInstructions: null })
    expect(after.status === "FOUND" && after.order.payment.milestones.map((m) => m.status)).toEqual(["PAID", "PAID"])
  })

  it("hạn thanh toán 30 phút: không chuyển, không báo → thanh toán thất bại, đơn huỷ, trả lượt mã; đã báo chuyển → giữ đơn", async () => {
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })
    const settings = org.settings as Record<string, unknown>
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { ...settings, brochure_policy: { deposit_percent: 0, payment_timeout_minutes: 30, require_payment_proof: false } } },
    })
    const silent = await linkFor(a, "bst-1")
    const placed = await submitBrochureOrder(silent, order("DC30"))
    expect(placed.vietQr).toMatchObject({ cancelOnExpiry: true })
    const reporter = await linkFor(a, "bst-2")
    const kept = await submitBrochureOrder(reporter, { ...order(), customerPhone: "0977654321" })
    await reportCustomerPayment(reporter)

    await runBackgroundSweep(new Date(Date.now() + 29 * 60_000))
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: placed.orderId } })).status).toBe("DRAFT")

    await runBackgroundSweep(new Date(Date.now() + 31 * 60_000))
    const failed = await prisma.orders.findUniqueOrThrow({ where: { id: placed.orderId } })
    expect(failed.status).toBe("CANCELLED")
    expect(failed.pricing_rule_ref).toMatchObject({ paymentFailed: { reason: "PAYMENT_TIMEOUT" } })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: kept.orderId } })).status).toBe("DRAFT")

    const tracking = await getBrochureTracking(placed.orderCode, { sendCode: silent })
    expect(tracking.status === "FOUND" && tracking.order.payment.status).toBe("PAYMENT_FAILED")
    expect(tracking.status === "FOUND" && tracking.trackingStep.title).toBe("Đơn hàng không hoàn thành")
    // Đơn huỷ trả lại lượt dùng của mã DC30 (giới hạn 1 lượt)
    expect((await quoteBrochureSession(await linkFor(a, "bst-3"), { paymentCode: "DC30" })).errors).toEqual({})
  })
})
