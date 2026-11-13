import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { coordinatorAcceptBrochureOrder } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { coordinatorAcceptanceBlocker } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import { inboxActions } from "@/modules/greeting-card/domain/inbox"
import type { TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import type { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import type { BrochurePaymentRepository } from "@/modules/greeting-card/infra/brochure-payment-repository"
import type { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import * as notifyCustomerModule from "@/modules/greeting-card/use-cases/notify-customer"
import { adminConfirmBrochureOrder, adminRejectBrochureOrder } from "@/modules/greeting-card/use-cases/admin-confirm-brochure-order"
import type { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { dispatchAfterPaymentConfirmed } from "@/modules/greeting-card/use-cases/dispatch-after-payment"

// Nhận đơn kiểm đề xuất huỷ đang chờ — unit test không chạm DB
vi.mock("@/modules/greeting-card/infra/cancellation-repository", () => ({ CancellationRepository: class { listPending = async () => [] } }))

vi.mock("@/modules/greeting-card/use-cases/dispatch-after-payment", () => ({
  dispatchAfterPaymentConfirmed: vi.fn().mockResolvedValue({ mode: "AUTO", dispatched: true, sentCount: 2 }),
}))

const ctx: TenantContext = {
  organizationId: "org-test-1",
  workspaceId: "",
  userId: "user-admin",
  branchId: null,
  capabilities: new Set(["R11", "R4", "R6"]),
}

describe("Phân tách quy trình 1 Cửa hàng vs Chuỗi cửa hàng (Gate 2)", () => {
  it("1 Cửa hàng: Gate 1 xác nhận tiền (giữ WAITING) → Gate 1b xác nhận đơn (ASSIGNED & ORDER_ACCEPTED)", async () => {
    const queueSpy = vi.spyOn(notifyCustomerModule, "queueOrderNotification")
    queueSpy.mockClear()

    const order = {
      id: "order-single-1",
      code: "DH-SINGLE-1",
      status: "DRAFT",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 500_000,
      paid_vnd: 0,
      pricing_rule_ref: null,
      source_session_id: null,
      greeting_sessions: [],
    }

    const mockOrdersRepo = {
      findBrochureOrder: vi.fn().mockResolvedValue(order),
    } as unknown as BrochureOrderRepository

    const mockPaymentsRepo = {
      recordIncomingPayment: vi.fn().mockResolvedValue({
        orderId: "order-single-1",
        orderCode: "DH-SINGLE-1",
        status: "CONFIRMED",
        paidVnd: 500_000,
        balanceVnd: 0,
        kind: "BALANCE",
        paymentId: "pay-1",
        productionStatus: "WAITING",
        autoAccepted: false,
      }),
    } as unknown as BrochurePaymentRepository

    // Tiệm 1 cửa hàng (SINGLE)
    const mockGreetingRepo = {
      getShopProfile: vi.fn().mockResolvedValue({
        name: "Tiệm Hoa 1 Cửa Hàng",
        type: "SINGLE",
        settings: {
          brochure_workflow_policy: {
            require_coordinator_acceptance: false,
          },
        },
      }),
    } as unknown as GreetingCardRepository

    // Gate 1: Điều hành xác nhận tiền
    const result = await adminConfirmBrochurePayment(
      ctx,
      "order-single-1",
      { amountVnd: 500_000 },
      mockPaymentsRepo,
      mockOrdersRepo,
      mockGreetingRepo
    )

    // Xác nhận recordIncomingPayment KHÔNG tự động chuyển ASSIGNED (chờ Gate 1b)
    expect(mockPaymentsRepo.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-single-1",
      expect.objectContaining({
        amountVnd: 500_000,
        autoAcceptProduction: false,
      })
    )

    // Chưa bắn ORDER_ACCEPTED (chỉ bắn PAYMENT_CONFIRMED)
    expect(queueSpy).not.toHaveBeenCalledWith("org-test-1", "order-single-1", "ORDER_ACCEPTED")
    expect(result.productionStatus).toBe("WAITING")
    expect(result.autoAccepted).toBe(false)
  })

  it("Chuỗi cửa hàng: Điều hành duyệt thanh toán → productionStatus giữ WAITING, chờ Điều phối liên hệ chuỗi nhận đơn", async () => {
    const queueSpy = vi.spyOn(notifyCustomerModule, "queueOrderNotification")
    queueSpy.mockClear()

    const order = {
      id: "order-chain-1",
      code: "DH-CHAIN-1",
      status: "DRAFT",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 800_000,
      paid_vnd: 0,
      pricing_rule_ref: null,
      source_session_id: null,
      greeting_sessions: [],
    }

    const mockOrdersRepo = {
      findBrochureOrder: vi.fn().mockResolvedValue(order),
    } as unknown as BrochureOrderRepository

    const mockPaymentsRepo = {
      recordIncomingPayment: vi.fn().mockResolvedValue({
        orderId: "order-chain-1",
        orderCode: "DH-CHAIN-1",
        status: "CONFIRMED",
        paidVnd: 800_000,
        balanceVnd: 0,
        kind: "BALANCE",
        paymentId: "pay-chain-1",
        productionStatus: "WAITING",
        autoAccepted: false,
      }),
    } as unknown as BrochurePaymentRepository

    // Chuỗi cửa hàng (CHAIN)
    const mockGreetingRepo = {
      getShopProfile: vi.fn().mockResolvedValue({
        name: "Chuỗi Hệ Thống Hoa Toàn Quốc",
        type: "CHAIN",
        settings: {
          brochure_workflow_policy: {
            require_coordinator_acceptance: true,
          },
        },
      }),
    } as unknown as GreetingCardRepository

    const result = await adminConfirmBrochurePayment(
      ctx,
      "order-chain-1",
      { amountVnd: 800_000 },
      mockPaymentsRepo,
      mockOrdersRepo,
      mockGreetingRepo
    )

    // Xác nhận recordIncomingPayment KHÔNG bật autoAcceptProduction (đợi điều phối chuỗi)
    expect(mockPaymentsRepo.recordIncomingPayment).toHaveBeenCalledWith(
      ctx,
      "order-chain-1",
      expect.objectContaining({
        amountVnd: 800_000,
        autoAcceptProduction: false,
      })
    )

    // Không bắn thông báo ORDER_ACCEPTED ở bước duyệt tiền vì chưa biết chi nhánh nào nhận
    expect(queueSpy).not.toHaveBeenCalledWith("org-test-1", "order-chain-1", "ORDER_ACCEPTED")
    expect(result.productionStatus).toBe("WAITING")
    expect(result.autoAccepted).toBe(false)
  })

  it("Chuỗi cửa hàng: coordinatorAcceptanceBlocker cho phép Điều phối nhận đơn khi status=CONFIRMED nhưng productionStatus=WAITING", () => {
    const chainPolicy = { requireCoordinatorAcceptance: true }
    const singlePolicy = { requireCoordinatorAcceptance: false }

    const orderState = {
      status: "CONFIRMED",
      productionStatus: "WAITING",
      deliveryStatus: "PENDING",
    }

    // Với Chuỗi: đã ghi nhận tiền → không xác nhận tiền lần nữa, chọn cửa hàng trong Thẻ gia công
    expect(coordinatorAcceptanceBlocker(orderState, { paidVnd: 800_000 }, chainPolicy)).toBe("Đã xác nhận nhận tiền — chọn cửa hàng trong Thẻ gia công")
    // Chưa ghi nhận tiền nhưng khách đã gửi bill → nút "Xác nhận đã nhận tiền" MỞ
    expect(coordinatorAcceptanceBlocker(orderState, { paidVnd: 0, paymentProofUrl: "proof-1" }, chainPolicy)).toBeNull()

    // Với 1 Cửa hàng: Nút Nhận đơn ĐÓNG vì Điều hành đã nhận đơn ngay lúc duyệt tiền
    expect(coordinatorAcceptanceBlocker(orderState, { paidVnd: 800_000 }, singlePolicy)).toBe(
      "Đơn đã được xác nhận nhận đơn"
    )

    // Sau khi đã vào sản xuất (ASSIGNED): Cả hai đều đóng
    expect(
      coordinatorAcceptanceBlocker(
        { ...orderState, productionStatus: "ASSIGNED" },
        { paidVnd: 800_000 },
        chainPolicy
      )
    ).toBe("Đơn đã vào sản xuất")
  })

  it("Chuỗi cửa hàng: Điều phối xác nhận đã nhận tiền → không vào sản xuất, chuyển sang chọn cửa hàng", async () => {
    const mockOrder = {
      id: "order-chain-2",
      code: "DH-CHAIN-2",
      status: "CONFIRMED",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 800_000,
      paid_vnd: 0,
      delivery_window: null,
      created_at: new Date(),
      greeting_sessions: [{ status: "PAYMENT_REPORTED", payment_proof_asset_id: "proof-1" }],
    }

    const mockRepo = {
      findBrochureOrder: vi.fn().mockResolvedValue(mockOrder),
      applyProgress: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as BrochureOrderRepository

    const mockShops = {
      getShopProfile: vi.fn().mockResolvedValue({
        name: "Chuỗi Hoa",
        type: "CHAIN",
        settings: {
          brochure_workflow_policy: { require_coordinator_acceptance: true },
        },
      }),
    } as unknown as GreetingCardRepository

    // Điều phối thật không có R11 — chỉ ghi nhận việc đã đối chiếu bill, không tự ghi tiền cọc
    const coordinatorCtx: TenantContext = { ...ctx, capabilities: new Set(["R4", "R6"]) }
    const result = await coordinatorAcceptBrochureOrder(
      coordinatorCtx,
      "order-chain-2",
      { note: "Chi nhánh Quận 1 xác nhận có đủ hoa và nhận làm" },
      mockRepo,
      mockShops
    )

    // Khách chưa nhận tin "đã nhận đơn"; chuyển sang chọn cửa hàng (tự động theo cài đặt)
    expect(result).toMatchObject({ success: true, dispatch: { mode: "AUTO", dispatched: true, sentCount: 2 } })
    const progress = vi.mocked(mockRepo.applyProgress).mock.calls.at(-1)?.[2]
    expect(progress).toMatchObject({
      eventType: "COORDINATOR_PAYMENT_CONFIRMED",
      noteAppend: "[Điều phối xác nhận đã nhận tiền] Chi nhánh Quận 1 xác nhận có đủ hoa và nhận làm",
    })
    expect(progress).not.toHaveProperty("productionStatus")
    expect(dispatchAfterPaymentConfirmed).toHaveBeenCalledWith(coordinatorCtx, "order-chain-2", { manualDispatch: undefined })
  })

  it("Hộp việc (Inbox): phân biệt task điều phối giữa Chờ liên hệ chuỗi vs Đã tiếp nhận sẵn sàng giao thợ", () => {
    const baseItem: Partial<TrackingPipelineItem> = {
      id: "item-1",
      orderId: "order-1",
      orderCode: "DH-1",
      productName: "Bó Hoa Hồng Đỏ",
      customerName: "Nguyễn Văn A",
      totalVnd: 500_000,
      paidVnd: 500_000,
      balanceVnd: 0,
      currentStepId: "STEP_5_PAYMENT_CONFIRMED",
      orderStatus: "CONFIRMED",
      deliveryFailed: false,
      isCancelled: false,
      stepStartedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      customerReportedPaid: false,
      paymentProofUrl: null,
    }

    // Đơn của Chuỗi (productionStatus = WAITING): Hiện task thẩm định liên hệ chuỗi
    const chainItems = inboxActions(
      [{ ...baseItem, productionStatus: "WAITING" } as TrackingPipelineItem],
      "COORDINATOR",
      "user-coord"
    )
    expect(chainItems.length).toBe(1)
    expect(chainItems[0]?.title).toBe("Thẩm định nhận đơn (Liên hệ chuỗi)")
    expect(chainItems[0]?.detail).toContain("Cần liên hệ cửa hàng trong chuỗi")

    // Đơn của 1 Cửa hàng (productionStatus = ASSIGNED): Hiện task phân công sản xuất
    const singleItems = inboxActions(
      [{ ...baseItem, productionStatus: "ASSIGNED" } as TrackingPipelineItem],
      "COORDINATOR",
      "user-coord"
    )
    expect(singleItems.length).toBe(1)
    expect(singleItems[0]?.title).toBe("Phân công sản xuất")
    expect(singleItems[0]?.detail).toContain("Đơn đã tiếp nhận · Sẵn sàng phân công sản xuất")
  })

  it("1 Cửa hàng: Gate 1b Điều hành xác nhận đơn → productionStatus chuyển ASSIGNED và thông báo ORDER_ACCEPTED", async () => {
    const queueSpy = vi.spyOn(notifyCustomerModule, "queueOrderNotification")
    queueSpy.mockClear()

    const order = {
      id: "order-conf-1",
      code: "DH-CONF-1",
      status: "CONFIRMED",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 500_000,
      paid_vnd: 500_000,
    }
    const mockOrders = {
      findBrochureOrder: vi.fn().mockResolvedValue(order),
      applyProgress: vi.fn().mockResolvedValue({ orderId: "order-conf-1", orderCode: "DH-CONF-1" }),
    } as unknown as BrochureOrderRepository
    const mockShops = {
      getShopProfile: vi.fn().mockResolvedValue({
        name: "Tiệm Hoa",
        type: "SINGLE",
        settings: { brochure_workflow_policy: { require_coordinator_acceptance: false } },
      }),
    } as unknown as GreetingCardRepository

    const noPending = { listPending: vi.fn().mockResolvedValue([]) } as unknown as CancellationRepository
    const res = await adminConfirmBrochureOrder(ctx, "order-conf-1", { note: "Đủ nguyên liệu" }, mockOrders, mockShops, noPending)
    expect(res.success).toBe(true)
    expect(res.productionStatus).toBe("ASSIGNED")
    expect(mockOrders.applyProgress).toHaveBeenCalledWith(
      ctx,
      order,
      expect.objectContaining({ eventType: "ADMIN_CONFIRMED_ORDER", productionStatus: "ASSIGNED" })
    )
    expect(queueSpy).toHaveBeenCalledWith("org-test-1", "order-conf-1", "ORDER_ACCEPTED")

    // Đơn còn đề xuất huỷ chờ duyệt → không xác nhận được, không ghi gì
    vi.mocked(mockOrders.applyProgress).mockClear()
    const pending = { listPending: vi.fn().mockResolvedValue([{ order_id: "order-conf-1" }]) } as unknown as CancellationRepository
    await expect(adminConfirmBrochureOrder(ctx, "order-conf-1", {}, mockOrders, mockShops, pending)).rejects.toThrow(/đề xuất huỷ chờ duyệt/)
    expect(mockOrders.applyProgress).not.toHaveBeenCalled()
  })

  it("1 Cửa hàng: Điều hành từ chối đơn → tạo đề xuất huỷ & hoàn tiền; khách chưa nhận tin huỷ khi đề xuất còn chờ duyệt", async () => {
    const queueSpy = vi.spyOn(notifyCustomerModule, "queueOrderNotification")
    queueSpy.mockClear()

    const order = {
      id: "order-rej-1",
      code: "DH-REJ-1",
      status: "CONFIRMED",
      production_status: "WAITING",
      delivery_status: "PENDING",
      total_vnd: 500_000,
      paid_vnd: 200_000,
    }
    const mockOrders = { findBrochureOrder: vi.fn().mockResolvedValue(order) } as unknown as BrochureOrderRepository
    const mockShops = {
      getShopProfile: vi.fn().mockResolvedValue({
        name: "Tiệm Hoa",
        type: "SINGLE",
        settings: { brochure_workflow_policy: { require_coordinator_acceptance: false } },
      }),
    } as unknown as GreetingCardRepository
    const mockCancels = {
      listPending: vi.fn().mockResolvedValue([]),
      createProposal: vi.fn().mockResolvedValue({ id: "prop-1" }),
    } as unknown as CancellationRepository

    const res = await adminRejectBrochureOrder(
      ctx,
      "order-rej-1",
      { reason: "Hết hoa" },
      mockOrders,
      mockShops,
      mockCancels
    )
    expect(res.success).toBe(true)
    expect(mockCancels.createProposal).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        orderId: "order-rej-1",
        senderRole: "ADMIN",
        proposal: expect.objectContaining({ type: "FULL_REFUND", refundAmountVnd: 200_000 }),
      })
    )
    expect(queueSpy).not.toHaveBeenCalledWith("org-test-1", "order-rej-1", "CANCELLED")
    expect(res.message).toMatch(/Duyệt đề xuất/)
  })
})
