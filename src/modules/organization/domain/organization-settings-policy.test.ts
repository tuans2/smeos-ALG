import { describe, expect, it } from "vitest"

import { canOverrideIndustryLock, settingsPatchViolation } from "./organization-settings-policy"

const locked = { industry: "FLORAL", industry_locked: true }
const tenant = { canOverrideIndustryLock: false }
const operator = { canOverrideIndustryLock: true }

describe("luật sửa settings của tổ chức", () => {
  it("chỉ N1/N12 được vượt khoá ngành", () => {
    expect(canOverrideIndustryLock(["N1"])).toBe(true)
    expect(canOverrideIndustryLock(["N12"])).toBe(true)
    expect(canOverrideIndustryLock(["N2", "N3"])).toBe(false)
    expect(canOverrideIndustryLock([])).toBe(false)
  })

  it("tenant không đổi ngành khi đã khoá; vẫn gửi lại đúng ngành hiện tại thì được", () => {
    expect(settingsPatchViolation({ industry: "FNB" }, locked, tenant)).toMatch(/cố định/)
    expect(settingsPatchViolation({ industry: "FLORAL" }, locked, tenant)).toBeNull()
  })

  it("tenant không tự mở khoá hay ghi khoá do nền tảng quản lý", () => {
    expect(settingsPatchViolation({ industry_locked: false }, locked, tenant)).toMatch(/industry_locked/)
    expect(settingsPatchViolation({ pending_model_change: { requested_type: "CHAIN" } }, {}, tenant)).toMatch(/pending_model_change/)
    expect(settingsPatchViolation({ is_instant_trial: true }, {}, tenant)).toMatch(/is_instant_trial/)
    // AUD-017: thêm unlocked_tools từng làm rơi lead_captured_at khỏi danh sách
    expect(settingsPatchViolation({ lead_captured_at: "2026-01-01T00:00:00Z" }, {}, tenant)).toMatch(/lead_captured_at/)
    expect(settingsPatchViolation({ unlocked_tools: [] }, {}, tenant)).toMatch(/unlocked_tools/)
    // ADR-012 T-7a: ma trận quản trị chỉ ghi qua route riêng (kiểm khoá tầng trên + ghi kép governance_decisions)
    expect(settingsPatchViolation({ governance_matrix: { PAYMENTS: { overrides: {}, locks: {} } } }, {}, tenant)).toMatch(/governance_matrix/)
    expect(settingsPatchViolation({ governance_matrix: {} }, {}, operator)).toMatch(/governance_matrix/)
  })

  it("ngành chưa khoá: tenant đổi được; khoá cấu hình thường luôn được", () => {
    expect(settingsPatchViolation({ industry: "FNB" }, { industry: "FLORAL", industry_locked: false }, tenant)).toBeNull()
    expect(settingsPatchViolation({ brochure_discount: { max_percent: 10 } }, locked, tenant)).toBeNull()
  })

  it("người vận hành N1/N12: đổi ngành và khoá ngành được, nhưng không ghi yêu cầu nâng cấp hộ", () => {
    expect(settingsPatchViolation({ industry: "FNB", industry_locked: false }, locked, operator)).toBeNull()
    expect(settingsPatchViolation({ pending_model_change: {} }, {}, operator)).toMatch(/pending_model_change/)
  })
})
