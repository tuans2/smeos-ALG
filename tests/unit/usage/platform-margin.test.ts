import { describe, expect, it } from "vitest"

import { computeMargin, periodRange } from "@/modules/usage/domain/platform-margin"

/** Checklist ALG 10.4 — biên lợi nhuận = credit quy đổi − chi phí AI (USD × tỷ giá) − chi phí tin nhắn. */
describe("biên lợi nhuận nền tảng", () => {
  it("tính doanh thu, chi phí, biên và tỷ lệ", () => {
    const r = computeMargin(
      { organizationId: "o", organizationName: "O", creditUsed: 8, aiCostUsd: 0.1, messageCostVnd: 500 },
      { usdToVnd: 25_000, creditValueVnd: 1_000 },
    )
    expect(r).toMatchObject({ revenueVnd: 8_000, costVnd: 3_000, marginVnd: 5_000, marginPercent: 62.5 })
  })

  it("không có doanh thu thì không tính tỷ lệ", () => {
    expect(computeMargin({ organizationId: "o", organizationName: "O", creditUsed: 0, aiCostUsd: 0.2, messageCostVnd: 0 }, { usdToVnd: 25_000, creditValueVnd: 1_000 }))
      .toMatchObject({ marginVnd: -5_000, marginPercent: null })
  })

  it("kỳ theo giờ Việt Nam; dạng sai trả null", () => {
    expect(periodRange("2026-11")).toEqual({ from: new Date("2026-10-31T17:00:00Z"), to: new Date("2026-11-30T17:00:00Z") })
    expect(periodRange("2026-12")?.to).toEqual(new Date("2026-12-31T17:00:00Z"))
    expect(periodRange("2026-13")).toBeNull()
  })
})
