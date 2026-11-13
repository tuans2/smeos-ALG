/**
 * Bảng tính giá và bất biến số học — cổng vào chính của M02.
 *
 * Các ca thử dưới đây là bản dịch của `FloraOS/floraos-web/tests/pricing.test.ts`
 * (107 dòng) sang `vitest` + định danh tiếng Anh, TRỪ hai nhóm ca thuộc luồng
 * "thẻ chào giá" ngoài phạm vi P6: "thẻ đối tác lấy đúng giá đã chào…" và
 * "quét lộ dữ liệu khách" — xem đầu `pricing.ts`.
 */
import { describe, expect, it } from "vitest"

import {
  checkPriceInvariants,
  quotePrice,
  roundHalfToThousand,
  roundUpToThousand,
  type PriceQuoteInput,
  type PricingConfig,
} from "./pricing"

const CONFIG: PricingConfig = {
  partnerTierBonus: { Growth: 0, Certified: 0.05, Premium: 0.1 },
  surchargeGroups: [
    {
      id: "ho_tro_ship",
      name: "Hỗ trợ ship",
      options: [
        { label: "Không", value: 0 },
        { label: "25.000 đ", value: 25000 },
      ],
    },
    {
      id: "lam_gap",
      name: "Làm gấp",
      options: [
        { label: "Không", value: 0 },
        { label: "30.000 đ", value: 30000 },
      ],
    },
  ],
  optimalPriceRatio: 0.5,
}

function input(overrides: Partial<PriceQuoteInput> = {}): PriceQuoteInput {
  return {
    effectiveCostVnd: 410937,
    partnerTier: "Certified",
    selectedSurcharges: { ho_tro_ship: 25000, lam_gap: 0 },
    otherSurchargeVnd: 0,
    listPriceVnd: 900000,
    depositPercent: 50,
    ...overrides,
  }
}

describe("làm tròn đặt tại từng cấu phần", () => {
  it("làm tròn LÊN hàng nghìn", () => {
    expect(roundUpToThousand(410937)).toBe(411000)
    expect(roundUpToThousand(411000)).toBe(411000)
  })

  it("làm tròn NỬA LÊN hàng nghìn — trùng round_half_up_thousand", () => {
    expect(roundHalfToThousand(18500)).toBe(19000)
    expect(roundHalfToThousand(17500)).toBe(18000)
  })
})

describe("quotePrice", () => {
  it("tổng shop nhận bằng giá vốn cộng thưởng cộng Hotbonus", () => {
    const result = quotePrice(input(), CONFIG)
    expect(result.costVnd).toBe(411000)
    expect(result.tierBonusVnd).toBe(roundHalfToThousand(411000 * 0.05))
    expect(result.hotBonusVnd).toBe(25000)
    expect(result.totalVnd).toBe(result.costVnd + result.tierBonusVnd + result.hotBonusVnd)
    expect(checkPriceInvariants(result)).toEqual([])
  })

  it("cọc cộng còn lại luôn bằng giá vốn hiệu lực", () => {
    for (const depositPercent of [50, 30, 100]) {
      const result = quotePrice(input({ depositPercent }), CONFIG)
      expect(result.depositVnd + result.remainingVnd).toBe(result.costVnd)
      expect(checkPriceInvariants(result)).toEqual([])
    }
  })

  it("giá chốt do nhân viên nhập thay thế mốc giá bán", () => {
    const result = quotePrice(input({ closedPriceVnd: 750000 }), CONFIG)
    expect(result.listPriceVnd).toBe(750000)
    expect(result.optimalPriceVnd).toBe(375000)
  })

  it("hạng không có hệ số thì không cộng thưởng", () => {
    const result = quotePrice(input({ partnerTier: "Growth" }), CONFIG)
    expect(result.tierBonusVnd).toBe(0)
    expect(checkPriceInvariants(result)).toEqual([])
  })

  it("hạng lạ (chưa cấu hình) cũng không cộng thưởng, không ném lỗi", () => {
    const result = quotePrice(input({ partnerTier: "Hạng-chưa-đặt" }), CONFIG)
    expect(result.tierBonusVnd).toBe(0)
  })

  it("phụ phí khác (otherSurchargeVnd) cộng vào Hotbonus kèm nhãn riêng", () => {
    const result = quotePrice(input({ otherSurchargeVnd: 15000 }), CONFIG)
    expect(result.hotBonusVnd).toBe(25000 + 15000)
    expect(result.surcharges.some((s) => s.label === "Hỗ trợ đặc biệt" && s.amountVnd === 15000)).toBe(
      true
    )
    expect(checkPriceInvariants(result)).toEqual([])
  })
})

describe("checkPriceInvariants", () => {
  it("bắt được tổng bị ghi sai (không khớp giá vốn + thưởng + hotbonus)", () => {
    const result = quotePrice(input(), CONFIG)
    const broken = { ...result, totalVnd: result.totalVnd + 5000 }
    expect(checkPriceInvariants(broken).length).toBeGreaterThan(0)
  })

  it("bắt được cọc + còn lại không khớp giá vốn", () => {
    const result = quotePrice(input(), CONFIG)
    const broken = { ...result, remainingVnd: result.remainingVnd + 1000 }
    expect(checkPriceInvariants(broken).length).toBeGreaterThan(0)
  })

  it("bắt được thưởng theo hạng không khớp tỷ lệ", () => {
    const result = quotePrice(input(), CONFIG)
    const broken = { ...result, tierBonusVnd: result.tierBonusVnd + 3000 }
    expect(checkPriceInvariants(broken).length).toBeGreaterThan(0)
  })
})
