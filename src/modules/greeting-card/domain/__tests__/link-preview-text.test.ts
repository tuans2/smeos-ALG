import { describe, expect, it } from "vitest"
import { linkPreviewText } from "../link-preview-text"

describe("linkPreviewText", () => {
  it("tiêu đề gồm tên bộ sưu tập và tên tiệm; mô tả có số mẫu và giá thấp nhất", () => {
    expect(
      linkPreviewText({ catalogName: "Hoa Chúc Mừng 20-10", shopName: "Siin Store", catalogDescription: null, prices: [1040000, 470000, null] })
    ).toEqual({ title: "Hoa Chúc Mừng 20-10 · Siin Store", description: "3 sản phẩm, giá từ 470.000đ. Chạm để xem và đặt hàng." })
  })
  it("giữ mô tả tiệm tự viết; không có giá thì bỏ phần giá; không có tên tiệm thì chỉ tên bộ sưu tập", () => {
    expect(linkPreviewText({ catalogName: "Hoa Cưới", shopName: null, catalogDescription: "Hoa cưới tone trắng", prices: [] })).toEqual({
      title: "Hoa Cưới",
      description: "Hoa cưới tone trắng",
    })
    expect(linkPreviewText({ catalogName: "Hoa Cưới", shopName: "A", catalogDescription: " ", prices: [null] }).description).toBe(
      "1 sản phẩm. Chạm để xem và đặt hàng."
    )
  })
})
