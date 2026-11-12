import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ProductCard, type ProductItem } from "../product-card"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const product: ProductItem = {
  id: "p1",
  name: "Hộp hoa mẫu",
  code: "ML-BOX-04",
  category: "BOX",
  shape: null,
  status: "ACTIVE",
  price_vnd: 950000,
}

describe("ProductCard — danh mục hiện bằng nhãn tiếng Việt", () => {
  it("dùng nhãn được truyền vào thay cho mã danh mục", () => {
    const html = renderToStaticMarkup(<ProductCard product={product} categoryLabel="Hộp hoa" />)
    expect(html).toContain("Hộp hoa</span>")
    expect(html).not.toMatch(/>BOX</)
  })

  it("không có nhãn thì giữ giá trị trong dữ liệu, không có danh mục thì ghi chưa phân loại", () => {
    expect(renderToStaticMarkup(<ProductCard product={product} />)).toContain(">BOX<")
    expect(renderToStaticMarkup(<ProductCard product={{ ...product, category: null }} />)).toContain("Chưa phân loại")
  })
})
