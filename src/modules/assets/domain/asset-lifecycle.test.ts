import { describe, expect, it } from "vitest"

import { isUnderLegalHold } from "./asset-lifecycle"

describe("isUnderLegalHold", () => {
  const now = new Date("2026-10-29T00:00:00Z")
  it("chỉ chặn khi hạn giữ còn ở tương lai", () => {
    expect(isUnderLegalHold({ legal_hold_until: null }, now)).toBe(false)
    expect(isUnderLegalHold({ legal_hold_until: new Date("2026-10-28T00:00:00Z") }, now)).toBe(false)
    expect(isUnderLegalHold({ legal_hold_until: new Date("2026-11-01T00:00:00Z") }, now)).toBe(true)
  })
})
