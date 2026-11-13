import { describe, it, expect } from "vitest"
import {
  extractBudgetFromQuery,
  extractOccasionFromQuery,
  matchProductsFromMasterIndex,
} from "@/modules/chat-assistant/domain/flower-consultant-rules"
import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"

describe("Flower Consultant Rules (M08 AI Chat)", () => {
  describe("Bóc tách ngân sách (extractBudgetFromQuery)", () => {
    it("nhận diện đúng các định dạng k", () => {
      expect(extractBudgetFromQuery("tìm bó hoa tầm 500k")).toBe(500000)
      expect(extractBudgetFromQuery("khoảng 650k nhé")).toBe(650000)
    })

    it("nhận diện đúng các định dạng triệu / tr", () => {
      expect(extractBudgetFromQuery("kệ hoa 1 triệu")).toBe(1000000)
      expect(extractBudgetFromQuery("bình hoa 1.5 triệu")).toBe(1500000)
      expect(extractBudgetFromQuery("khoảng 2tr")).toBe(2000000)
    })

    it("nhận diện đúng các định dạng ngàn / nghìn", () => {
      expect(extractBudgetFromQuery("tầm 700 ngàn")).toBe(700000)
      expect(extractBudgetFromQuery("800 nghìn")).toBe(800000)
    })

    it("trả về null khi câu hỏi không có số tiền", () => {
      expect(extractBudgetFromQuery("shop có hoa hồng đỏ không?")).toBeNull()
    })
  })

  describe("Bóc tách dịp tặng hoa (extractOccasionFromQuery)", () => {
    it("nhận diện sinh nhật", () => {
      expect(extractOccasionFromQuery("tư vấn hoa sinh nhật bạn gái")).toBe("Sinh nhật")
      expect(extractOccasionFromQuery("hoa sn em gái")).toBe("Sinh nhật")
    })

    it("nhận diện khai trương", () => {
      expect(extractOccasionFromQuery("kệ hoa mừng khai trương công ty")).toBe("Khai trương")
    })

    it("nhận diện kỷ niệm & tình yêu", () => {
      expect(extractOccasionFromQuery("hoa tặng kỷ niệm ngày cưới")).toBe("Kỷ niệm")
      expect(extractOccasionFromQuery("muốn mua hoa tỏ tình")).toBe("Tình yêu")
    })

    it("nhận diện chia buồn", () => {
      expect(extractOccasionFromQuery("hoa tang lễ viếng người mất")).toBe("Chia buồn")
    })
  })

  describe("Khớp sản phẩm từ Master Index (matchProductsFromMasterIndex)", () => {
    const mockProducts: ProductMasterIndex[] = [
      {
        id: "p1",
        organizationId: "org-1",
        code: "HOA-01",
        name: "Bó hoa hồng đỏ 20 cành",
        status: "ACTIVE",
        category: "Bó hoa",
        shape: "Tròn",
        facing: "Toàn diện",
        style: "Hiện đại",
        occasions: ["Sinh nhật", "Tình yêu"],
        colorPalette: { primaryColor: "Đỏ" },
        bom: { flowers: [], foliage: [], wrapping: [], wrapStyle: "Giấy xi măng", ribbon: "Nơ đỏ", accessories: [] },
        pricing: { quotePriceVnd: 500000 },
        // Ba trường bắt buộc thêm ở P-Fix-3 (nợ #95, `ProductMasterIndex`).
        variants: [],
        galleryImages: [],
        warningTags: [],
        updatedAt: "2026-09-26T00:00:00.000Z",
      },
      {
        id: "p2",
        organizationId: "org-1",
        code: "HOA-02",
        name: "Kệ hoa khai trương Đại Cát",
        status: "ACTIVE",
        category: "Kệ hoa",
        shape: "Thẳng đứng",
        facing: "Một mặt",
        style: "Sang trọng",
        occasions: ["Khai trương"],
        colorPalette: { primaryColor: "Vàng" },
        bom: { flowers: [], foliage: [], wrapping: [], wrapStyle: "Kệ gỗ", ribbon: "Nơ vàng", accessories: [] },
        pricing: { quotePriceVnd: 1200000 },
        variants: [],
        galleryImages: [],
        warningTags: [],
        updatedAt: "2026-09-26T00:00:00.000Z",
      },
    ]

    it("chọn mẫu hoa hồng khi khách hỏi sinh nhật tầm 500k", () => {
      const results = matchProductsFromMasterIndex(mockProducts, 500000, "Sinh nhật")
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.productId).toBe("p1")
      expect(results[0]!.priceVnd).toBe(500000)
    })

    it("chọn kệ hoa khi khách hỏi khai trương tầm 1 triệu", () => {
      const results = matchProductsFromMasterIndex(mockProducts, 1000000, "Khai trương")
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.productId).toBe("p2")
    })
  })
})
