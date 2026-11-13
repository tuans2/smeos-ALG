import { describe, it, expect } from "vitest"
import {
  generateLandingPageContent,
  type LandingContentInput,
} from "../landing-content-generator"

describe("Landing Content Generator (7 Sections)", () => {
  const mockInput: LandingContentInput = {
    shopName: "Tiệm Hoa Mộc Lan",
    occasionId: "20-10",
    occasionLabel: "Phụ Nữ Việt Nam 20/10",
    archetypeId: "pastel-romantic",
    selectedProducts: [
      { name: "Bó Hoa Hồng Ohara Tinh Khôi", code: "SP01", price: 650000, category: "Hoa bó" },
      { name: "Lẵng Cẩm Tú Cầu Xanh Hy Vọng", code: "SP02", price: 850000, category: "Giỏ hoa" },
    ],
    userDirectives: "Tập trung hoa tặng mẹ yêu thương",
    discountPercent: 15,
  }

  it("should generate all 7 sections with cohesive content", () => {
    const result = generateLandingPageContent(mockInput)

    // 1. Hero Section
    expect(result.hero.headline.length).toBeGreaterThanOrEqual(10)
    expect(result.hero.subHeadline).toContain("Tiệm Hoa Mộc Lan")
    expect(result.hero.subHeadline).toContain("Tập trung hoa tặng mẹ yêu thương")

    // 2. Story Section
    expect(result.story.title).toContain("Tiệm Hoa Mộc Lan")
    expect(result.story.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(result.story.paragraphs[1]).toContain("Bó Hoa Hồng Ohara Tinh Khôi")
    expect(result.story.quote).toBeTruthy()

    // 3. 4 Perks
    expect(result.perks).toHaveLength(4)
    expect(result.perks[0]?.title).toBe("Xem ảnh mẫu trước khi đặt")
    expect(result.perks[1]?.title).toBe("Giao tận nơi theo hẹn")

    // 4. 3 Steps
    expect(result.steps).toHaveLength(3)
    expect(result.steps[0]?.step).toBe(1)
    expect(result.steps[2]?.step).toBe(3)

    // 5. FAQ
    expect(result.faq.length).toBeGreaterThanOrEqual(4)
    expect(result.faq[0]?.question).toContain("giống hình mẫu")

    // 6. Lead Section
    expect(result.lead.discountBadge).toBe("GIẢM 15%")
    expect(result.lead.title).toContain("15%")
  })

  it("không tự hứa giảm giá khi tiệm chưa bật ưu đãi", () => {
    const result = generateLandingPageContent({ ...mockInput, discountPercent: undefined })
    expect(result.lead.discountBadge).toBe("")
    expect(JSON.stringify(result.lead)).not.toMatch(/%|giảm|ưu đãi/i)
  })

  it("should adapt headline dynamically for Valentine", () => {
    const valInput: LandingContentInput = {
      ...mockInput,
      occasionId: "valentine",
      occasionLabel: "Lễ Tình Nhân 14/2",
    }
    const result = generateLandingPageContent(valInput)
    expect(result.hero.headline).toContain("Lễ Tình Nhân")
  })

  it("should adapt headline dynamically for Khai Trương", () => {
    const ktInput: LandingContentInput = {
      ...mockInput,
      occasionId: "khai-truong",
      occasionLabel: "Khai Trương Hồng Phát",
    }
    const result = generateLandingPageContent(ktInput)
    expect(result.hero.headline).toContain("Khai Trương Hồng Phát")
  })
})
