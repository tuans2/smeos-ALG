import { describe, it, expect } from "vitest"
import {
  scoreProductForCollection,
  generateQuickCollection,
  type QuickCollectionCandidate,
  type QuickCollectionCriteria,
} from "../quick-collection-engine"

describe("quick-collection-engine", () => {
  const sampleProducts: QuickCollectionCandidate[] = [
    {
      id: "p1",
      code: "HOA-001",
      name: "Bó Hoa Hồng Đỏ Tình Yêu",
      price: 500_000,
      category: "Sản phẩm",
      shape: "Tròn",
      colorTheme: "Đỏ",
      occasions: ["Sinh nhật", "Kỷ niệm"],
      flowerTypes: ["Hoa hồng", "Baby"],
      status: "ACTIVE",
    },
    {
      id: "p2",
      code: "HOA-002",
      name: "Lẵng Hoa Lan Hồ Điệp Khai Trương",
      price: 1_500_000,
      category: "Kệ hoa",
      shape: "Cao",
      colorTheme: "Vàng",
      occasions: ["Khai trương"],
      flowerTypes: ["Lan hồ điệp"],
      status: "ACTIVE",
    },
    {
      id: "p3",
      code: "HOA-003",
      name: "Giỏ Hoa Hướng Dương Nắng Vàng",
      price: 650_000,
      category: "Giỏ hoa",
      shape: "Bầu dục",
      colorTheme: "Vàng",
      occasions: ["Sinh nhật", "Chúc mừng"],
      flowerTypes: ["Hướng dương", "Cúc tana"],
      status: "ACTIVE",
    },
  ]

  it("ưu tiên sản phẩm đúng khoảng giá và dịp tặng", () => {
    const criteria: QuickCollectionCriteria = {
      occasion: "Sinh nhật",
      priceMin: 400_000,
      priceMax: 700_000,
      productLimit: 2,
    }

    const result = generateQuickCollection(sampleProducts, criteria)
    expect(result.selectedProducts.length).toBe(2)
    expect(result.selectedProducts[0]?.id).toBe("p1") // Đúng giá + dịp + hoa hồng
  })

  it("sinh tiêu đề và thông điệp cá nhân hóa khi có tên khách hàng", () => {
    const criteria: QuickCollectionCriteria = {
      customerName: "Chị Lan Phương",
      customerPhone: "0912345678",
      occasion: "Sinh nhật",
      productLimit: 3,
    }

    const result = generateQuickCollection(sampleProducts, criteria)
    expect(result.generatedName).toContain("Chị Lan Phương")
    expect(result.customerMessage).toContain("Chị Lan Phương")
    expect(result.personalizedGreeting).toContain("Chị Lan Phương")
  })

  it("chọn nhiều khung giá cùng lúc và khớp sản phẩm thuộc một trong các khung", () => {
    const criteria: QuickCollectionCriteria = {
      priceRanges: [
        { min: 0, max: 500_000 },
        { min: 1_200_000, max: 2_000_000 },
      ],
      productLimit: 2,
    }

    const result = generateQuickCollection(sampleProducts, criteria)
    expect(result.selectedProducts.length).toBe(2)
    const matchedIds = result.selectedProducts.map((p) => p.id)
    expect(matchedIds).toContain("p1")
    expect(matchedIds).toContain("p2")
  })
})
