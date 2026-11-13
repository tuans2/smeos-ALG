import { describe, expect, it } from "vitest"

import {
  extractBudgetFromQuery,
  extractOccasionFromQuery,
  matchProductsFromMasterIndex,
  hasRealPrice,
  formatQuotePriceForChat,
} from "./flower-consultant-rules"
import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"

function makeProduct(overrides: Partial<ProductMasterIndex> & { quotePriceVnd: number }): ProductMasterIndex {
  const { quotePriceVnd, ...rest } = overrides
  return {
    id: "p1",
    organizationId: "org1",
    code: "HOA-001",
    name: "Sản phẩm hồng đỏ",
    status: "ACTIVE",
    category: "Sản phẩm",
    shape: "Tròn",
    facing: "Một mặt",
    style: "Hiện đại",
    occasions: ["Sinh nhật"],
    colorPalette: { primaryColor: "Đỏ" },
    bom: {
      flowers: [{ flowerName: "Hoa hồng", quantity: 20, unit: "cành", color: "Đỏ", role: "Chủ đạo" }],
      foliage: [],
      wrapping: [],
      wrapStyle: "Giấy kraft",
      ribbon: "Ruy băng đỏ",
      accessories: [],
    },
    pricing: { quotePriceVnd },
    // Ba trường bắt buộc thêm ở P-Fix-3 (nợ #95, `ProductMasterIndex`) —
    // fixture thử của module này không cần biến thể/ảnh/cảnh báo nên để
    // mảng rỗng, không phải giá trị nghiệp vụ cần đoán.
    variants: [],
    galleryImages: [],
    warningTags: [],
    updatedAt: "2026-09-26T00:00:00.000Z",
    ...rest,
  }
}

describe("hasRealPrice / formatQuotePriceForChat", () => {
  it("giá 0 (chưa cấu hình giá thật) không được coi là giá thật", () => {
    expect(hasRealPrice(0)).toBe(false)
    expect(formatQuotePriceForChat(0)).toBe("chưa cập nhật giá, liên hệ shop")
  })

  it("giá dương là giá thật, hiển thị đúng định dạng tiền Việt", () => {
    expect(hasRealPrice(650000)).toBe(true)
    expect(formatQuotePriceForChat(650000)).toBe("650.000 đ")
  })
})

describe("matchProductsFromMasterIndex", () => {
  it("không bao giờ báo giá 0đ cho khách khi sản phẩm chưa có giá thật", () => {
    const products = [makeProduct({ quotePriceVnd: 0, occasions: ["Sinh nhật"] })]
    const [card] = matchProductsFromMasterIndex(products, 500000, "Sinh nhật")
    expect(card).toBeDefined()
    // Có dịp phù hợp nên câu gợi ý ưu tiên nhắc dịp — điều quan trọng là KHÔNG BAO GIỜ
    // hiện "0 đ" như một mức giá thật.
    expect(card!.reason).not.toContain("0 đ")
  })

  it("khi không có dịp lẫn giá thật, nói rõ chưa cập nhật giá thay vì im lặng bịa số", () => {
    const products = [makeProduct({ quotePriceVnd: 0, occasions: [] })]
    const [card] = matchProductsFromMasterIndex(products, 500000, null)
    expect(card!.reason.toLowerCase()).toContain("chưa cập nhật giá")
  })

  it("sản phẩm có giá thật khớp ngân sách vẫn được xếp hạng và báo giá bình thường", () => {
    const products = [
      makeProduct({ id: "p1", quotePriceVnd: 500000, occasions: ["Sinh nhật"] }),
      makeProduct({ id: "p2", quotePriceVnd: 0, occasions: ["Sinh nhật"] }),
    ]
    const cards = matchProductsFromMasterIndex(products, 500000, "Sinh nhật")
    expect(cards[0]!.productId).toBe("p1")
    expect(cards[0]!.reason).toContain("500.000 đ")
  })

  it("không có sản phẩm nào thì trả mảng rỗng", () => {
    expect(matchProductsFromMasterIndex([], 500000, null)).toEqual([])
  })
})

describe("extractBudgetFromQuery / extractOccasionFromQuery (giữ nguyên hành vi cũ)", () => {
  it("đọc đúng các cách viết ngân sách tiếng Việt thông dụng", () => {
    expect(extractBudgetFromQuery("khoảng 500k")).toBe(500000)
    expect(extractBudgetFromQuery("800 ngàn")).toBe(800000)
    expect(extractBudgetFromQuery("giá không nói gì")).toBeNull()
  })

  it("đọc đúng dịp sử dụng", () => {
    expect(extractOccasionFromQuery("tặng sinh nhật bạn gái")).toBe("Sinh nhật")
    expect(extractOccasionFromQuery("không rõ dịp gì")).toBeNull()
  })
})
