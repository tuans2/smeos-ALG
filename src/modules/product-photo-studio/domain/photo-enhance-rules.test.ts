import { describe, expect, it } from "vitest"
import { evaluateQc, canRetry } from "./photo-enhance-rules"

describe("photo-enhance-rules", () => {
  it("passes when all mandatory and scored thresholds are met", () => {
    const scores = {
      product_fidelity: 0.98,
      forbidden_content: 1.0,
      truthfulness: 0.95,
      background: 0.85,
      lighting: 0.88,
      color: 0.9,
      composition: 0.85,
      technical: 0.92,
    }

    const evalResult = evaluateQc(scores)
    expect(evalResult.passed).toBe(true)
    expect(evalResult.mandatoryPassed).toBe(true)
    expect(evalResult.failedCriteria).toHaveLength(0)
    expect(evalResult.overallScore).toBeGreaterThanOrEqual(0.8)
  })

  it("fails if mandatory criterion fails even if overall score is high", () => {
    const scores = {
      product_fidelity: 0.8, // threshold is 0.95 (MANDATORY)
      forbidden_content: 1.0,
      truthfulness: 0.95,
      background: 0.95,
      lighting: 0.95,
      color: 0.95,
      composition: 0.95,
      technical: 0.95,
    }

    const evalResult = evaluateQc(scores)
    expect(evalResult.passed).toBe(false)
    expect(evalResult.mandatoryPassed).toBe(false)
    expect(evalResult.failedCriteria).toContain("product_fidelity")
    expect(evalResult.retryHint).toBeTruthy()
  })

  it("permits retry when not passed and retry count < 2", () => {
    const evalResult = evaluateQc({ product_fidelity: 0.5 })
    expect(canRetry(0, evalResult)).toBe(true)
    expect(canRetry(1, evalResult)).toBe(true)
    expect(canRetry(2, evalResult)).toBe(false)
  })
})
