import { describe, expect, it } from "vitest"

import { isRetentionDue, policySkipReason, retentionCutoff } from "./retention-policy"

describe("hạn lưu theo loại dữ liệu", () => {
  it("mốc cắt lùi theo tháng lịch; ngày cuối tháng rơi vào tháng ngắn thì lấy ngày cuối", () => {
    expect(retentionCutoff(new Date("2026-11-11T02:00:00Z"), 3).toISOString()).toBe("2026-08-11T02:00:00.000Z")
    expect(retentionCutoff(new Date("2026-05-31T00:00:00Z"), 3).toISOString()).toBe("2026-02-28T00:00:00.000Z")
    expect(retentionCutoff(new Date("2026-11-11T00:00:00Z"), 60).toISOString()).toBe("2021-11-11T00:00:00.000Z")
  })

  it("chỉ chạy loại mã đã biết, đúng hành động, hạn hợp lệ", () => {
    expect(policySkipReason({ category: "technical_logs", retentionMonths: 3, action: "DELETE", enforce: true })).toBeNull()
    expect(policySkipReason({ category: "delivery_info", retentionMonths: 12, action: "ANONYMIZE", enforce: false })).toBeNull()
    expect(policySkipReason({ category: "customer_profiles", retentionMonths: 24, action: "ANONYMIZE", enforce: true })).toBeNull()
    expect(policySkipReason({ category: "non_ledger_documents", retentionMonths: 60, action: "ANONYMIZE", enforce: true })).toMatch(/chỉ hỗ trợ DELETE/)
    expect(policySkipReason({ category: "technical_logs", retentionMonths: 3, action: "ANONYMIZE", enforce: true })).toMatch(/chỉ hỗ trợ DELETE/)
    expect(policySkipReason({ category: "customers", retentionMonths: 24, action: "ANONYMIZE", enforce: true })).toMatch(/chưa được hỗ trợ/)
    expect(policySkipReason({ category: "toString", retentionMonths: 1, action: "DELETE", enforce: true })).toMatch(/chưa được hỗ trợ/)
    expect(policySkipReason({ category: "audit_logs", retentionMonths: 0, action: "DELETE", enforce: true })).toMatch(/không hợp lệ/)
  })

  it("chạy ban đêm giờ Việt Nam, mỗi đêm một lần", () => {
    const night = new Date("2026-11-11T19:30:00Z") // 02:30 giờ Việt Nam
    expect(isRetentionDue(night, null)).toBe(true)
    expect(isRetentionDue(night, new Date("2026-11-11T19:00:00Z"))).toBe(false)
    expect(isRetentionDue(night, new Date("2026-11-10T19:00:00Z"))).toBe(true)
    expect(isRetentionDue(new Date("2026-11-11T05:00:00Z"), null)).toBe(false) // 12:00 giờ Việt Nam
  })
})
