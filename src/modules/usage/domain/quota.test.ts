import { describe, expect, it } from "vitest"

import { fundingSourceForWorkspace } from "./quota"

describe("fundingSourceForWorkspace", () => {
  it("workspace EXPERIENCE dùng hạn mức trial", () => {
    expect(fundingSourceForWorkspace("EXPERIENCE")).toBe("trial")
  })

  it("workspace PRODUCTION dùng credit của tổ chức", () => {
    expect(fundingSourceForWorkspace("PRODUCTION")).toBe("credit")
  })
})
