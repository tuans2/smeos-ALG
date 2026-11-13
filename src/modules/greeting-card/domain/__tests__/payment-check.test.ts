import { describe, expect, it } from "vitest"
import { paymentCheckOf } from "../payment-check"

describe("paymentCheckOf", () => {
  it("liệt kê lý do giá chốt khác giá công bố", () => {
    const c = paymentCheckOf({
      total_vnd: 980000,
      pricing_rule_ref: { unitPriceVnd: 550000, quantity: 2, discountVnd: 150000, voucherCode: "QUEN10", shippingFeeVnd: 30000, shippingZone: { name: "Quận 1" } },
      items: [{ metadata: { name: "Bó Juliet", code: "HOA-1", variant: { name: "Lớn" } }, quantity: 2, unit_price_vnd: 550000 }],
      greeting_sessions: [{ product_snapshot: { name: "Bó Juliet", code: "HOA-1", price: 500000, imageUrl: "/a.jpg" } }],
    })
    expect(c).toMatchObject({ productName: "Bó Juliet", productCode: "HOA-1", listedPriceVnd: 500000, agreedTotalVnd: 980000, imageUrl: "/a.jpg" })
    expect(c.reasons).toEqual([
      'Kích cỡ "Lớn": 550.000đ',
      "Số lượng ×2",
      "Mã giảm giá QUEN10: −150.000đ",
      "Phí giao Quận 1: +30.000đ",
    ])
  })

  it("mẫu chưa niêm yết giá: hiện báo giá và lý do do điều hành ghi", () => {
    const c = paymentCheckOf({
      total_vnd: 1200000,
      pricing_rule_ref: { awaitingQuote: false, quotedTotalVnd: 1200000, quoteReason: "Thêm hoa nhập" },
      greeting_sessions: [{ product_snapshot: { name: "Mẫu đặt riêng", price: 0 } }],
    })
    expect(c.listedPriceVnd).toBeNull()
    expect(c.reasons).toEqual(["Cửa hàng báo giá sau: 1.200.000đ — Thêm hoa nhập"])
  })

  it("giá chốt bằng giá công bố → không có lý do", () => {
    expect(paymentCheckOf({ total_vnd: 500000, pricing_rule_ref: { unitPriceVnd: 500000, quantity: 1 }, greeting_sessions: [{ product_snapshot: { price: 500000 } }] }).reasons).toEqual([])
  })

  it("giảm giá Điều hành duyệt hiện kèm lý do và ghi chú", () => {
    const c = paymentCheckOf({
      total_vnd: 950000,
      pricing_rule_ref: { unitPriceVnd: 1000000, quantity: 1, manualDiscount: { vnd: 50000, percent: 5, reason: "Khách quen", note: "Duyệt 5% thay vì 10%" } },
      greeting_sessions: [{ product_snapshot: { price: 1000000 } }],
    })
    expect(c.reasons).toEqual(["Giảm giá được duyệt 5%: −50.000đ — Khách quen · Duyệt 5% thay vì 10%"])
  })

  it("dùng thông tin mẫu dựng sẵn ở server (SSOT) thay cho ảnh chụp mẫu thiếu ảnh", () => {
    const c = paymentCheckOf({
      total_vnd: 468000,
      greeting_sessions: [{ product_snapshot: { name: "Rosa 743", price: 468000 } }],
      product: { name: "Rosa 743", code: "SP-743", imageUrl: "/kho/rosa.jpg" },
    })
    expect(c).toMatchObject({ productName: "Rosa 743", productCode: "SP-743", imageUrl: "/kho/rosa.jpg" })
  })
})
