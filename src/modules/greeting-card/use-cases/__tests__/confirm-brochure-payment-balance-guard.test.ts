import { describe, it, expect, vi } from "vitest"
import { adminConfirmBrochurePayment, coordinatorConfirmBalancePayment, reportCustomerPayment } from "../confirm-brochure-payment"
import type { TenantContext } from "@/core/tenancy"
import type { BrochureOrderRepository } from "../../infra/brochure-order-repository"
import type { BrochurePaymentRepository } from "../../infra/brochure-payment-repository"
import type { GreetingCardRepository } from "../../infra/greeting-card-repository"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-admin",
  branchId: null,
  capabilities: new Set(["greeting_card.order.payment.record"]),
}

function createMockServices(orderOverrides: Record<string, unknown> = {}, shopSettings: Record<string, unknown> = {}) {
  const defaultOrder = {
    id: "order-1",
    code: "DH001",
    organization_id: "org-1",
    source: "BROCHURE",
    status: "CONFIRMED",
    production_status: "WAITING",
    delivery_status: "PENDING",
    total_vnd: BigInt(1_000_000),
    paid_vnd: BigInt(0),
    pricing_rule_ref: { paymentPlan: { policy: "DEPOSIT_50", depositPercent: 50, source: "PAYMENT_CODE", paymentCode: "DC50" } },
    greeting_sessions: [{ send_code: "SL-TEST", status: "PENDING" }],
    qc_records: [],
    ...orderOverrides,
  }

  const orders = {
    findBrochureOrder: vi.fn().mockResolvedValue(defaultOrder),
  } as unknown as BrochureOrderRepository

  const repo = {
    getShopProfile: vi.fn().mockResolvedValue({
      organization_id: "org-1",
      settings: {
        brochure_policy: { deposit_percent: 0, require_full_before_dispatch: true },
        ...shopSettings,
      },
    }),
  } as unknown as GreetingCardRepository

  const payments = {
    recordIncomingPayment: vi.fn().mockResolvedValue({
      orderId: "order-1",
      orderCode: "DH001",
      status: "CONFIRMED",
      paidVnd: 500_000,
      balanceVnd: 500_000,
      kind: "DEPOSIT",
      paymentId: "pay-1",
    }),
  } as unknown as BrochurePaymentRepository

  return { orders, repo, payments }
}

describe("adminConfirmBrochurePayment — bảo vệ đơn đặt cọc không bị thu 2 lần sớm", () => {
  it("Lần 1: Thu tiền cọc cho đơn cọc 50% khi chưa thanh toán gì → thành công", async () => {
    const { orders, repo, payments } = createMockServices()
    const res = await adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)
    expect(res.paymentId).toBe("pay-1")
    expect(payments.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-1",
      expect.objectContaining({ amountVnd: 500_000 })
    )
  })

  it("Lần 2 (Thu trước giao): Chặn khi hoa chưa xong (production_status != READY)", async () => {
    const { orders, repo, payments } = createMockServices({
      paid_vnd: BigInt(500_000),
      production_status: "ARRANGING",
    })
    await expect(adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)).rejects.toThrow(
      /hoàn thành chế tác/i
    )
  })

  it("Lần 2 (Thu trước giao): Chặn khi hoa đã READY nhưng chưa duyệt ảnh và chưa quá 10 phút", async () => {
    const { orders, repo, payments } = createMockServices({
      paid_vnd: BigInt(500_000),
      production_status: "READY",
      qc_records: [
        { notes: "PRODUCT_PHOTO_UPLOADED", created_at: new Date(Date.now() - 2 * 60_000) }, // mới up 2 phút
      ],
    })
    await expect(adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)).rejects.toThrow(
      /chờ khách duyệt ảnh thành phẩm/i
    )
  })

  it("Lần 2 (Thu trước giao): Cho phép khi hoa READY và khách đã duyệt ảnh", async () => {
    const { orders, repo, payments } = createMockServices({
      paid_vnd: BigInt(500_000),
      production_status: "READY",
      qc_records: [{ notes: "CUSTOMER_PHOTO_APPROVED", created_at: new Date() }],
    })
    await adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)
    expect(payments.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-1",
      expect.objectContaining({ amountVnd: 500_000 })
    )
  })

  it("Lần 2 (Thu trước giao): Cho phép khi hoa READY và ảnh up đã quá 10 phút (auto-approved)", async () => {
    const { orders, repo, payments } = createMockServices({
      paid_vnd: BigInt(500_000),
      production_status: "READY",
      qc_records: [
        { notes: "PRODUCT_PHOTO_UPLOADED", created_at: new Date(Date.now() - 11 * 60_000) }, // up 11 phút trước
      ],
    })
    await adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)
    expect(payments.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-1",
      expect.objectContaining({ amountVnd: 500_000 })
    )
  })

  it("Lần 2 (Thu sau giao, shipper không thu tiền mặt — mặc định): ghi nhận chuyển khoản trước khi giao", async () => {
    const { orders, repo, payments } = createMockServices(
      { paid_vnd: BigInt(500_000), delivery_status: "PENDING" },
      { brochure_policy: { deposit_percent: 0, require_full_before_dispatch: false } }
    )
    await adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)
    expect(payments.recordIncomingPayment).toHaveBeenCalledWith(ctx, "order-1", expect.objectContaining({ amountVnd: 500_000 }))
  })

  it("Lần 2 (Thu sau giao, shipper thu tiền mặt): Chặn khi chưa giao hàng (delivery_status != DELIVERED)", async () => {
    const { orders, repo, payments } = createMockServices(
      {
        paid_vnd: BigInt(500_000),
        delivery_status: "PENDING",
      },
      {
        brochure_policy: { deposit_percent: 0, require_full_before_dispatch: false, allow_shipper_cash: true },
      }
    )
    await expect(adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)).rejects.toThrow(
      /thu sau khi giao hoa thành công/i
    )
  })

  it("Lần 2 (Thu sau giao): Cho phép khi đã giao hàng (delivery_status = DELIVERED)", async () => {
    const { orders, repo, payments } = createMockServices(
      {
        paid_vnd: BigInt(500_000),
        delivery_status: "DELIVERED",
      },
      {
        brochure_policy: { deposit_percent: 0, require_full_before_dispatch: false },
      }
    )
    await adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)
    expect(payments.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-1",
      expect.objectContaining({ amountVnd: 500_000 })
    )
  })

  it("Điều phối xác nhận Lần 2 cũng bị chặn khi hoa chưa xong và khách chưa báo chuyển khoản", async () => {
    const { orders, repo, payments } = createMockServices({
      paid_vnd: BigInt(500_000),
      production_status: "ARRANGING",
    })
    await expect(coordinatorConfirmBalancePayment(ctx, "order-1", {}, payments, orders, repo)).rejects.toThrow(
      /hoàn thành chế tác/i
    )
    expect(payments.recordIncomingPayment).not.toHaveBeenCalled()
  })

  it("Khách đã báo chuyển khoản phần còn lại → được ghi nhận Lần 2 dù hoa chưa xong", async () => {
    const { orders, repo, payments } = createMockServices({
      paid_vnd: BigInt(500_000),
      production_status: "ARRANGING",
      greeting_sessions: [{ send_code: "SL-TEST", status: "PAYMENT_REPORTED" }],
    })
    await adminConfirmBrochurePayment(ctx, "order-1", {}, payments, orders, repo)
    expect(payments.recordIncomingPayment).toHaveBeenCalledWith(ctx, "order-1", expect.objectContaining({ amountVnd: 500_000 }))
  })
})

