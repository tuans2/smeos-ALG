import { describe, expect, it } from "vitest"
import { evaluateSetQc } from "./image-set-rules"

describe("image-set-rules", () => {
  it("passes when all variants meet thresholds and set consistency is high", () => {
    const variants = [
      {
        id: "var_catalog",
        scores: {
          product_fidelity: 0.98,
          forbidden_content: 1.0,
          truthfulness: 0.95,
          background: 0.9,
          lighting: 0.9,
          color: 0.9,
          composition: 0.85,
          technical: 0.95,
        },
      },
      {
        id: "var_social",
        scores: {
          product_fidelity: 0.97,
          forbidden_content: 1.0,
          truthfulness: 0.92,
          background: 0.88,
          lighting: 0.89,
          color: 0.91,
          composition: 0.88,
          technical: 0.94,
        },
      },
    ]

    const res = evaluateSetQc(variants, 0.98)
    expect(res.passed).toBe(true)
    expect(res.setConsistencyScore).toBe(0.98)
    expect(res.overallScore).toBeGreaterThanOrEqual(0.8)
    expect(res.variantScores.every((v) => v.passed)).toBe(true)
  })

  it("fails set evaluation if set consistency is below threshold", () => {
    const variants = [
      {
        id: "var_catalog",
        scores: { product_fidelity: 0.98 },
      },
    ]

    const res = evaluateSetQc(variants, 0.85) // Threshold is 0.95
    expect(res.passed).toBe(false)
  })
})
