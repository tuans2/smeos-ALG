import { describe, expect, it } from "vitest"

import { jobStageLabel, UNKNOWN_JOB_STAGE_LABEL } from "./job-stage-labels"

describe("jobStageLabel — không hiện mã bước hay tên nhà cung cấp (UJ-07)", () => {
  it("bước đã biết → nhãn tiếng Việt", () => {
    expect(jobStageLabel("RENDERING")).toBe("Đang dựng video")
    expect(jobStageLabel("VEO_SUBMITTING")).not.toMatch(/VEO|veo/)
  })

  it("bước lạ → câu chung, không lộ mã", () => {
    expect(jobStageLabel("NEW_PROVIDER_STEP")).toBe(UNKNOWN_JOB_STAGE_LABEL)
  })

  it("không có bước → null", () => {
    expect(jobStageLabel(null)).toBeNull()
    expect(jobStageLabel("")).toBeNull()
  })
})