describe("reportCustomerPayment — chỉ nhận ảnh bill khách tải qua chính link này", () => {
  function sessionRepo(metadata: Record<string, unknown> | null, filters: Record<string, unknown> = { requirePaymentProof: false }) {
    return {
      getPublicSessionBySendCode: vi.fn().mockResolvedValue({
        id: "session-1",
        organization_id: "org-1",
        send_code: "T01-001",
        status: "ORDER_SUBMITTED",
        order_id: "order-1",
        order: { total_vnd: 1_000_000, paid_vnd: 0 },
        catalog: { is_active: true, filters },
      }),
      updateSession: vi.fn().mockResolvedValue({}),
      recordJourneyEvent: vi.fn().mockResolvedValue({}),
      findAssetForVerification: vi.fn().mockResolvedValue(metadata ? { metadata } : null),
    } as unknown as GreetingCardRepository
  }

  it("mã ảnh của cửa hàng khác / không tồn tại → bỏ qua, không gắn làm chứng từ", async () => {
    const repo = sessionRepo(null)
    await reportCustomerPayment("T01-001", { proofAssetId: "foreign-asset" }, repo)
    expect(repo.findAssetForVerification).toHaveBeenCalledWith("org-1", "foreign-asset")
    expect(repo.updateSession).toHaveBeenCalledWith("session-1", { status: "PAYMENT_REPORTED" })
  })

  it("ảnh cùng cửa hàng nhưng tải qua link khác → bỏ qua", async () => {
    const repo = sessionRepo({ source: "BROCHURE_PAYMENT_PROOF", sendCode: "T01-999" })
    await reportCustomerPayment("T01-001", { proofAssetId: "other-link-asset" }, repo)
    expect(repo.updateSession).toHaveBeenCalledWith("session-1", { status: "PAYMENT_REPORTED" })
  })

  it("tiệm bắt buộc ảnh bill mà khách báo không kèm ảnh hợp lệ → máy chủ chặn, không đổi trạng thái", async () => {
    const repo = sessionRepo({ source: "BROCHURE_PAYMENT_PROOF", sendCode: "T01-999" }, {})
    await expect(reportCustomerPayment("T01-001", { proofAssetId: "other-link-asset" }, repo)).rejects.toThrow(/tải ảnh chuyển khoản/)
    await expect(reportCustomerPayment("T01-001", {}, repo)).rejects.toThrow(/tải ảnh chuyển khoản/)
    expect(repo.updateSession).not.toHaveBeenCalled()
  })
})
