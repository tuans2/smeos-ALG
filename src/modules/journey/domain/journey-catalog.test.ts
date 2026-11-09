import { describe, expect, it } from "vitest"
import {
  NETWORK_JOURNEYS,
  PLATFORM_JOURNEYS,
  STORE_JOURNEYS,
  getStoreJourneys,
} from "./journey-catalog"
import { validateJourneyDefinition } from "./journey-model"

describe("journey-catalog domain", () => {
  it("toàn bộ Store Admin journeys hợp lệ theo quy chuẩn", () => {
    expect(STORE_JOURNEYS.length).toBe(14) // +greeting-card-hub (M14, d840344)
    for (const journey of STORE_JOURNEYS) {
      const result = validateJourneyDefinition(journey)
      expect(result.valid).toBe(true)
      expect(journey.roleScope).toBe("STORE")
    }
  })

  it("toàn bộ Platform Admin journeys hợp lệ theo quy chuẩn", () => {
    expect(PLATFORM_JOURNEYS.length).toBe(10)
    for (const journey of PLATFORM_JOURNEYS) {
      const result = validateJourneyDefinition(journey)
      expect(result.valid).toBe(true)
      expect(journey.roleScope).toBe("PLATFORM")
    }
  })

  it("toàn bộ Network Admin journeys hợp lệ theo quy chuẩn", () => {
    expect(NETWORK_JOURNEYS.length).toBe(8)
    for (const journey of NETWORK_JOURNEYS) {
      const result = validateJourneyDefinition(journey)
      expect(result.valid).toBe(true)
      expect(journey.roleScope).toBe("FLOWER_NETWORK")
    }
  })

  it("không chứa mã kỹ thuật bị cấm trong tiêu đề và mô tả (UX Lint R8)", () => {
    const forbiddenPatterns = [
      /\bM01[a-c]?\b/i,
      /\bM04[a-f]?\b/i,
      /\bRBAC\b/i,
      /\bSSOT\b/i,
      /\bChặng \d+\b/i,
    ]

    const allJourneys = [
      ...STORE_JOURNEYS,
      ...PLATFORM_JOURNEYS,
      ...NETWORK_JOURNEYS,
    ]

    for (const j of allJourneys) {
      for (const pattern of forbiddenPatterns) {
        expect(j.goal).not.toMatch(pattern)
        expect(j.description).not.toMatch(pattern)
        for (const step of j.steps) {
          expect(step.label).not.toMatch(pattern)
          if (step.description) {
            expect(step.description).not.toMatch(pattern)
          }
        }
      }
    }
  })

  it("getStoreJourneys thích ứng linh hoạt theo ngành (Fashion, FNB, Floral)", () => {
    // Ngành Thời trang
    const fashionJourneys = getStoreJourneys("FASHION")
    expect(fashionJourneys.length).toBe(14)
    const hubFashion = fashionJourneys.find((j) => j.id === "greeting-card-hub")
    const scanFashion = fashionJourneys.find((j) => j.id === "analyze-product-photo")
    const orderFashion = fashionJourneys.find((j) => j.id === "create-order")

    // Tên việc ngắn, chung mọi ngành; thuật ngữ ngành nằm ở mô tả (OPERATING_PRINCIPLES §6)
    expect(hubFashion?.goal).toBe("Bộ sưu tập riêng")
    expect(hubFashion?.description).toContain("bộ sưu tập lookbook")
    expect(scanFashion?.goal).toBe("Sản phẩm từ ảnh")
    expect(scanFashion?.steps[0]?.description).toContain("mẫu thiết kế lookbook")
    expect(orderFashion?.description).toContain("thợ may / kỹ thuật cắt")

    // Ngành Mặc định (FLORAL)
    const floralJourneys = getStoreJourneys("FLORAL")
    expect(floralJourneys.find((j) => j.id === "greeting-card-hub")?.goal).toBe("Bộ sưu tập riêng")
  })
})

