import { describe, expect, it } from "vitest"

import { effectiveDeductionTerms, type CraftFeeDeductionTerms } from "@/modules/greeting-card/domain/craft-fee-deduction-terms"
import { defaultCraftFeePolicy, parseCraftFeePolicy } from "@/modules/greeting-card/domain/craft-fee-policy"
import { prepareLateDeliveryDeduction, withCraftFeeDeduction } from "@/modules/greeting-card/use-cases/craft-fee-deductions"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

/**
 * PO 12/11/2026 (audit BL-24): công tắc bật/tắt khấu trừ; điều kiện chụp lúc gửi lời mời; ân hạn giao trễ. Thay đổi
 * có lợi cho chi nhánh áp ngay, bất lợi chỉ áp cho đơn gửi lời mời sau.
 */
const spec = getIndustryPlugin("floral").craftFee!
const policyWith = (over: Record<string, unknown>) => parseCraftFeePolicy({ ...over }, spec)
const terms = (over: Partial<CraftFeeDeductionTerms> = {}): CraftFeeDeductionTerms => ({ enabled: true, latePercent: 10, complaintPercent: 20, lateGraceMinutes: 15, ...over })
const metaWith = (deductionTerms?: CraftFeeDeductionTerms) => ({
  subcontract_dispatch: { claimedBranchId: "b-1", craftFee: { suggestedVnd: 100_000, finalVnd: 100_000, method: "PERCENT", lines: [], deductions: [], ...(deductionTerms ? { deductionTerms } : {}) } },
})

describe("điều kiện khấu trừ có hiệu lực", () => {
  it("mặc định: bật, ân hạn 15 phút; đọc được công tắc và ân hạn 0–60", () => {
    expect(defaultCraftFeePolicy(spec)).toMatchObject({ deductionsEnabled: true, lateGraceMinutes: 15 })
    expect(policyWith({ deductionsEnabled: false, lateGraceMinutes: 90 })).toMatchObject({ deductionsEnabled: false, lateGraceMinutes: 60 })
  })

  it("lấy phía có lợi cho chi nhánh giữa bản chụp và cài đặt hiện tại", () => {
    expect(effectiveDeductionTerms(terms(), terms({ latePercent: 30, complaintPercent: 5, lateGraceMinutes: 0 }))).toEqual(terms({ complaintPercent: 5 }))
    expect(effectiveDeductionTerms(terms({ enabled: false }), terms()).enabled).toBe(false)
    expect(effectiveDeductionTerms(terms(), terms({ enabled: false })).enabled).toBe(false)
    expect(effectiveDeductionTerms(undefined, terms({ latePercent: 30 }))).toEqual(terms({ latePercent: 30 }))
  })

  it("tiệm tắt khấu trừ → không trừ, kể cả đơn đã chụp điều kiện có trừ", () => {
    const r = withCraftFeeDeduction(metaWith(terms()), policyWith({ deductionsEnabled: false, complaintDeductionPercent: 20 }), "COMPLAINT", "Hoa dập", new Date())
    expect(r.applied).toBe(false)
  })

  it("tiệm tăng % sau khi gửi lời mời → đơn đó vẫn trừ theo % đã chụp", () => {
    const r = withCraftFeeDeduction(metaWith(terms({ complaintPercent: 20 })), policyWith({ complaintDeductionPercent: 50 }), "COMPLAINT", "Hoa dập", new Date())
    const sub = r.meta.subcontract_dispatch as { craftFee: { deductions: Array<{ amountVnd: number }> } }
    expect(sub.craftFee.deductions[0]?.amountVnd).toBe(20_000)
  })

  it("giao trễ trong thời gian ân hạn → không trừ; quá ân hạn → trừ", async () => {
    const store = { loadFacts: async () => ({ deliveryWindow: { date: "2026-11-12", timeSlot: "14:00 - 16:00" }, settings: { craft_fee_policy: { lateDeliveryDeductionPercent: 10 } } }) } as never
    const meta = metaWith(terms({ latePercent: 10, lateGraceMinutes: 15 }))
    const within = await prepareLateDeliveryDeduction("o", "ord", store, new Date("2026-11-12T16:10:00+07:00"))
    expect((within(meta).subcontract_dispatch as { craftFee: { deductions: unknown[] } }).craftFee.deductions).toHaveLength(0)
    const after = await prepareLateDeliveryDeduction("o", "ord", store, new Date("2026-11-12T16:40:00+07:00"))
    expect((after(meta).subcontract_dispatch as { craftFee: { deductions: unknown[] } }).craftFee.deductions).toHaveLength(1)
  })
})
