import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { OrderReview } from "@/components/greeting-card/customer/order-review"
import type { ProductSnapshot } from "@/modules/greeting-card/domain/greeting-card-types"

/** Bước "Xem lại đơn trước khi đặt" hiện ảnh mẫu khách đã chọn (PO 08/10/2026). */

const product: ProductSnapshot = {
  id: "p1",
  code: "TL-03",
  name: "Bó hoa tulip Hẹn Ước",
  price: 6_630_000,
  imageUrl: "https://cdn.example.vn/hoa/tulip-hen-uoc.jpg",
  selectedAt: "2026-10-08T00:00:00.000Z",
}

function render(variantName: string | null, p: ProductSnapshot = product) {
  return renderToStaticMarkup(
    createElement(OrderReview, {
      product: p,
      variantName,
      input: {
        customerName: "a Tuấn", customerPhone: "0932393944", recipientName: "c Thương", recipientPhone: "0932393955",
        deliveryDate: "2026-10-09", deliveryTimeSlot: "20:00 - 22:00", deliveryAddress: "26 Nguyễn Trãi, Hà Nội",
      },
      quote: null,
      submitting: false,
      error: null,
      onEdit: () => undefined,
      onConfirm: () => undefined,
    }),
  )
}

describe("Xem lại đơn — ảnh mẫu đã chọn", () => {
  it("hiện ảnh mẫu (đúng nguồn ảnh) kèm tên mẫu và size", () => {
    const html = render("Size L")
    expect(html).toContain('alt="Ảnh mẫu Bó hoa tulip Hẹn Ước"')
    expect(html).toContain(`src="${product.imageUrl}"`)
    expect(html).toContain("Mẫu bạn đã chọn")
    expect(html).toContain("Size L")
  })

  it("mẫu chưa có ảnh vẫn hiện khung (biểu tượng hoa), không vỡ trang", () => {
    const html = render(null, { ...product, imageUrl: null })
    expect(html).toContain("Mẫu bạn đã chọn")
    expect(html).toContain("Bó hoa tulip Hẹn Ước")
  })
})
