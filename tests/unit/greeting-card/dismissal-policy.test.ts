import { describe, expect, it } from "vitest"
import {
  canProposeDismissal,
  isDismissalTimedOut,
  remainingDismissalMs,
  formatCountdownMmSs,
  DISMISSAL_TIMEOUT_MS,
} from "@/modules/greeting-card/domain/dismissal-policy"

describe("chính sách Hủy bỏ hiển thị & Khôi phục đơn hàng / link Thẻ chào", () => {
  describe("canProposeDismissal", () => {
    it("cho phép đề xuất hủy khi đơn chưa thanh toán và ở giai đoạn Sale (bước 1-4)", () => {
      expect(canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_1_OPENED" })).toEqual({
        allowed: true,
      })
      expect(canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_2_CHOOSING" })).toEqual({
        allowed: true,
      })
      expect(canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_3_FILLING_FORM" })).toEqual({
        allowed: true,
      })
      expect(canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_4_PAYMENT_PENDING" })).toEqual({
        allowed: true,
      })
    })

    it("chặn khi đơn đã bị hủy trước đó", () => {
      const res = canProposeDismissal({ isCancelled: true, paidVnd: 0, currentStepId: "STEP_1_OPENED" })
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain("đã bị hủy")
    })

    it("chặn khi đơn đã thanh toán cọc hoặc trả đủ", () => {
      const res = canProposeDismissal({ isCancelled: false, paidVnd: 200_000, currentStepId: "STEP_4_PAYMENT_PENDING" })
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain("đã có khoản thanh toán")
    })

    it("chặn khi đơn đã chuyển sang khâu cắm hoa hoặc giao hàng (bước 5-9)", () => {
      expect(
        canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_6_ARRANGING" }).allowed
      ).toBe(false)
      expect(
        canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_7_READY_QC" }).allowed
      ).toBe(false)
      expect(
        canProposeDismissal({ isCancelled: false, paidVnd: 0, currentStepId: "STEP_8_DELIVERING" }).allowed
      ).toBe(false)
    })
  })

  describe("isDismissalTimedOut & remainingDismissalMs", () => {
    it("chưa hết hạn khi dưới 5 phút", () => {
      const now = Date.now()
      const proposedAt = new Date(now - 2 * 60 * 1000).toISOString() // 2 phút trước
      expect(isDismissalTimedOut(proposedAt, now)).toBe(false)
      expect(remainingDismissalMs(proposedAt, now)).toBe(3 * 60 * 1000)
      expect(formatCountdownMmSs(remainingDismissalMs(proposedAt, now))).toBe("03:00")
    })

    it("hết hạn khi đã đủ hoặc quá 5 phút", () => {
      const now = Date.now()
      const proposedAt = new Date(now - DISMISSAL_TIMEOUT_MS).toISOString() // đúng 5 phút
      expect(isDismissalTimedOut(proposedAt, now)).toBe(true)
      expect(remainingDismissalMs(proposedAt, now)).toBe(0)
      expect(formatCountdownMmSs(0)).toBe("00:00")

      const lateProposedAt = new Date(now - 6 * 60 * 1000).toISOString() // 6 phút
      expect(isDismissalTimedOut(lateProposedAt, now)).toBe(true)
      expect(remainingDismissalMs(lateProposedAt, now)).toBe(0)
    })
  })
})
