import { describe, expect, it } from "vitest"

import { INDUSTRY_REGISTRY } from "@/modules/organization/domain/industries"

import {
  computeCraftFee,
  craftFeeDeduction,
  craftFeeOverrideAllowed,
  craftFeePayable,
  defaultCraftFeePolicy,
  parseCraftFeePolicy,
  type CraftFeePolicy,
} from "../craft-fee-policy"

const floral = INDUSTRY_REGISTRY.FLORAL!.craftFee!
const base = defaultCraftFeePolicy(floral)
// Mời lúc 08:00 giờ VN ngày thường, giao 18:00 cùng ngày — không gấp, không cao điểm
const invitedAt = new Date("2026-06-10T01:00:00Z")
const deliverAt = new Date("2026-06-10T11:00:00Z")
const input = { listPriceVnd: 1_000_000, discountVnd: 100_000, invitedAt, deliverAt }
const policy = (over: Partial<CraftFeePolicy>): CraftFeePolicy => ({ ...base, ...over })

/** Phí gia công dùng chung mọi ngành, 6 phương án — PO 22/10/2026. */
describe("phí gia công", () => {
  it("mọi ngành khai khối phí gia công (hoặc null rõ ràng); số mặc định hợp lệ", () => {
    for (const [key, industry] of Object.entries(INDUSTRY_REGISTRY)) {
      expect(industry.craftFee, key).not.toBeUndefined()
      if (!industry.craftFee) continue
      const p = defaultCraftFeePolicy(industry.craftFee)
      expect(p.minVnd, key).toBeLessThanOrEqual(p.maxVnd)
      expect(p.percent, key).toBeGreaterThan(0)
      expect(industry.craftFee.feeLabel.length, key).toBeGreaterThan(0)
    }
    expect(INDUSTRY_REGISTRY.HOMESTAY!.craftFee).toBeNull()
  })

  it("mặc định: 50% giá hàng trước VAT, có sàn và trần, khấu trừ 0%", () => {
    expect(base).toMatchObject({ method: "PERCENT_BOUNDED", percent: 50, minVnd: 150_000, maxVnd: 2_000_000, roundToVnd: 5_000, coordinatorAdjustPercent: 20 })
    expect(base.lateDeliveryDeductionPercent).toBe(0)
    expect(base.complaintDeductionPercent).toBe(0)
    expect(computeCraftFee(base, input).feeVnd).toBe(500_000)
  })

  it("% có sàn và trần: đơn rẻ nâng lên sàn, đơn đắt giữ ở trần", () => {
    expect(computeCraftFee(base, { ...input, listPriceVnd: 200_000 }).feeVnd).toBe(150_000)
    expect(computeCraftFee(base, { ...input, listPriceVnd: 10_000_000 }).feeVnd).toBe(2_000_000)
    expect(computeCraftFee(policy({ method: "PERCENT" }), { ...input, listPriceVnd: 200_000 }).feeVnd).toBe(100_000)
  })

  it("nền sau giảm giá chỉ khi tiệm chọn", () => {
    expect(computeCraftFee(policy({ base: "AFTER_DISCOUNT" }), input).feeVnd).toBe(450_000)
  })

  it("bậc thang theo giá trị đơn", () => {
    const p = policy({ method: "TIERED" })
    expect(computeCraftFee(p, { ...input, listPriceVnd: 400_000 }).feeVnd).toBe(240_000)
    expect(computeCraftFee(p, { ...input, listPriceVnd: 1_000_000 }).feeVnd).toBe(550_000)
    expect(computeCraftFee(p, { ...input, listPriceVnd: 3_000_000 }).feeVnd).toBe(1_500_000)
  })

  it("cố định theo mẫu; mẫu chưa có phí thì tạm tính theo %", () => {
    const p = policy({ method: "FIXED_PER_PRODUCT" })
    expect(computeCraftFee(p, { ...input, productFixedFeeVnd: 320_000 }).feeVnd).toBe(320_000)
    const fallback = computeCraftFee(p, input)
    expect(fallback.feeVnd).toBe(500_000)
    expect(fallback.lines[0]?.label).toMatch(/chưa có phí cố định/)
  })

  it("nguyên liệu theo định mức + công theo độ khó", () => {
    const p = policy({ method: "MATERIAL_PLUS_LABOR", materialMarkupPercent: 10 })
    expect(computeCraftFee(p, { ...input, materialCostVnd: 200_000, complexity: "HARD" }).feeVnd).toBe(520_000)
    expect(computeCraftFee(p, input).lines[0]?.label).toMatch(/chưa có giá nguyên liệu/)
  })

  it("đối tác ngoài chuỗi luôn theo % đối tác", () => {
    expect(computeCraftFee(base, { ...input, isPartner: true }).feeVnd).toBe(750_000)
  })

  it("phụ cấp đơn gấp và ngày cao điểm cộng trên phí gốc, rồi làm tròn", () => {
    const rush = computeCraftFee(base, { ...input, deliverAt: new Date(invitedAt.getTime() + 90 * 60_000) })
    expect(rush.feeVnd).toBe(575_000)
    // 20/10 giờ VN, giao gấp → +15% và +20% trên 500.000đ
    const peak = computeCraftFee(base, {
      ...input,
      invitedAt: new Date("2026-10-20T02:00:00Z"),
      deliverAt: new Date("2026-10-20T03:00:00Z"),
    })
    expect(peak.feeVnd).toBe(675_000)
    const tet = computeCraftFee(policy({ extraPeakDates: ["2027-02-06"] }), { ...input, deliverAt: new Date("2027-02-06T05:00:00Z") })
    expect(tet.feeVnd).toBe(600_000)
    expect(computeCraftFee(base, { ...input, listPriceVnd: 1_000_001 }).feeVnd).toBe(505_000)
  })

  it("điều phối sửa phí trong ±20%; vượt thì cần duyệt", () => {
    expect(craftFeeOverrideAllowed(base, 500_000, 600_000)).toBe(true)
    expect(craftFeeOverrideAllowed(base, 500_000, 610_000)).toBe(false)
    expect(craftFeeOverrideAllowed(base, 500_000, 390_000)).toBe(false)
  })

  it("khấu trừ: 0% không trừ; đổi % thì tự trừ; số thực nhận không âm", () => {
    const at = new Date("2026-10-22T00:00:00Z")
    expect(craftFeeDeduction(base, 500_000, "LATE_DELIVERY", "Giao trễ 30 phút", at)).toBeNull()
    const late = craftFeeDeduction(policy({ lateDeliveryDeductionPercent: 10 }), 500_000, "LATE_DELIVERY", "Giao trễ", at)
    const complaint = craftFeeDeduction(policy({ complaintDeductionPercent: 100 }), 500_000, "COMPLAINT", "Hoa héo", at)
    expect(late?.amountVnd).toBe(50_000)
    expect(craftFeePayable(500_000, [late!])).toBe(450_000)
    expect(craftFeePayable(500_000, [late!, complaint!])).toBe(0)
  })

  it("đọc cấu hình đã lưu: kẹp số sai, khoá thiếu lấy mặc định của ngành", () => {
    const p = parseCraftFeePolicy({ method: "TIERED", percent: 250, minVnd: 500_000, maxVnd: 100, peakDays: ["13-40", "03-08"], tiers: [{ upToVnd: null, percent: 40 }] }, floral)
    expect(p.method).toBe("TIERED")
    expect(p.percent).toBe(100)
    expect(p.maxVnd).toBe(500_000)
    expect(p.peakDays).toEqual(["03-08"])
    expect(p.tiers).toEqual([{ upToVnd: null, percent: 40 }])
    expect(parseCraftFeePolicy({ method: "KHONG_CO" }, floral).method).toBe("PERCENT_BOUNDED")
    expect(parseCraftFeePolicy(null, INDUSTRY_REGISTRY.FASHION!.craftFee!).percent).toBe(40)
  })
})
