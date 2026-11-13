import { describe, expect, it } from "vitest"

import { RUBRIC_V1, RUBRIC_ACCEPT_THRESHOLD, weightedScore } from "@/modules/content-engine/domain/rubric"

describe("rubric v1", () => {
  it("trọng số cộng lại bằng 1", () => {
    const total = RUBRIC_V1.reduce((s, c) => s + c.weight, 0)
    expect(total).toBeCloseTo(1, 5)
  })

  it("điểm tuyệt đối ở mọi kênh (có story) = 1", () => {
    const scores = { factual: 1, brand: 1, platform: 1, story: 1, readability: 1 }
    expect(weightedScore(scores, true)).toBeCloseTo(1, 5)
  })

  it("không có story: bỏ tiêu chí story khỏi tổng, không chấm 0 oan", () => {
    const scores = { factual: 1, brand: 1, platform: 1, readability: 1 }
    expect(weightedScore(scores, false)).toBeCloseTo(1, 5)
  })

  it("thiếu điểm một kênh coi như 0 cho kênh đó", () => {
    const scores = { factual: 0, brand: 1, platform: 1, story: 1, readability: 1 }
    const s = weightedScore(scores, true)
    expect(s).toBeLessThan(1)
    expect(s).toBeCloseTo(1 - 0.35, 5)
  })

  it("ngưỡng chấp nhận là 0.75", () => {
    expect(RUBRIC_ACCEPT_THRESHOLD).toBe(0.75)
  })

  it("kẹp điểm âm/lớn hơn 1 về [0,1]", () => {
    expect(weightedScore({ factual: -1, brand: 2, platform: 1, story: 1, readability: 1 }, true)).toBeGreaterThanOrEqual(0)
    expect(weightedScore({ factual: 1, brand: 1, platform: 1, story: 1, readability: 1 }, true)).toBeLessThanOrEqual(1)
  })
})
