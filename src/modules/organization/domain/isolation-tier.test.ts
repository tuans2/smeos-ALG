import { describe, expect, it } from "vitest"

import { allowedIsolationTiers, isIsolationTierAllowed, planChangeBlockedReason } from "./isolation-tier"

describe("mức cô lập theo gói (PO 12/11/2026: theo quy mô)", () => {
  it("gói nhỏ và chưa có thuê bao chỉ dùng chung; Mạng lưới thêm khôi phục riêng; Doanh nghiệp được cả ba", () => {
    for (const plan of ["EXPERIENCE", "STARTER", "PRO", null, "LA"]) expect(allowedIsolationTiers(plan)).toEqual(["SHARED"])
    expect(allowedIsolationTiers("FLOWER_NETWORK")).toEqual(["SHARED", "SHARED_PLUS"])
    expect(allowedIsolationTiers("ENTERPRISE")).toEqual(["SHARED", "SHARED_PLUS", "DEDICATED"])
    expect(isIsolationTierAllowed("FLOWER_NETWORK", "DEDICATED")).toBe(false)
  })

  it("đổi gói xuống hoặc huỷ mà mức hiện tại không còn được phép → chặn", () => {
    expect(planChangeBlockedReason("SHARED", "PRO")).toBeNull()
    expect(planChangeBlockedReason("SHARED_PLUS", "ENTERPRISE")).toBeNull()
    expect(planChangeBlockedReason("SHARED_PLUS", "PRO")).toMatch(/hạ mức cô lập trước/)
    expect(planChangeBlockedReason("DEDICATED", null)).toMatch(/hạ mức cô lập trước/)
  })
})
