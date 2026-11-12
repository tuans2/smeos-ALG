import { describe, expect, it } from "vitest"

import { recipeFromAttributes } from "../recipe-snapshot"

describe("công thức của mẫu chép vào ảnh chụp đơn", () => {
  it("đọc bom.flowers của form sản phẩm; Hoa chính thành Chủ đạo", () => {
    expect(recipeFromAttributes({ bom: { flowers: [
      { name: "Hồng", quantity: 10, unit: "cành", color: "Đỏ", role: "Hoa chính" },
      { name: "Lá bạc", quantity: 5, unit: "nhánh", role: "Lá đệm" },
    ] } })).toEqual([
      { flowerName: "Hồng", quantity: 10, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
      { flowerName: "Lá bạc", quantity: 5, unit: "nhánh", color: null, role: "Lá đệm" },
    ])
  })

  it("bỏ dòng không tên, số lượng sai thành 0; không có công thức thì rỗng", () => {
    expect(recipeFromAttributes({ bom: { flowers: [{ quantity: 3 }, { name: "Cúc", quantity: -2 }] } })).toEqual([
      { flowerName: "Cúc", quantity: 0, unit: null, color: null, role: null },
    ])
    expect(recipeFromAttributes({ price: 1 })).toEqual([])
    expect(recipeFromAttributes(null)).toEqual([])
  })
})
