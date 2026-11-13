import { describe, it, expect } from "vitest"
import {
  calculateProductMatchScore,
  generateCustomerPitch,
  matchProductsByBudget,
  type ProductMatchCandidate,
  type BudgetMatchCriteria,
} from "../budget-flower-matcher"

describe("Budget Flower Matcher Domain (SP-18, SP-19, BH-04)", () => {
  const mockCandidates: ProductMatchCandidate[] = [
    {
      id: "prod-1",
      code: "FL-001",
      name: "Bó Hoa Tình Nồng",
      sellingPriceVnd: 650_000,
      category: "Sản phẩm",
      colorTheme: "Đỏ rực rỡ",
      occasions: ["Sinh nhật", "Kỷ niệm", "Tình yêu"],
      style: "Sản phẩm tròn",
      highlightFlowers: ["Hồng đỏ Ohara", "Baby trắng"],
      isFeatured: true,
    },
    {
      id: "prod-2",
      code: "FL-002",
      name: "Giỏ Hoa Nắng Mai",
      sellingPriceVnd: 550_000,
      category: "Giỏ hoa",
      colorTheme: "Vàng ấm",
      occasions: ["Sinh nhật", "Khai trương"],
      style: "Giỏ mây",
      highlightFlowers: ["Hướng dương", "Cúc tana"],
    },
    {
      id: "prod-3",
      code: "FL-003",
      name: "Bó Hoa Hồng Juliet VIP",
      sellingPriceVnd: 850_000, // Cao hơn ngân sách 700k (Upsell +21%)
      category: "Sản phẩm",
      colorTheme: "Cam pastel",
      occasions: ["Sinh nhật", "Kỷ niệm"],
      style: "Sản phẩm dài",
      highlightFlowers: ["Hồng Juliet", "Lan hồ điệp"],
      isFeatured: true,
    },
    {
      id: "prod-4",
      code: "FL-004",
      name: "Kệ Hoa Khai Trương Đại Phát",
      sellingPriceVnd: 1_800_000, // Quá đắt, vượt xa ngân sách
      category: "Kệ hoa",
      colorTheme: "Đỏ vàng",
      occasions: ["Khai trương"],
      style: "Kệ 2 tầng",
      highlightFlowers: ["Hồng môn", "Hướng dương"],
    },
  ]

  it("tính điểm tối đa cho mẫu nằm chuẩn ngân sách và đúng dịp tặng", () => {
    const criteria: BudgetMatchCriteria = {
      minPriceVnd: 500_000,
      maxPriceVnd: 700_000,
      occasion: "Sinh nhật",
      colorTone: "Đỏ",
      arrangementStyle: "Sản phẩm",
    }

    const evaluation = calculateProductMatchScore(mockCandidates[0]!, criteria)
    expect(evaluation.isExactBudget).toBe(true)
    expect(evaluation.isUpsell).toBe(false)
    expect(evaluation.score).toBeGreaterThanOrEqual(90)
    expect(evaluation.reasons).toContain("Đúng tầm ngân sách yêu cầu")
  })

  it("nhận diện chính xác sản phẩm thuộc diện đề xuất Upsell (+1% đến +25% ngân sách)", () => {
    const criteria: BudgetMatchCriteria = {
      minPriceVnd: 500_000,
      maxPriceVnd: 700_000,
      occasion: "Sinh nhật",
    }

    // Mẫu 850k so với max 700k là +21.4%
    const evaluation = calculateProductMatchScore(mockCandidates[2]!, criteria)
    expect(evaluation.isExactBudget).toBe(false)
    expect(evaluation.isUpsell).toBe(true)
    expect(evaluation.reasons.some((r) => r.includes("Nâng cấp nhẹ"))).toBe(true)
  })

  it("matchProductsByBudget lọc tách bạch bestMatches và upsellMatches", () => {
    const criteria: BudgetMatchCriteria = {
      minPriceVnd: 500_000,
      maxPriceVnd: 700_000,
      occasion: "Sinh nhật",
      recipient: "Bạn gái",
    }

    const result = matchProductsByBudget(mockCandidates, criteria)

    expect(result.totalCandidatesEvaluated).toBe(4)
    expect(result.bestMatches.length).toBeGreaterThanOrEqual(2)
    expect(result.bestMatches.every((m) => m.isExactBudget)).toBe(true)

    // Kiểm tra upsell
    expect(result.upsellMatches.length).toBe(1)
    expect(result.upsellMatches[0]?.product.name).toBe("Bó Hoa Hồng Juliet VIP")
    expect(result.upsellMatches[0]?.isUpsellRecommendation).toBe(true)
  })

  it("sinh lời thoại tư vấn gửi khách hàng tự nhiên và đầy đủ chi tiết", () => {
    const criteria: BudgetMatchCriteria = {
      minPriceVnd: 500_000,
      maxPriceVnd: 700_000,
      occasion: "Kỷ niệm",
      recipient: "Vợ yêu",
    }

    const pitch = generateCustomerPitch(mockCandidates[0]!, criteria, false)
    expect(pitch).toContain("Bó Hoa Tình Nồng")
    expect(pitch).toContain("650.000 đ")
    expect(pitch).toContain("tặng Vợ yêu")
    expect(pitch).toContain("dịp Kỷ niệm")
  })
})
