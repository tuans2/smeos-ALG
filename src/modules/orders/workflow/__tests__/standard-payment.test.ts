import { describe, expect, it } from "vitest"

import { extractStandardOrderCode, planPayment } from "../standard-payment"

describe("mã đơn trong nội dung chuyển khoản", () => {
  it("đọc mã cổng chung, chịu khoảng trắng/gạch; không nhận mã Thẻ chào (đuôi 8 ký tự)", () => {
    expect(extractStandardOrderCode("CK DH251031-0007 Lan")).toBe("DH251031-0007")
    expect(extractStandardOrderCode("dh 251031 0007")).toBe("DH251031-0007")
    expect(extractStandardOrderCode("DH251031-AB12CD34")).toBeNull()
    expect(extractStandardOrderCode("DH251031-00071")).toBeNull()
    expect(extractStandardOrderCode("chuyen tien hoa")).toBeNull()
  })

  // PO 07/11/2026 (Q2): đơn tạo ở Điều phối (`FLR-<yymmdd>-<4 số>`) cũng khớp chuyển khoản
  it("đọc mã đơn Điều phối FLR, cả khi ngân hàng bỏ dấu gạch", () => {
    expect(extractStandardOrderCode("CK FLR-261107-0003 Lan")).toBe("FLR-261107-0003")
    expect(extractStandardOrderCode("ck flr2611070003")).toBe("FLR-261107-0003")
    expect(extractStandardOrderCode("FLR 261107 0003")).toBe("FLR-261107-0003")
    expect(extractStandardOrderCode("FLR-261107-00031")).toBeNull()
    expect(extractStandardOrderCode("FLR-2026-123")).toBeNull()
  })
})

describe("kế hoạch ghi thu", () => {
  it("lần đầu là cọc và chuyển Điều phối; lần sau là phần còn lại", () => {
    expect(planPayment({ totalVnd: 1_000_000, paidVnd: 0, status: "DRAFT" }, 300_000)).toEqual({ kind: "DEPOSIT", paidAfter: 300_000, balanceAfter: 700_000, firstPayment: true })
    expect(planPayment({ totalVnd: 1_000_000, paidVnd: 300_000, status: "CONFIRMED" }, 700_000)).toEqual({ kind: "BALANCE", paidAfter: 1_000_000, balanceAfter: 0, firstPayment: false })
  })

  it("từ chối: đơn huỷ, chưa báo giá, đã thu đủ, vượt phần còn lại, số không hợp lệ", () => {
    expect(planPayment({ totalVnd: 1, paidVnd: 0, status: "CANCELLED" }, 1)).toBe("Đơn đã huỷ")
    expect(planPayment({ totalVnd: 0, paidVnd: 0, status: "DRAFT" }, 1)).toMatch(/báo giá/)
    expect(planPayment({ totalVnd: 100, paidVnd: 100, status: "CONFIRMED" }, 1)).toBe("Đơn đã thu đủ")
    expect(planPayment({ totalVnd: 100, paidVnd: 50, status: "CONFIRMED" }, 60)).toMatch(/vượt/)
    expect(planPayment({ totalVnd: 100, paidVnd: 0, status: "DRAFT" }, 1.5)).toMatch(/nguyên dương/)
  })
})
