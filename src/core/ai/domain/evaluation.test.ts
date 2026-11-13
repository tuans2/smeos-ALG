import { describe, expect, it } from "vitest"

import { aiCapability } from "./ai-capabilities"
import { evaluateOutput } from "./evaluation"

const content = aiCapability("content_generation")

describe("lớp chấm điểm", () => {
  it("thiếu một kênh đã khai là KHÔNG HỢP LỆ, không phải điểm 0 — YC-E10", () => {
    const result = evaluateOutput(content, { factual: 0.9, brand: 0.8, platform: 0.9 }, 0.75)
    expect(result.kind).toBe("khong_hop_le")
    if (result.kind === "khong_hop_le") expect(result.missingChannels).toEqual(["readability"])
  })

  it("điểm tổng là kênh thấp nhất, không phải trung bình", () => {
    const result = evaluateOutput(
      content,
      { factual: 1, brand: 0.4, platform: 1, readability: 1 },
      null
    )
    expect(result.kind).toBe("hop_le")
    if (result.kind === "hop_le") expect(result.overall).toBe(0.4)
  })

  it("ngưỡng trống thì chấm, ghi, KHÔNG chặn — D20", () => {
    const result = evaluateOutput(
      content,
      { factual: 0.1, brand: 0.1, platform: 0.1, readability: 0.1 },
      null
    )
    expect(result.kind).toBe("hop_le")
    if (result.kind === "hop_le") {
      expect(result.needsReview).toBe(false)
      expect(result.reason).toBe("chua_co_nguong_da_do")
    }
  })

  it("điểm dưới ngưỡng đặt needsReview — YC-E2", () => {
    const result = evaluateOutput(
      content,
      { factual: 0.9, brand: 0.6, platform: 0.9, readability: 0.9 },
      0.75
    )
    expect(result.kind).toBe("hop_le")
    if (result.kind === "hop_le") {
      expect(result.needsReview).toBe(true)
      expect(result.thresholdUsed).toBe(0.75)
    }
  })

  it("năng lực tất định không có gì để chấm", () => {
    const result = evaluateOutput(aiCapability("watermark"), {}, 0.9)
    expect(result.kind).toBe("hop_le")
    if (result.kind === "hop_le") expect(result.needsReview).toBe(false)
  })
})
