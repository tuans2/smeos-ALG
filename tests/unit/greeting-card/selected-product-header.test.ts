import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/greeting-card/flower-image", () => ({ FlowerImage: () => null }))

import { SelectedProductHeader } from "@/components/greeting-card/customer/selected-product-header"

const product = { id: "p1", name: "Hộp hoa", price: 420000 } as never

/** Thẻ "Mẫu đã chọn" phải theo kích cỡ đang chọn, không giữ giá gốc (lệch với Tạm tính). */
describe("SelectedProductHeader", () => {
  it("hiện giá của kích cỡ đang chọn", () => {
    const html = renderToStaticMarkup(createElement(SelectedProductHeader, { product, variant: { name: "Nhỏ", priceVnd: 500000 } }))
    expect(html).toContain("500.000 đ")
    expect(html).not.toContain("420.000 đ")
  })

  it("không có kích cỡ: giá gốc", () => {
    const html = renderToStaticMarkup(createElement(SelectedProductHeader, { product }))
    expect(html).toContain("420.000 đ")
  })
})
