import { describe, expect, it } from "vitest"
import {
  calculateReadinessScore,
  type ReadinessScoreInput,
} from "./readiness-score-engine"

describe("Readiness Score Engine (§8.2 - §8.3)", () => {
  it("calculates 100/100 score when all criteria are satisfied", () => {
    const input: ReadinessScoreInput = {
      targetStage: "G1",
      fields: [
        { fieldKey: "org.name", isPopulated: true, isValid: true, isFresh: true },
        { fieldKey: "brand.logo", isPopulated: true, isValid: true, isFresh: true },
        { fieldKey: "pricing.tax", isPopulated: true, isValid: true, isFresh: true },
      ],
      consistencyChecks: [
        { checkId: "CHK-01", description: "Tài khoản nhận tiền hợp lệ", passed: true },
      ],
      approvalItems: [
        { itemId: "R1-POL", isApproved: true },
      ],
    }

    const result = calculateReadinessScore(input)
    expect(result.totalScore).toBe(100)
    expect(result.completenessScore).toBe(40)
    expect(result.validityScore).toBe(20)
    expect(result.freshnessScore).toBe(15)
    expect(result.consistencyScore).toBe(15)
    expect(result.approvalScore).toBe(10)
    expect(result.isGatePassed).toBe(true)
    expect(result.blockingReasons).toHaveLength(0)
  })

  it("blocks gate when mandatory fields are missing", () => {
    const input: ReadinessScoreInput = {
      targetStage: "G1",
      fields: [
        { fieldKey: "org.name", isPopulated: true, isValid: true, isFresh: true },
        { fieldKey: "org.tax_code", isPopulated: false, isValid: false, isFresh: false },
      ],
      consistencyChecks: [
        { checkId: "CHK-01", description: "Nhất quán", passed: true },
      ],
      approvalItems: [],
    }

    const result = calculateReadinessScore(input)
    expect(result.completenessScore).toBe(20) // 50% of 40
    expect(result.isGatePassed).toBe(false)
    expect(result.blockingReasons.some((r) => r.includes("Còn thiếu 1 trường"))).toBe(true)
  })

  it("detects cross-domain consistency failure", () => {
    const input: ReadinessScoreInput = {
      targetStage: "G2",
      fields: [
        { fieldKey: "pricing.price", isPopulated: true, isValid: true, isFresh: true },
      ],
      consistencyChecks: [
        {
          checkId: "PRICE_VS_COST",
          description: "Giá bán không được nhỏ hơn giá vốn",
          passed: false, // VIOLATED
        },
      ],
      approvalItems: [],
    }

    const result = calculateReadinessScore(input)
    expect(result.isGatePassed).toBe(false)
    expect(result.blockingReasons.some((r) => r.includes("Giá bán không được nhỏ hơn giá vốn"))).toBe(true)
  })
})
