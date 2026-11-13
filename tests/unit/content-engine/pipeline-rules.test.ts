import { describe, expect, it } from "vitest"

import {
  allChannelsFellBack,
  MAX_REWRITE_ROUNDS,
  aggregateOverallScore,
  decideChannelRewrite,
  needsHumanReview,
} from "@/modules/content-engine/domain/pipeline-rules"
import type { DeterministicCheckIssue } from "@/modules/content-engine/domain/deterministic-checks"

const goodScores = { factual: 1, brand: 1, platform: 1, readability: 1 }
const badScores = { factual: 0.3, brand: 0.3, platform: 0.3, readability: 0.3 }

describe("decideChannelRewrite", () => {
  it("điểm cao, không lỗi tất định: không cần viết lại", () => {
    const d = decideChannelRewrite({ deterministicIssues: [], criticScores: goodScores, hasStory: false })
    expect(d.needsRewrite).toBe(false)
    expect(d.reasons).toEqual([])
  })

  it("có lỗi REJECTED: cần viết lại dù điểm cao", () => {
    const issues: DeterministicCheckIssue[] = [{ severity: "REJECTED", code: "LENGTH_OVER_HARD_CAP", message: "quá dài" }]
    const d = decideChannelRewrite({ deterministicIssues: issues, criticScores: goodScores, hasStory: false })
    expect(d.needsRewrite).toBe(true)
    expect(d.reasons).toContain("quá dài")
  })

  it("lỗi NEEDS_REVIEW một mình không bắt viết lại", () => {
    const issues: DeterministicCheckIssue[] = [{ severity: "NEEDS_REVIEW", code: "LENGTH_OUTSIDE_TARGET", message: "hơi ngắn" }]
    const d = decideChannelRewrite({ deterministicIssues: issues, criticScores: goodScores, hasStory: false })
    expect(d.needsRewrite).toBe(false)
  })

  it("điểm dưới ngưỡng: cần viết lại", () => {
    const d = decideChannelRewrite({ deterministicIssues: [], criticScores: badScores, hasStory: false })
    expect(d.needsRewrite).toBe(true)
    expect(d.reasons[0]).toMatch(/dưới ngưỡng/)
  })

  it("ngưỡng tuỳ chỉnh được truyền vào", () => {
    const d = decideChannelRewrite({ deterministicIssues: [], criticScores: badScores, hasStory: false, threshold: 0.1 })
    expect(d.needsRewrite).toBe(false)
  })
})

describe("aggregateOverallScore", () => {
  it("trung bình cộng đơn giản", () => {
    expect(aggregateOverallScore([1, 0.5, 0])).toBeCloseTo(0.5, 5)
  })
  it("mảng rỗng trả 0, không chia cho 0", () => {
    expect(aggregateOverallScore([])).toBe(0)
  })
})

describe("needsHumanReview / MAX_REWRITE_ROUNDS", () => {
  it("mặc định tối đa 1 vòng viết lại", () => {
    expect(MAX_REWRITE_ROUNDS).toBe(1)
  })

  it("còn cần viết lại nhưng đã hết vòng: cần người soát", () => {
    const d = decideChannelRewrite({ deterministicIssues: [], criticScores: badScores, hasStory: false })
    expect(needsHumanReview(d, MAX_REWRITE_ROUNDS)).toBe(true)
  })

  it("còn vòng để thử: chưa cần người soát", () => {
    const d = decideChannelRewrite({ deterministicIssues: [], criticScores: badScores, hasStory: false })
    expect(needsHumanReview(d, 0)).toBe(false)
  })

  it("không cần viết lại: không bao giờ cần người soát", () => {
    const d = decideChannelRewrite({ deterministicIssues: [], criticScores: goodScores, hasStory: false })
    expect(needsHumanReview(d, MAX_REWRITE_ROUNDS)).toBe(false)
  })
})

describe("allChannelsFellBack", () => {
  it("chỉ đúng khi MỌI kênh là template", () => {
    expect(allChannelsFellBack(["template", "template"])).toBe(true)
    expect(allChannelsFellBack(["template", "ai"])).toBe(false)
    expect(allChannelsFellBack(["rewritten"])).toBe(false)
    expect(allChannelsFellBack([])).toBe(false)
  })
})
