import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BrochureOrderOptions } from "../brochure-order-options"

/** Ô Mã ưu đãi chỉ hiện khi tiệm bật nhận mã giảm giá — tắt thì máy chủ bỏ qua mã (GD1 Bước 6, D-09). */
describe("BrochureOrderOptions — ô mã ưu đãi", () => {
  const render = (vouchersEnabled: boolean) =>
    renderToStaticMarkup(
      createElement(BrochureOrderOptions, {
        variants: [],
        basePrice: 400_000,
        shipping: { zones: [], freeShippingOverVnd: null, ...(vouchersEnabled ? { vouchersEnabled: true } : {}) },
        selection: { variantId: "", quantity: 1, shippingZoneId: "", voucherCode: "", paymentCode: "" },
        onChange: () => {},
        quote: null,
        errors: {},
        loading: false,
      })
    )

  it("tiệm chưa bật nhận mã: không có ô nhập mã ưu đãi", () => {
    expect(render(false)).not.toContain("Mã ưu đãi")
  })

  it("tiệm bật nhận mã: có ô nhập kèm tên truy cập", () => {
    expect(render(true)).toContain('aria-label="Mã ưu đãi"')
  })
})
