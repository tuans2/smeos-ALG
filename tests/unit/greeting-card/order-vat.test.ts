import { describe, expect, it } from "vitest"
import { applyVat, normalizeInvoiceInfo, retotalWithVat, vatAmountOf, vatChangeBlocker } from "@/modules/greeting-card/domain/order-vat"

const base = { status: "CONFIRMED", totalVnd: 3_300_000, paidVnd: 1_600_000, vatAmountVnd: 0 }

describe("order VAT", () => {
  it("bật VAT 10% cộng 330k vào 3tr3, còn lại tính lại", () => {
    expect(vatAmountOf(3_300_000, 10)).toBe(330_000)
    expect(applyVat(base, { enabled: true, rate: 10 })).toEqual({ subtotalVnd: 3_300_000, vatAmountVnd: 330_000, totalVnd: 3_630_000, balanceVnd: 2_030_000 })
  })

  it("đổi 10% → 8% tính trên giá trước thuế, không cộng dồn", () => {
    const withVat = { ...base, totalVnd: 3_630_000, vatAmountVnd: 330_000 }
    expect(applyVat(withVat, { enabled: true, rate: 8 })).toMatchObject({ subtotalVnd: 3_300_000, vatAmountVnd: 264_000, totalVnd: 3_564_000 })
  })

  it("tắt VAT trả về giá trước thuế", () => {
    expect(applyVat({ ...base, totalVnd: 3_630_000, vatAmountVnd: 330_000 }, { enabled: false, rate: 10 }).totalVnd).toBe(3_300_000)
  })

  it("chặn đơn huỷ/hoàn tất/chưa báo giá và khi tổng mới nhỏ hơn đã thu", () => {
    expect(vatChangeBlocker({ ...base, status: "CANCELLED" }, { enabled: true, rate: 10 })).toMatch(/huỷ/)
    expect(vatChangeBlocker({ ...base, status: "COMPLETED" }, { enabled: true, rate: 10 })).toMatch(/hoàn tất/)
    expect(vatChangeBlocker({ ...base, totalVnd: 0 }, { enabled: true, rate: 10 })).toMatch(/báo giá/)
    expect(vatChangeBlocker({ ...base, totalVnd: 3_630_000, vatAmountVnd: 330_000, paidVnd: 3_630_000 }, { enabled: false, rate: 10 })).toMatch(/hoàn tiền/)
    expect(vatChangeBlocker(base, { enabled: true, rate: 10 })).toBeNull()
  })

  it("chuẩn hoá ô xuất hoá đơn", () => {
    expect(normalizeInvoiceInfo({ companyName: "  Cty A ", taxCode: " 0123 456789 ", email: "" })).toEqual({
      companyName: "Cty A", taxCode: "0123456789", companyAddress: null, email: null,
    })
  })
})

describe("retotalWithVat", () => {
  it("giảm giá/phụ phí đổi giá trước thuế → VAT tính lại theo thuế suất", () => {
    expect(retotalWithVat(3_000_000, { vatEnabled: true, vatRate: 10 })).toEqual({ totalVnd: 3_300_000, vatAmountVnd: 300_000 })
    expect(retotalWithVat(3_000_000, { vatEnabled: true, vatRate: 8 })).toEqual({ totalVnd: 3_240_000, vatAmountVnd: 240_000 })
  })

  it("đơn không VAT giữ nguyên tổng = giá trước thuế", () => {
    expect(retotalWithVat(3_000_000, { vatEnabled: false, vatRate: 10 })).toEqual({ totalVnd: 3_000_000, vatAmountVnd: 0 })
  })
})
