import { describe, expect, it } from "vitest"

import {
  isValidGeneratedFlags,
  nextVersion,
  requiresExplicitGeneratedFlags,
} from "./asset-rules"

describe("requiresExplicitGeneratedFlags", () => {
  it("asset gốc không bắt buộc cờ", () => {
    expect(requiresExplicitGeneratedFlags({ kind: "ORIGINAL", parentAssetId: null })).toBe(false)
  })

  it("asset dẫn xuất bắt buộc cờ — YC-A5", () => {
    expect(requiresExplicitGeneratedFlags({ kind: "ENHANCED", parentAssetId: "a0" })).toBe(true)
  })
})

describe("isValidGeneratedFlags", () => {
  it("từ chối thiếu trường, chấp nhận đủ hai cờ boolean", () => {
    expect(isValidGeneratedFlags({})).toBe(false)
    expect(isValidGeneratedFlags({ generative_fill_used: true })).toBe(false)
    expect(
      isValidGeneratedFlags({ generative_fill_used: false, requires_reshoot_warning: true })
    ).toBe(true)
  })
})

describe("nextVersion", () => {
  it("asset gốc là version 1, dẫn xuất +1 so với cha", () => {
    expect(nextVersion(null)).toBe(1)
    expect(nextVersion(3)).toBe(4)
  })
})
