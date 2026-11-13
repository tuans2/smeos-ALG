import { describe, expect, it } from "vitest"

import { withCraftFeeDeduction, prepareLateDeliveryDeduction } from "../craft-fee-deductions"
import { craftFeeInputFromFacts, resolveDispatchCraftFee, suggestCraftFee, type CraftFeeOrderFacts } from "../suggest-craft-fee"

const invitedAt = new Date("2026-06-10T01:00:00Z")

function facts(over: Partial<CraftFeeOrderFacts> = {}): CraftFeeOrderFacts {
  return {
    totalVnd: 1_130_000,
    vatAmountVnd: 100_000,
    pricingRef: { subtotalVnd: 1_000_000, discountVnd: 50_000, shippingFeeVnd: 30_000, quantity: 1 },
    deliveryWindow: { date: "2026-06-10", timeSlot: "16:00 - 18:00" },
    settings: { industry: "FLORAL" },
    items: [{ quantity: 1, unitPriceVnd: 1_000_000, productAttributes: {}, bom: null }],
    ...over,
  }
}
const store = (f: CraftFeeOrderFacts | null) => ({ loadFacts: async () => f })

/** Gợi ý phí gia công từ dữ kiện đơn — PO 22/10/2026. */
describe("gợi ý phí gia công cho đơn", () => {
  it("giá hàng lấy từ báo giá, trước VAT, không gồm phí giao; mặc định 50% có sàn/trần", async () => {
    const input = craftFeeInputFromFacts(facts(), invitedAt)
    expect(input).toMatchObject({ listPriceVnd: 1_000_000, discountVnd: 50_000, quantity: 1 })
    expect(input.deliverAt?.toISOString()).toBe("2026-06-10T11:00:00.000Z")
    const s = await suggestCraftFee("org", "o1", store(facts()), invitedAt)
    expect(s).toMatchObject({ feeLabel: "Phí cắm hoa", suggestedVnd: 500_000, method: "PERCENT_BOUNDED", adjustPercent: 20 })
  })

  it("không có báo giá: tổng trừ VAT và phí giao; dòng hàng có giá thì dùng dòng hàng", () => {
    expect(craftFeeInputFromFacts(facts({ pricingRef: {}, items: [] }), invitedAt).listPriceVnd).toBe(1_030_000)
    expect(craftFeeInputFromFacts(facts({ pricingRef: {} }), invitedAt).listPriceVnd).toBe(1_000_000)
  })

  it("phí cố định / nguyên liệu chỉ có khi mọi dòng hàng đều có; độ khó lấy dòng khó nhất", () => {
    const items = [
      { quantity: 2, unitPriceVnd: 300_000, productAttributes: { craft_fee_vnd: 100_000, craft_complexity: "EASY" }, bom: { components: [{ name: "Hồng", quantity: 10, unit: "cành", costVnd: 8_000 }] } },
      { quantity: 1, unitPriceVnd: 400_000, productAttributes: { craft_fee_vnd: 150_000, craft_complexity: "HARD" }, bom: null },
    ]
    const input = craftFeeInputFromFacts(facts({ items }), invitedAt)
    expect(input.productFixedFeeVnd).toBe(350_000)
    expect(input.materialCostVnd).toBeNull()
    expect(input.complexity).toBe("HARD")
    expect(input.quantity).toBe(3)
  })

  it("tiệm đổi phương án trong cài đặt thì gợi ý đổi theo; ngành khác dùng số của ngành đó", async () => {
    const tiered = await suggestCraftFee("org", "o1", store(facts({ settings: { industry: "FLORAL", craft_fee_policy: { method: "TIERED" } } })), invitedAt)
    expect(tiered.suggestedVnd).toBe(550_000)
    const fashion = await suggestCraftFee("org", "o1", store(facts({ settings: { industry: "FASHION" } })), invitedAt)
    expect(fashion).toMatchObject({ feeLabel: "Phí may đo", suggestedVnd: 400_000 })
    await expect(suggestCraftFee("org", "x", store(null))).rejects.toMatchObject({ status: 404 })
  })

  it("Điều phối sửa trong ±20% được nhận; vượt thì chỉ Điều hành chốt, có ghi người duyệt", async () => {
    const s = await suggestCraftFee("org", "o1", store(facts()), invitedAt)
    expect(resolveDispatchCraftFee(s, undefined, { canApproveOutsideBand: false, actorId: "u1" })).toMatchObject({ finalVnd: 500_000, deductions: [] })
    expect(resolveDispatchCraftFee(s, 580_000, { canApproveOutsideBand: false, actorId: "u1" }).overrideApprovedBy).toBeUndefined()
    expect(() => resolveDispatchCraftFee(s, 800_000, { canApproveOutsideBand: false, actorId: "u1" })).toThrow(/cần Điều hành duyệt/)
    expect(resolveDispatchCraftFee(s, 800_000, { canApproveOutsideBand: true, actorId: "u9" })).toMatchObject({ finalVnd: 800_000, overrideApprovedBy: "u9" })
  })
})

describe("khấu trừ phí gia công", () => {
  const meta = { subcontract_dispatch: { subcontractPriceVnd: 500_000, craftFee: { suggestedVnd: 500_000, finalVnd: 500_000, method: "PERCENT_BOUNDED", lines: [], deductions: [] } } }
  const lateAt = new Date("2026-06-10T12:00:00Z") // trễ 60 phút so với 18:00 giờ VN

  it("mặc định 0%: giao trễ không đổi gì", async () => {
    const apply = await prepareLateDeliveryDeduction("org", "o1", store(facts()), lateAt)
    expect(apply(meta)).toBe(meta)
  })

  it("tiệm cài 10%: giao trễ tự trừ một lần; giao đúng giờ không trừ", async () => {
    const f = facts({ settings: { industry: "FLORAL", craft_fee_policy: { lateDeliveryDeductionPercent: 10 } } })
    const apply = await prepareLateDeliveryDeduction("org", "o1", store(f), lateAt)
    const once = apply(meta) as typeof meta
    const deductions = (once.subcontract_dispatch.craftFee.deductions as Array<{ amountVnd: number; reason: string }>)
    expect(deductions).toHaveLength(1)
    expect(deductions[0]).toMatchObject({ amountVnd: 50_000, reason: "Giao trễ 60 phút so với giờ hẹn" })
    expect((apply(once) as typeof meta).subcontract_dispatch.craftFee.deductions).toHaveLength(1)
    const onTime = await prepareLateDeliveryDeduction("org", "o1", store(f), new Date("2026-06-10T10:30:00Z"))
    expect(onTime(meta)).toBe(meta)
  })

  it("khiếu nại: đơn cũ chưa có bản ghi phí vẫn trừ trên phí đã chốt", async () => {
    const f = facts({ settings: { industry: "FLORAL", craft_fee_policy: { complaintDeductionPercent: 20 } } })
    const { craftFeePolicyOf } = await import("../suggest-craft-fee")
    const legacy = { subcontract_dispatch: { subcontractPriceVnd: 400_000 } }
    const { meta: next, applied } = withCraftFeeDeduction(legacy, craftFeePolicyOf(f.settings), "COMPLAINT", "Hoa héo", lateAt)
    expect(applied).toBe(true)
    expect((next.subcontract_dispatch as { craftFee: { deductions: Array<{ amountVnd: number }> } }).craftFee.deductions[0]?.amountVnd).toBe(80_000)
  })
})
