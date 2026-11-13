import { describe, expect, it } from "vitest"
import { executeGenerateLandingContent } from "../generate-landing-page-content.use-case"
import { executeGenerateCatalogContent } from "../generate-catalog-content.use-case"

describe("generate-landing-page-content.use-case (Option B Full)", () => {
  it("trả về fallback template an toàn khi không truyền ctx", async () => {
    const result = await executeGenerateLandingContent({
      shopName: "Tiệm Hoa Mộc Lan",
      occasionId: "grand_opening",
      occasionLabel: "Khai trương hồng phát",
      selectedProducts: [
        { name: "Kệ hoa Khai Trương Thịnh Vượng", code: "KT-01", price: 1500000 },
        { name: "Lẵng hoa Phát Tài Phát Lộc", code: "KT-02", price: 850000 },
      ],
      discountPercent: 10,
    })

    expect(result).toBeDefined()
    expect(result.hero.headline).toContain("Khai trương")
    expect(result.story.paragraphs.length).toBeGreaterThanOrEqual(1)
    expect(result.perks.length).toBe(4)
    expect(result.faq.length).toBeGreaterThan(0)
    expect(result.lead.title).toBeDefined()
  })

  it("xử lý khi không có sản phẩm nào được chọn mà không bị crash", async () => {
    const result = await executeGenerateLandingContent({
      shopName: "Hoa Tươi Đà Lạt",
      occasionId: "birthday",
      occasionLabel: "Sinh nhật rạng rỡ",
      selectedProducts: [],
    })

    expect(result.hero.headline).toBeDefined()
    expect(result.perks.length).toBe(4)
  })
})

describe("generate-catalog-content.use-case (Option B Full)", () => {
  it("trả về đúng template cho phong cách EDITORIAL_LOOKBOOK khi không có ctx", async () => {
    const result = await executeGenerateCatalogContent({
      shopName: "Tiệm Hoa Mộc Lan",
      collectionName: "Sắc Hoa Mùa Thu",
      productCount: 12,
      styleVariant: "EDITORIAL_LOOKBOOK",
    })

    expect(result.styleVariant).toBe("EDITORIAL_LOOKBOOK")
    expect(result.badge).toBe("Bộ sưu tập chọn lọc")
    expect(result.title).toBe("Sắc Hoa Mùa Thu")
    expect(result.ctaText).toBe("Xem mẫu và nhắn tiệm")
  })

  it("trả về đúng template cho phong cách COMPACT_LIST cho B2B khi không có ctx", async () => {
    const result = await executeGenerateCatalogContent({
      shopName: "Tiệm Hoa Doanh Nghiệp",
      collectionName: "Hoa Định Kỳ Văn Phòng",
      productCount: 8,
      styleVariant: "COMPACT_LIST",
    })

    expect(result.styleVariant).toBe("COMPACT_LIST")
    expect(result.badge).toBe("Danh mục đặt nhanh")
    expect(result.description).toContain("8 sản phẩm")
    expect(result.curatorNote).toContain("nhắn tiệm để được xác nhận")
  })
})
