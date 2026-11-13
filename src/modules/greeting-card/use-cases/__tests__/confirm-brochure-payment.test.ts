import { describe, it, expect, vi } from "vitest"
import { reportCustomerPayment, adminConfirmBrochurePayment } from "../confirm-brochure-payment"
import type { GreetingCardRepository } from "../../infra/greeting-card-repository"
import type { BrochureOrderRepository } from "../../infra/brochure-order-repository"
import type { BrochurePaymentRepository } from "../../infra/brochure-payment-repository"
import type { TenantContext } from "@/core/tenancy"

describe("reportCustomerPayment & adminConfirmBrochurePayment with deposit & balance proof", () => {
  const ctx: TenantContext = {
    organizationId: "org-1",
    userId: "user-1",
    workspaceId: "ws-1",
    branchId: null,
    capabilities: new Set(["orders.manage", "greeting_card.manage"]),
  }

  describe("reportCustomerPayment", () => {
    const ownProof = vi.fn().mockResolvedValue({ metadata: { source: "BROCHURE_PAYMENT_PROOF", sendCode: "T01-001" } })

    it("Lần 1 (Cọc): lưu paymentProofAssetId vào session và ghi event CLICK_PAID", async () => {
      const mockRepo = {
        getPublicSessionBySendCode: vi.fn().mockResolvedValue({
          id: "session-1",
          organization_id: "org-1",
          send_code: "T01-001",
          status: "ORDER_SUBMITTED",
          order_id: "order-1",
          order: { total_vnd: 1_000_000, paid_vnd: 0 },
          catalog: { is_active: true },
        }),
        updateSession: vi.fn().mockResolvedValue({}),
        recordJourneyEvent: vi.fn().mockResolvedValue({}),
        findAssetForVerification: ownProof,
      } as unknown as GreetingCardRepository

      const res = await reportCustomerPayment("T01-001", { proofAssetId: "proof-asset-1" }, mockRepo)
      expect(res.success).toBe(true)
      expect(mockRepo.updateSession).toHaveBeenCalledWith("session-1", {
        status: "PAYMENT_REPORTED",
        paymentProofAssetId: "proof-asset-1",
      })
      expect(mockRepo.recordJourneyEvent).toHaveBeenCalledWith(
        "org-1",
        "session-1",
        "CLICK_PAID",
        expect.objectContaining({ orderId: "order-1", proofAssetId: "proof-asset-1" })
      )
    })

    it("Lần 2 (Phần còn lại khi đã cọc): lưu paymentProofBalanceAssetId vào session", async () => {
      const mockRepo = {
        getPublicSessionBySendCode: vi.fn().mockResolvedValue({
          id: "session-1",
          organization_id: "org-1",
          send_code: "T01-001",
          status: "PAYMENT_REPORTED",
          order_id: "order-1",
          order: { total_vnd: 1_000_000, paid_vnd: 500_000 },
          catalog: { is_active: true },
        }),
        updateSession: vi.fn().mockResolvedValue({}),
        recordJourneyEvent: vi.fn().mockResolvedValue({}),
        findAssetForVerification: ownProof,
      } as unknown as GreetingCardRepository

      const res = await reportCustomerPayment("T01-001", { proofAssetId: "proof-asset-balance" }, mockRepo)
      expect(res.success).toBe(true)
      expect(mockRepo.updateSession).toHaveBeenCalledWith("session-1", {
        status: "PAYMENT_REPORTED",
        paymentProofBalanceAssetId: "proof-asset-balance",
      })
      expect(mockRepo.recordJourneyEvent).toHaveBeenCalledWith(
        "org-1",
        "session-1",
        "CLICK_PAID",
        expect.objectContaining({
          orderId: "order-1",
          purpose: "BALANCE",
          proofAssetId: "proof-asset-balance",
        })
      )
    })
  })

  describe("adminConfirmBrochurePayment", () => {
    it("Lần 1 (paid = 0): tự động liên kết payment_proof_asset_id vào chứng từ order_payments", async () => {
      const mockOrders = {
        findBrochureOrder: vi.fn().mockResolvedValue({
          id: "order-1",
          organization_id: "org-1",
          total_vnd: 1_000_000,
          paid_vnd: 0,
          source_session_id: "session-1",
          pricing_rule_ref: null,
          production_status: "PENDING",
          delivery_status: "PENDING",
        }),
      } as unknown as BrochureOrderRepository

      const mockPayments = {
        recordIncomingPayment: vi.fn().mockResolvedValue({
          paymentId: "pay-1",
          status: "CONFIRMED",
          paidVnd: 500_000,
          balanceVnd: 500_000,
          kind: "DEPOSIT",
        }),
      } as unknown as BrochurePaymentRepository

      const mockRepo = {
        getShopProfile: vi.fn().mockResolvedValue({
          name: "Tiệm Hoa",
          settings: { brochure_policy: { deposit_percent: 50 } },
        }),
        findSessionById: vi.fn().mockResolvedValue({
          id: "session-1",
          payment_proof_asset_id: "proof-asset-1",
          payment_proof_balance_asset_id: null,
        }),
      } as unknown as GreetingCardRepository

      await adminConfirmBrochurePayment(ctx, "order-1", {}, mockPayments, mockOrders, mockRepo)

      expect(mockPayments.recordIncomingPayment).toHaveBeenCalledWith(
        ctx,
        "order-1",
        expect.objectContaining({
          amountVnd: 500_000,
          evidenceAssetId: "proof-asset-1",
        })
      )
    })

    it("Lần 2 (paid > 0): tự động liên kết payment_proof_balance_asset_id vào chứng từ order_payments", async () => {
      const mockOrders = {
        findBrochureOrder: vi.fn().mockResolvedValue({
          id: "order-1",
          organization_id: "org-1",
          total_vnd: 1_000_000,
          paid_vnd: 500_000,
          source_session_id: "session-1",
          pricing_rule_ref: null,
          production_status: "READY",
          delivery_status: "DELIVERED",
          qc_records: [{ notes: "CUSTOMER_PHOTO_APPROVED", created_at: new Date() }],
        }),
      } as unknown as BrochureOrderRepository

      const mockPayments = {
        recordIncomingPayment: vi.fn().mockResolvedValue({
          paymentId: "pay-2",
          status: "CONFIRMED",
          paidVnd: 1_000_000,
          balanceVnd: 0,
          kind: "BALANCE",
        }),
      } as unknown as BrochurePaymentRepository

      const mockRepo = {
        getShopProfile: vi.fn().mockResolvedValue({
          name: "Tiệm Hoa",
          settings: { brochure_policy: { deposit_percent: 50 } },
        }),
        findSessionById: vi.fn().mockResolvedValue({
          id: "session-1",
          payment_proof_asset_id: "proof-asset-1",
          payment_proof_balance_asset_id: "proof-asset-balance-2",
        }),
      } as unknown as GreetingCardRepository

      await adminConfirmBrochurePayment(ctx, "order-1", {}, mockPayments, mockOrders, mockRepo)

      expect(mockPayments.recordIncomingPayment).toHaveBeenCalledWith(
        ctx,
        "order-1",
        expect.objectContaining({
          amountVnd: 500_000,
          evidenceAssetId: "proof-asset-balance-2",
        })
      )
    })

    it("Tự duyệt bill: số phải thu đổi sau khi khách gửi bill (VAT, phụ phí...) → không ghi thu", async () => {
      const mockOrders = {
        findBrochureOrder: vi.fn().mockResolvedValue({
          id: "order-1", organization_id: "org-1", total_vnd: 1_100_000, paid_vnd: 0, source_session_id: null,
          pricing_rule_ref: null, production_status: "PENDING", delivery_status: "PENDING",
        }),
      } as unknown as BrochureOrderRepository
      const mockPayments = { recordIncomingPayment: vi.fn() } as unknown as BrochurePaymentRepository
      const mockRepo = {
        getShopProfile: vi.fn().mockResolvedValue({ name: "Tiệm Hoa", settings: {} }),
        findSessionById: vi.fn(),
      } as unknown as GreetingCardRepository

      await expect(
        adminConfirmBrochurePayment(ctx, "order-1", { confirmationType: "AUTO_SYSTEM_15M", expectedAmountVnd: 1_000_000 }, mockPayments, mockOrders, mockRepo)
      ).rejects.toMatchObject({ code: "CONFLICT" })
      expect(mockPayments.recordIncomingPayment).not.toHaveBeenCalled()
    })
  })
})
