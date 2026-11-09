import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { coordinatorAcceptBrochureOrder, coordinatorRejectBrochureOrder } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { coordinatorAcceptanceBlocker } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import type { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import type { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import type { BrochurePaymentRepository } from "@/modules/greeting-card/infra/brochure-payment-repository"
import type { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { queueStaffNotification } from "@/modules/greeting-card/use-cases/notify-staff"

// Nhận đơn kiểm đề xuất huỷ đang chờ — unit test không chạm DB
vi.mock("@/modules/greeting-card/infra/cancellation-repository", () => ({ CancellationRepository: class { listPending = async () => [] } }))

vi.mock("@/modules/greeting-card/use-cases/notify-staff", () => ({ queueStaffNotification: vi.fn() }))

const ctx: TenantContext = {
  organizationId: "org-test",
  workspaceId: "",
  userId: "user-coordinator",
  branchId: null,
  // R11 (ghi nhận thanh toán) có trần cứng chỉ Điều hành — Điều phối thật không bao giờ có
  capabilities: new Set(["R4", "R6"]),
}

const shopWith = (settings: Record<string, unknown>) =>
  ({ getShopProfile: vi.fn().mockResolvedValue({ name: "Tiệm", settings }) }) as unknown as GreetingCardRepository

describe("Điều phối tiếp nhận và từ chối đơn hàng", () => {
  it("tiệm bắt Điều hành duyệt cọc + thu trước khi cắm: Điều phối tiếp nhận đơn có bill → không tự ghi tiền, chặn tiếp nhận", async () => {
    const order = {
      id: "order-9", code: "DH-9", status: "DRAFT", production_status: "WAITING", delivery_status: "PENDING",
      total_vnd: 500_000, paid_vnd: 0, created_at: new Date(), delivery_window: null,
      greeting_sessions: [{ status: "PAYMENT_REPORTED", payment_proof_asset_id: "proof-1" }],
    }
    const repo = {
      findBrochureOrder: vi.fn().mockResolvedValue(order),
      applyProgress: vi.fn(),
    } as unknown as BrochureOrderRepository
    const strict = {
      brochure_workflow_policy: { require_admin_deposit_approval: true, allow_sla_escalation: false },
      brochure_policy: { require_paid_before_production: true },
    }
    await expect(coordinatorAcceptBrochureOrder(ctx, "order-9", {}, repo, shopWith(strict))).rejects.toThrow(/Chờ Điều hành xác nhận tiền cọc/)
    expect(repo.applyProgress).not.toHaveBeenCalled()
  })

  it("Điều phối tiếp nhận đơn thành công → chuyển sang ASSIGNED và gửi thông báo", async () => {
    const mockOrder = {
      id: "order-1",
      code: "DH-1",
      status: "DRAFT",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 500_000,
      paid_vnd: 0,
      greeting_sessions: [{ status: "PAYMENT_REPORTED", payment_proof_asset_id: "proof-1", sale_id: "sale-1" }],
    }

    const mockRepo = {
      findBrochureOrder: vi.fn().mockResolvedValue(mockOrder),
      applyProgress: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as BrochureOrderRepository

    const result = await coordinatorAcceptBrochureOrder(
      ctx,
      "order-1",
      { note: "Đủ hoa lan, tiếp nhận đơn" },
      mockRepo,
      shopWith({})
    )

    expect(result).toEqual({ success: true })
    expect(mockRepo.applyProgress).toHaveBeenCalledWith(
      ctx,
      mockOrder,
      expect.objectContaining({
        eventType: "COORDINATOR_ACCEPTED",
        productionStatus: "ASSIGNED",
        orderStatus: "CONFIRMED",
        noteAppend: "[Điều phối tiếp nhận] Đủ hoa lan, tiếp nhận đơn",
      })
    )
    // Sale phụ trách được báo như khi Điều hành xác nhận đơn ở 1 Cửa hàng
    expect(queueStaffNotification).toHaveBeenCalledWith("org-test", "ORDER_ACCEPTED", expect.objectContaining({ orderId: "order-1", orderCode: "DH-1", assignedSaleId: "sale-1" }))
  })

  it("Điều phối từ chối nhận đơn → huỷ đơn và kích hoạt hoàn tiền cho khách", async () => {
    const mockOrder = {
      id: "order-2",
      code: "DH-2",
      status: "DRAFT",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 700_000,
      paid_vnd: 700_000,
    }

    const mockRepo = {
      findBrochureOrder: vi.fn().mockResolvedValue(mockOrder),
    } as unknown as BrochureOrderRepository

    const mockCancellationRepo = {
      listPending: vi.fn().mockResolvedValue([]),
      getOrderSummary: vi.fn().mockResolvedValue({
        id: "order-2",
        code: "DH-2",
        status: "CONFIRMED",
        productionStatus: "WAITING",
        deliveryStatus: "PENDING",
        totalVnd: 500_000,
        paidVnd: 200_000,
        balanceVnd: 300_000,
      }),
      createProposal: vi.fn().mockResolvedValue({
        id: "req-1",
        payload: {},
      }),
    } as unknown as CancellationRepository

    const result = await coordinatorRejectBrochureOrder(
      ctx,
      "order-2",
      { reason: "Hết hoa tươi cùng tông màu" },
      mockCancellationRepo,
      mockRepo
    )

    expect(result).toEqual({
      success: true,
      message: "Đã gửi yêu cầu từ chối nhận đơn và hoàn tiền tới Điều hành xét duyệt.",
      proposalId: "req-1",
    })
    expect(mockCancellationRepo.createProposal).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        orderId: "order-2",
        senderRole: "COORDINATOR",
        proposal: expect.objectContaining({
          type: "FULL_REFUND",
          reason: expect.stringContaining("Hết hoa tươi cùng tông màu"),
        }),
      })
    )
  })

  it.each([
    [{ status: "COMPLETED", production_status: "DONE", delivery_status: "DELIVERED" }, /đã giao xong/],
    [{ status: "CONFIRMED", production_status: "ARRANGING", delivery_status: "PENDING" }, /đã vào sản xuất/],
  ])("gọi thẳng API từ chối đơn đã giao/đang sản xuất → chặn, không tạo đề xuất hoàn tiền", async (state, message) => {
    const repo = {
      findBrochureOrder: vi.fn().mockResolvedValue({ id: "order-5", code: "DH-5", total_vnd: 500_000, paid_vnd: 500_000, ...state }),
    } as unknown as BrochureOrderRepository
    const cancellations = { listPending: vi.fn().mockResolvedValue([]), createProposal: vi.fn() } as unknown as CancellationRepository
    await expect(coordinatorRejectBrochureOrder(ctx, "order-5", { reason: "Hết hoa" }, cancellations, repo)).rejects.toThrow(message)
    expect(cancellations.createProposal).not.toHaveBeenCalled()
  })

  it("Xác nhận thanh toán gắn đúng tag MANUAL_ADMIN và AUTO_SYSTEM_15M", async () => {
    const mockOrder = {
      id: "order-3",
      code: "DH-3",
      status: "DRAFT",
      pricing_rule_ref: null,
      total_vnd: 500_000,
      paid_vnd: 0,
      source_session_id: null,
    }

    const mockOrders = {
      findBrochureOrder: vi.fn().mockResolvedValue(mockOrder),
    } as unknown as BrochureOrderRepository

    const mockGreetingRepo = {
      getShopProfile: vi.fn().mockResolvedValue({ settings: {} }),
      findSessionById: vi.fn().mockResolvedValue(null),
    } as unknown as GreetingCardRepository

    const mockPayments = {
      recordIncomingPayment: vi.fn().mockResolvedValue({
        orderId: "order-3",
        balanceVnd: 0,
      }),
    } as unknown as BrochurePaymentRepository

    // 1. Thao tác tự động sau 15 phút
    await adminConfirmBrochurePayment(
      ctx,
      "order-3",
      { confirmationType: "AUTO_SYSTEM_15M" },
      mockPayments,
      mockOrders,
      mockGreetingRepo
    )

    expect(mockPayments.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-3",
      expect.objectContaining({
        reference: "AUTO_SYSTEM_15M",
        note: "Hệ thống tự động xác nhận chuyển khoản sau 15 phút (có ảnh bill hợp lệ)",
      })
    )

    // 2. Thao tác điều hành duyệt tay
    await adminConfirmBrochurePayment(
      ctx,
      "order-3",
      { confirmationType: "MANUAL_ADMIN" },
      mockPayments,
      mockOrders,
      mockGreetingRepo
    )

    expect(mockPayments.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-3",
      expect.objectContaining({
        reference: "BROCHURE-order-3",
        note: "Xác nhận chuyển khoản qua Bộ sưu tập riêng (Điều hành duyệt)",
      })
    )
  })

  it("coordinatorAcceptanceBlocker cho phép nhận đơn khi có ảnh CK hoặc đã nhận tiền", () => {
    // 1. Chưa có ảnh và chưa có tiền -> Chặn
    expect(
      coordinatorAcceptanceBlocker(
        { status: "DRAFT", productionStatus: "WAITING", deliveryStatus: "PENDING" },
        { paidVnd: 0, paymentProofUrl: null }
      )
    ).toBe("Chưa có thông tin chuyển khoản từ khách")

    // 2. Khách vừa gửi ảnh chuyển khoản (tiền chưa vào hoặc điều hành chưa bấm duyệt) -> Cho phép Điều phối nhận đơn!
    expect(
      coordinatorAcceptanceBlocker(
        { status: "DRAFT", productionStatus: "WAITING", deliveryStatus: "PENDING" },
        { paidVnd: 0, paymentProofUrl: "https://r2.smeos.vn/proof.jpg" }
      )
    ).toBeNull()

    // 3. Đã có tiền -> Cho phép Điều phối nhận đơn
    expect(
      coordinatorAcceptanceBlocker(
        { status: "DRAFT", productionStatus: "WAITING", deliveryStatus: "PENDING" },
        { paidVnd: 500_000, paymentProofUrl: null }
      )
    ).toBeNull()

    // 4. Đơn đã CONFIRMED -> Không cần nhận nữa
    expect(
      coordinatorAcceptanceBlocker(
        { status: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "PENDING" },
        { paidVnd: 500_000, paymentProofUrl: "https://r2.smeos.vn/proof.jpg" }
      )
    ).toBe("Đơn đã được xác nhận nhận đơn")

    // 5. Đơn đã vào sản xuất (ASSIGNED / ARRANGING) -> Không hiện nút nhận đơn nữa
    expect(
      coordinatorAcceptanceBlocker(
        { status: "DRAFT", productionStatus: "ARRANGING", deliveryStatus: "PENDING" },
        { paidVnd: 500_000, paymentProofUrl: "https://r2.smeos.vn/proof.jpg" }
      )
    ).toBe("Đơn đã vào sản xuất")
  })

  it("gọi thẳng API tiếp nhận đơn đã vào sản xuất → chặn, không kéo trạng thái xưởng lùi", async () => {
    const order = { id: "o", code: "DH", status: "CONFIRMED", production_status: "READY", delivery_status: "PENDING", total_vnd: 1, paid_vnd: 1 }
    const repo = { findBrochureOrder: vi.fn().mockResolvedValue(order), applyProgress: vi.fn() } as unknown as BrochureOrderRepository
    await expect(coordinatorAcceptBrochureOrder(ctx, "o", {}, repo, shopWith({}))).rejects.toThrow(/đã được xác nhận|vào sản xuất/)
    expect(repo.applyProgress).not.toHaveBeenCalled()
  })
})
