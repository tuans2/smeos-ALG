import { describe, expect, it } from "vitest"
import type { GovernanceDecisions, PolicyGovernanceUpper } from "@/modules/organization/domain/governance-decisions"

import { resolveAppliedPolicies } from "./store-policy"

const promos = [
  { id: "p10", title: "Giảm 10%", description: "Giảm 10%", kind: "PERCENT_OFF", config: { percent: 10 } },
  { id: "p70", title: "Giảm 70%", description: "Giảm 70%", kind: "PERCENT_OFF", config: { percent: 70 } },
  { id: "gift", title: "Tặng thiệp", description: "Tặng thiệp", kind: "GIFT" },
]
const commitments = [
  { id: "c1", title: "Giao đúng giờ", customerText: "Đúng giờ" },
  { id: "c2", title: "Hoa tươi", customerText: "Tươi" },
]
const settings = () => ({
  industry: "FLORAL",
  store_policies: { promotions: promos, commitments, agreements: [{ id: "a1", title: "Đổi trả", customerText: "24h" }] },
})
/** Quyết định riêng của tiệm đi qua `own` (ADR-012 T-7b: đọc từ governance_decisions, không từ settings). */
const own = (o: Partial<Record<"PROMOTIONS" | "COMMITMENTS" | "POLICIES", GovernanceDecisions>>, upper: PolicyGovernanceUpper = {}) =>
  ({ ...upper, own: o }) as PolicyGovernanceUpper

describe("resolveAppliedPolicies — ma trận quản trị", () => {
  it("không có quyết định nào → hiện như cũ, Giảm % bị kẹp ở trần 50% của nền tảng", () => {
    const r = resolveAppliedPolicies(null, settings())
    expect(r.promotions.map((p) => [p.id, p.percent])).toEqual([["p10", 10], ["p70", 50], ["gift", null]])
    expect(r.commitments).toHaveLength(2)
  })

  it("tiệm tự tắt mục → mục biến khỏi trang khách và báo giá", () => {
    const r = resolveAppliedPolicies(null, settings(), undefined, own({
      PROMOTIONS: { overrides: { gift: false }, locks: {} },
      COMMITMENTS: { overrides: { c2: false }, locks: {} },
      POLICIES: { overrides: { a1: false }, locks: {} },
    }))
    expect(r.promotions.map((p) => p.id)).toEqual(["p10", "p70"])
    expect(r.commitments.map((c) => c.id)).toEqual(["c1"])
    expect(r.agreements).toEqual([])
  })

  it("khoá của chuỗi thắng ghi đè của tiệm", () => {
    const r = resolveAppliedPolicies(
      null,
      settings(),
      undefined,
      own(
        { PROMOTIONS: { overrides: { p10: true }, locks: {} } },
        { PROMOTIONS: [{ tier: "CHAIN", decisions: { overrides: {}, locks: { p10: { enabled: false } } } }] },
      ),
    )
    expect(r.promotions.map((p) => p.id)).toEqual(["p70", "gift"])
  })

  it("trần chiết khấu là quy chuẩn bất biến — tiệm tự tắt cũng không có tác dụng", () => {
    const r = resolveAppliedPolicies(null, settings(), undefined, own({ PROMOTIONS: { overrides: { MAX_DISCOUNT_PERCENT: false }, locks: {} } }))
    expect(r.promotions.find((p) => p.id === "p70")?.percent).toBe(50)
  })

  it("T-7b: settings.governance_matrix không còn tác dụng — quyết định riêng chỉ đến từ `own`", () => {
    const legacy = { ...settings(), governance_matrix: { PROMOTIONS: { overrides: { gift: false }, locks: {} } } }
    expect(resolveAppliedPolicies(null, legacy).promotions.map((p) => p.id)).toEqual(["p10", "p70", "gift"])
  })
})
