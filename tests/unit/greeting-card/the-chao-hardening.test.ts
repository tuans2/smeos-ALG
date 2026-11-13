import { describe, expect, it } from "vitest"
import {
  canProposeCancellation,
  canDecideCancellation,
  resolveRefundVnd,
  validateCancellationProposal,
} from "@/modules/greeting-card/domain/cancellation-request"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { parseStorePolicies, DEFAULT_AGREEMENTS } from "@/modules/greeting-card/domain/store-policy"
import { safeImageUrl } from "@/modules/greeting-card/domain/shop-contact"

describe("resolveRefundVnd — máy chủ tự tính số hoàn", () => {
  it("Hủy đơn không hoàn luôn 0, kể cả client gửi số", () => {
    expect(resolveRefundVnd("CANCEL_ONLY", 500_000, 200_000, 300_000)).toBe(0)
  })
  it("Hoàn toàn phần = đúng số đã thu, bỏ qua số đề xuất 0", () => {
    expect(resolveRefundVnd("FULL_REFUND", 500_000, 0, undefined)).toBe(500_000)
  })
  it("Hoàn một phần ưu tiên số Điều hành chốt, không âm", () => {
    expect(resolveRefundVnd("PARTIAL_REFUND", 500_000, 200_000, 150_000)).toBe(150_000)
    expect(resolveRefundVnd("PARTIAL_REFUND", 500_000, 200_000, undefined)).toBe(200_000)
    expect(resolveRefundVnd("PARTIAL_REFUND", 500_000, -5, undefined)).toBe(0)
  })
})

describe("canDecideCancellation — duyệt huỷ không chuyển tiền (PO 15/10/2026)", () => {
  const caps = GREETING_CARD_CAPABILITY
  const who = (codes: string[], userId = "u1") => ({ capabilities: new Set(codes), userId })
  it("huỷ đơn cần R6; chỉ hoàn một phần cần R10", () => {
    expect(canDecideCancellation("CANCEL_ONLY", who(["R6"]), { inTransit: false, requesterId: "s" }, caps)).toBeNull()
    expect(canDecideCancellation("FULL_REFUND", who(["R6"]), { inTransit: false, requesterId: "s" }, caps)).toBeNull()
    expect(canDecideCancellation("PARTIAL_REFUND", who(["R6"]), { inTransit: false, requesterId: "s" }, caps)).not.toBeNull()
    expect(canDecideCancellation("PARTIAL_REFUND", who(["R10"]), { inTransit: false, requesterId: "s" }, caps)).toBeNull()
  })
  it("đơn đang giao: Điều phối (R5) duyệt được, nhưng không tự duyệt đề xuất của mình", () => {
    expect(canDecideCancellation("CANCEL_ONLY", who(["R5"]), { inTransit: false, requesterId: "s" }, caps)).not.toBeNull()
    expect(canDecideCancellation("FULL_REFUND", who(["R5"]), { inTransit: true, requesterId: "s" }, caps)).toBeNull()
    expect(canDecideCancellation("CANCEL_ONLY", who(["R5"], "s"), { inTransit: true, requesterId: "s" }, caps)).toContain("chính mình")
  })
})

describe("canProposeCancellation & rào chắn trước khi cắm hoa", () => {
  it("đơn đang giao vẫn đề xuất huỷ được (cần người duyệt, PO 15/10/2026)", () => {
    expect(canProposeCancellation({ status: "PROCESSING", productionStatus: "READY", deliveryStatus: "DELIVERING" }).allowed).toBe(true)
    expect(canProposeCancellation({ status: "PROCESSING", productionStatus: "READY", deliveryStatus: "PENDING" }).allowed).toBe(true)
  })

  it("cho phép đề xuất khi đơn WAITING (chưa cắm hoa)", () => {
    expect(canProposeCancellation({ status: "CONFIRMED", productionStatus: "WAITING" }).allowed).toBe(true)
    expect(canProposeCancellation({ status: "CONFIRMED" }).allowed).toBe(true)
  })

  it("chặn đề xuất khi thợ đang cắm (ARRANGING); đã cắm xong chưa giao (READY) thì được (PO 15/10/2026)", () => {
    const arranging = canProposeCancellation({ status: "CONFIRMED", productionStatus: "ARRANGING" })
    expect(arranging.allowed).toBe(false)
    expect(arranging.reason).toMatch(/chế tác/i)

    const ready = canProposeCancellation({ status: "CONFIRMED", productionStatus: "READY" })
    expect(ready.allowed).toBe(true)
  })

  it("chặn đề xuất khi đơn đã giao hoàn tất hoặc đã hủy", () => {
    expect(canProposeCancellation({ status: "CANCELLED" }).allowed).toBe(false)
    expect(canProposeCancellation({ status: "COMPLETED", deliveryStatus: "DELIVERED" }).allowed).toBe(false)
  })
})

describe("validateCancellationProposal", () => {
  const order = { status: "CONFIRMED", totalVnd: 1_000_000, paidVnd: 500_000, productionStatus: "WAITING" }
  it("chặn hoàn một phần bằng/vượt số đã thu", () => {
    expect(validateCancellationProposal({ type: "PARTIAL_REFUND", reason: "Khách đổi ý", refundAmountVnd: 500_000 }, order)).not.toBeNull()
  })
  it("chặn đề xuất trên đơn đã hủy", () => {
    expect(validateCancellationProposal({ type: "CANCEL_ONLY", reason: "Trùng đơn", refundAmountVnd: 0 }, { ...order, status: "CANCELLED" })).not.toBeNull()
  })
  it("chặn đề xuất khi hoa đã bắt đầu cắm", () => {
    expect(validateCancellationProposal({ type: "CANCEL_ONLY", reason: "Khách xin hủy", refundAmountVnd: 0 }, { ...order, productionStatus: "ARRANGING" })).toMatch(/chế tác/i)
  })
  it("nhận hoàn một phần hợp lệ", () => {
    expect(validateCancellationProposal({ type: "PARTIAL_REFUND", reason: "Thiếu hoa", refundAmountVnd: 100_000 }, order)).toBeNull()
  })
})

describe("parseStorePolicies — dữ liệu hỏng không lọt ra trang công khai", () => {
  it("bỏ mục thiếu trường, rỗng thì dùng mặc định", () => {
    const parsed = parseStorePolicies({
      store_policies: {
        agreements: [{ id: "a", title: 1, customerText: "x" }, null],
        commitments: [{ id: "c1", title: "Đúng giờ", customerText: "Giao đúng khung giờ" }, { id: 2 }],
      },
    })
    expect(parsed.agreements).toEqual(DEFAULT_AGREEMENTS)
    expect(parsed.commitments).toEqual([{ id: "c1", title: "Đúng giờ", customerText: "Giao đúng khung giờ" }])
  })
})

describe("safeImageUrl", () => {
  it("chỉ nhận https hoặc đường dẫn nội bộ", () => {
    expect(safeImageUrl("/api/v1/assets/a/view")).toBe("/api/v1/assets/a/view")
    expect(safeImageUrl("https://cdn.example.com/qr.png")).toBe("https://cdn.example.com/qr.png")
    expect(safeImageUrl("javascript:alert(1)")).toBeNull()
    expect(safeImageUrl("//evil.example/qr.png")).toBeNull()
    expect(safeImageUrl("http://insecure.example/qr.png")).toBeNull()
    expect(safeImageUrl(42)).toBeNull()
  })
})
