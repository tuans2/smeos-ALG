import { describe, expect, it } from "vitest"
import {
  canProposeCancellation,
  resolveRefundVnd,
  validateCancellationProposal,
} from "@/modules/greeting-card/domain/cancellation-request"

describe("quy trình đề xuất Hủy/Hoàn tiền Thẻ chào — domain logic", () => {
  describe("canProposeCancellation", () => {
    it("cho phép đề xuất hủy khi hoa chưa cắm (WAITING hoặc null)", () => {
      expect(canProposeCancellation({ status: "CONFIRMED", productionStatus: "WAITING" })).toEqual({ allowed: true })
      expect(canProposeCancellation({ status: "CONFIRMED", productionStatus: null })).toEqual({ allowed: true })
      expect(canProposeCancellation({ status: "DRAFT" })).toEqual({ allowed: true })
    })

    it("chặn khi đơn đã bị hủy trước đó", () => {
      const res = canProposeCancellation({ status: "CANCELLED" })
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain("đã bị hủy")
    })

    it("chặn khi đơn đã hoàn thành hoặc giao thành công", () => {
      expect(canProposeCancellation({ status: "COMPLETED" }).allowed).toBe(false)
      expect(canProposeCancellation({ status: "CONFIRMED", deliveryStatus: "DELIVERED" }).allowed).toBe(false)
    })

    it("chặn khi thợ đang cắm (ARRANGING, ASSIGNED); đã cắm xong (READY) thì được đề xuất", () => {
      expect(canProposeCancellation({ status: "CONFIRMED", productionStatus: "ARRANGING" }).allowed).toBe(false)
      expect(canProposeCancellation({ status: "CONFIRMED", productionStatus: "READY" }).allowed).toBe(true)
      expect(canProposeCancellation({ status: "CONFIRMED", productionStatus: "ASSIGNED" }).allowed).toBe(false)
    })
  })

  describe("validateCancellationProposal", () => {
    const baseOrder = {
      status: "CONFIRMED",
      totalVnd: 500_000,
      paidVnd: 500_000,
      productionStatus: "WAITING",
    }

    it("bắt buộc lý do tối thiểu 3 ký tự", () => {
      expect(
        validateCancellationProposal(
          { type: "CANCEL_ONLY", reason: " ", refundAmountVnd: 0 },
          baseOrder
        )
      ).toContain("tối thiểu 3 ký tự")
    })

    it("hợp lệ khi hủy đơn không hoàn tiền", () => {
      expect(
        validateCancellationProposal(
          { type: "CANCEL_ONLY", reason: "Khách đổi ý muốn hủy", refundAmountVnd: 0 },
          baseOrder
        )
      ).toBeNull()
    })

    it("hoàn tiền toàn phần báo lỗi nếu đơn chưa thu tiền", () => {
      expect(
        validateCancellationProposal(
          { type: "FULL_REFUND", reason: "Khách hủy chuyển tiền lại", refundAmountVnd: 500_000 },
          { ...baseOrder, paidVnd: 0 }
        )
      ).toContain("chưa thu tiền")
    })

    it("hoàn tiền một phần yêu cầu số tiền > 0 và < số đã thu", () => {
      expect(
        validateCancellationProposal(
          { type: "PARTIAL_REFUND", reason: "Đổi sang mẫu rẻ hơn", refundAmountVnd: 0 },
          baseOrder
        )
      ).toContain("lớn hơn 0đ")

      expect(
        validateCancellationProposal(
          { type: "PARTIAL_REFUND", reason: "Đổi sang mẫu rẻ hơn", refundAmountVnd: 500_000 },
          baseOrder
        )
      ).toContain("nhỏ hơn tổng số tiền đã thu")

      expect(
        validateCancellationProposal(
          { type: "PARTIAL_REFUND", reason: "Đổi sang mẫu nhỏ hơn", refundAmountVnd: 200_000 },
          baseOrder
        )
      ).toBeNull()
    })
  })

  describe("resolveRefundVnd", () => {
    it("CANCEL_ONLY luôn trả về 0", () => {
      expect(resolveRefundVnd("CANCEL_ONLY", 500_000, 500_000, 500_000)).toBe(0)
    })

    it("FULL_REFUND lấy đúng số tiền đã thu", () => {
      expect(resolveRefundVnd("FULL_REFUND", 500_000, 300_000, undefined)).toBe(500_000)
    })

    it("PARTIAL_REFUND ưu tiên số tiền thực tế Điều hành duyệt", () => {
      expect(resolveRefundVnd("PARTIAL_REFUND", 500_000, 200_000, 250_000)).toBe(250_000)
      expect(resolveRefundVnd("PARTIAL_REFUND", 500_000, 200_000, undefined)).toBe(200_000)
    })
  })

})
