import { describe, expect, it } from "vitest"

import { industryKeyOf, normalizeIndustryKey, splitIndustrySettings, withIndustryKey, withOrganizationIndustry } from "./industry-key"

describe("ngành của tổ chức theo cột industry_key (ADR-012 T-6b)", () => {
  it("T-6c-2: chỉ cột industry_key — settings.industry sót lại không có tác dụng", () => {
    expect(industryKeyOf({ industry_key: "FNB", settings: { industry: "FLORAL" } })).toBe("FNB")
    expect(industryKeyOf({ industry_key: null, settings: { industry: "HOMESTAY" } })).toBeNull()
    expect(industryKeyOf({ settings: null })).toBeNull()
    expect(industryKeyOf(null)).toBeNull()
  })

  it("withIndustryKey đặt settings.industry theo cột, giữ khoá khác; cột trống thì bỏ settings.industry (T-6c-2)", () => {
    const org = { id: "o", industry_key: "FNB", settings: { industry: "floral", other: 1 } }
    expect(withIndustryKey(org).settings).toEqual({ industry: "FNB", other: 1 })
    expect(withIndustryKey({ industry_key: "FNB", settings: null }).settings).toEqual({ industry: "FNB" })
    expect(withIndustryKey({ industry_key: null, settings: { industry: "KHONG_CO", other: 1 } }).settings).toEqual({ other: 1 })
    const unchanged = { industry_key: null, settings: { other: 1 } }
    expect(withIndustryKey(unchanged)).toBe(unchanged)
  })

  it("withOrganizationIndustry phủ ngành lên quan hệ lồng organization; không có thì giữ nguyên", () => {
    const row = { id: "s", organization: { industry_key: "HOMESTAY", settings: { a: 1 } } }
    expect(withOrganizationIndustry(row).organization.settings).toEqual({ a: 1, industry: "HOMESTAY" })
    expect(withOrganizationIndustry(null)).toBeNull()
    const noOrg = { id: "s", organization: null }
    expect(withOrganizationIndustry(noOrg)).toBe(noOrg)
  })

  it("T-6c-1: ghi settings tách ngành ra cột — mã chuẩn hoá, mã lạ thành null, không có khoá thì không đụng cột", () => {
    expect(splitIndustrySettings({ industry: "homestay", x: 1 })).toEqual({ settings: { x: 1 }, industryKey: "HOMESTAY" })
    expect(splitIndustrySettings({ industry: "KHONG_CO" })).toEqual({ settings: {}, industryKey: null })
    expect(splitIndustrySettings({ x: 1 })).toEqual({ settings: { x: 1 } })
    expect(normalizeIndustryKey(" fnb ")).toBe("FNB")
    expect(normalizeIndustryKey(3)).toBeNull()
  })
})
