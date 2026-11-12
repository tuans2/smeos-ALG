import { describe, expect, it } from "vitest"

import { NOTICE_DAYS } from "@/core/http/deprecation"

import { INTEGRATION_KEY_REUSE_CHANGE, integrationKeyReuseMode } from "./integration-key-reuse"

describe("integrationKeyReuseMode — lịch 422 khoá trùng cho Integration API", () => {
  it("khoảng báo trước không dưới mức tối thiểu cho bề mặt bên ngoài", () => {
    const days = (Date.parse(INTEGRATION_KEY_REUSE_CHANGE.effective) - Date.parse(INTEGRATION_KEY_REUSE_CHANGE.announced)) / 86_400_000
    expect(days).toBeGreaterThanOrEqual(NOTICE_DAYS.external)
  })

  it("trước ngày hiệu lực giữ hành vi cũ; từ 00:00 UTC ngày hiệu lực áp luật chung", () => {
    expect(integrationKeyReuseMode(new Date("2026-11-11T10:00:00Z"))).toBe("legacy")
    expect(integrationKeyReuseMode(new Date("2027-02-08T23:59:59Z"))).toBe("legacy")
    expect(integrationKeyReuseMode(new Date("2027-02-09T00:00:00Z"))).toBeUndefined()
    expect(integrationKeyReuseMode(new Date("2028-01-01T00:00:00Z"))).toBeUndefined()
  })
})
