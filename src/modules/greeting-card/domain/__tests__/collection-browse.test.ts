import { describe, expect, it } from "vitest"
import { customDesignMessage, findPriceRange, priceRangesOf, productInquiryMessage, similarProducts } from "../collection-browse"

const P = (id: string, price: number | null, extra: Record<string, unknown> = {}) => ({ id, code: id.toUpperCase(), name: `Mẫu ${id}`, price, ...extra })

describe("collection-browse", () => {
  it("tin nhắn Zalo chứa mã, tên và giá mẫu", () => {
    expect(productInquiryMessage({ code: "FL-8075", name: "Hồng đỏ", price: 650000 })).toBe("Tôi muốn hỏi về mẫu FL-8075 (Hồng đỏ) – 650.000đ.")
    expect(productInquiryMessage({ code: "", name: "Cúc", price: null })).toBe("Tôi muốn hỏi về mẫu Cúc – giá liên hệ.")
    expect(customDesignMessage("Tết")).toContain("thiết kế riêng")
  })

  it("chỉ trả khoảng giá có mẫu; mẫu chưa có giá không thuộc khoảng nào", () => {
    const ranges = priceRangesOf([P("a", 300000), P("b", 450000), P("c", 1500000), P("d", null)])
    expect(ranges.map((r) => [r.key, r.count])).toEqual([["duoi-500", 2], ["1-2tr", 1]])
    expect(findPriceRange("1-2tr")?.max).toBe(2000000)
    expect(findPriceRange("la")).toBeNull()
  })

  it("mẫu tương tự: bỏ chính nó và mẫu hết hàng, ưu tiên cùng loại và giá gần", () => {
    const target = P("t", 600000, { category: "bo" })
    const list = [target, P("x", 600000, { category: "gio" }), P("y", 650000, { category: "bo" }), P("z", 600000, { category: "bo", available: false })]
    expect(similarProducts(target, list).map((p) => p.id)).toEqual(["y", "x"])
  })
})
