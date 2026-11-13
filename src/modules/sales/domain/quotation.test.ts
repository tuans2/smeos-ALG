import { describe, expect, it } from "vitest"
import {
  calculateItemTotal,
  calculateQuotationTotals,
  canTransitionQuotationStatus,
  isQuotationExpired,
  QUOTATION_STATUSES,
  validateQuotationItems,
} from "./quotation"

describe("Quotation Domain Rules (Pure TypeScript)", () => {
  it("định nghĩa đủ 6 trạng thái báo giá", () => {
    expect(QUOTATION_STATUSES).toEqual([
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ])
  })

  describe("calculateItemTotal & calculateQuotationTotals", () => {
    it("tính đúng tiền từng dòng sản phẩm", () => {
      expect(calculateItemTotal(2, 150000)).toBe(300000)
      expect(calculateItemTotal(-1, 150000)).toBe(0)
      expect(calculateItemTotal(3, -500)).toBe(0)
    })

    it("tính đúng tổng subtotal, discount, và totalAmount", () => {
      const items = [
        { qty: 2, unitPrice: 200000 },
        { qty: 1, unitPrice: 100000 },
      ]
      const totals = calculateQuotationTotals(items, 50000)
      expect(totals.subtotal).toBe(500000)
      expect(totals.discountAmount).toBe(50000)
      expect(totals.totalAmount).toBe(450000)
    })

    it("giảm giá không thể vượt quá subtotal hoặc nhỏ hơn 0", () => {
      const items = [{ qty: 1, unitPrice: 100000 }]
      const overDiscount = calculateQuotationTotals(items, 150000)
      expect(overDiscount.subtotal).toBe(100000)
      expect(overDiscount.discountAmount).toBe(100000)
      expect(overDiscount.totalAmount).toBe(0)

      const negativeDiscount = calculateQuotationTotals(items, -50000)
      expect(negativeDiscount.discountAmount).toBe(0)
      expect(negativeDiscount.totalAmount).toBe(100000)
    })
  })

  describe("canTransitionQuotationStatus", () => {
    it("cho phép chuyển DRAFT -> SENT, ACCEPTED, REJECTED, EXPIRED", () => {
      expect(canTransitionQuotationStatus("DRAFT", "SENT")).toBe(true)
      expect(canTransitionQuotationStatus("DRAFT", "ACCEPTED")).toBe(true)
      expect(canTransitionQuotationStatus("DRAFT", "REJECTED")).toBe(true)
      expect(canTransitionQuotationStatus("DRAFT", "EXPIRED")).toBe(true)
      expect(canTransitionQuotationStatus("DRAFT", "CONVERTED")).toBe(false)
    })

    it("cho phép chuyển SENT -> ACCEPTED, CONVERTED", () => {
      expect(canTransitionQuotationStatus("SENT", "ACCEPTED")).toBe(true)
      expect(canTransitionQuotationStatus("SENT", "CONVERTED")).toBe(true)
      expect(canTransitionQuotationStatus("SENT", "REJECTED")).toBe(true)
      expect(canTransitionQuotationStatus("SENT", "EXPIRED")).toBe(true)
      expect(canTransitionQuotationStatus("SENT", "DRAFT")).toBe(false)
    })

    it("không cho phép chuyển từ CONVERTED sang trạng thái khác", () => {
      expect(canTransitionQuotationStatus("CONVERTED", "DRAFT")).toBe(false)
      expect(canTransitionQuotationStatus("CONVERTED", "SENT")).toBe(false)
    })

    it("giữ nguyên trạng thái luôn hợp lệ", () => {
      expect(canTransitionQuotationStatus("DRAFT", "DRAFT")).toBe(true)
      expect(canTransitionQuotationStatus("CONVERTED", "CONVERTED")).toBe(true)
    })
  })

  describe("isQuotationExpired", () => {
    it("phát hiện báo giá đã hết hạn", () => {
      const yesterday = new Date(Date.now() - 86400000)
      const tomorrow = new Date(Date.now() + 86400000)

      expect(isQuotationExpired({ validUntil: yesterday, status: "SENT" })).toBe(true)
      expect(isQuotationExpired({ validUntil: tomorrow, status: "SENT" })).toBe(false)
      expect(isQuotationExpired({ validUntil: null, status: "SENT" })).toBe(false)
    })

    it("không đánh dấu hết hạn nếu đã CONVERTED", () => {
      const yesterday = new Date(Date.now() - 86400000)
      expect(isQuotationExpired({ validUntil: yesterday, status: "CONVERTED" })).toBe(false)
    })

    it("báo giá khách đã đồng ý không tự hết hạn (audit hành trình Q2, UJ-04)", () => {
      const yesterday = new Date(Date.now() - 86400000)
      expect(isQuotationExpired({ validUntil: yesterday, status: "ACCEPTED" })).toBe(false)
      // Nhân viên vẫn đóng tay được khi khách rút lại
      expect(canTransitionQuotationStatus("ACCEPTED", "EXPIRED")).toBe(true)
    })
  })

  describe("validateQuotationItems", () => {
    it("báo lỗi nếu danh sách rỗng", () => {
      expect(validateQuotationItems([])).toBe("Báo giá phải có ít nhất một dòng sản phẩm.")
    })

    it("báo lỗi nếu dòng thiếu tên, số lượng <= 0 hoặc đơn giá âm", () => {
      expect(validateQuotationItems([{ name: "", qty: 1, unitPrice: 100 }])).toContain("chưa có tên")
      expect(validateQuotationItems([{ name: "A", qty: 0, unitPrice: 100 }])).toContain("lớn hơn 0")
      expect(validateQuotationItems([{ name: "A", qty: 1, unitPrice: -10 }])).toContain("số âm")
    })

    it("trả về null khi hợp lệ", () => {
      expect(validateQuotationItems([{ name: "Áo sơ mi", qty: 2, unitPrice: 250000 }])).toBeNull()
    })
  })
})

