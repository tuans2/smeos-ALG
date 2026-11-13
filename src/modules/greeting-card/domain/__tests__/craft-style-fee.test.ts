import { describe, expect, it } from "vitest"

import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { craftFeeFor, craftHolidayExtraVnd, resolveCraftStyles, resolveHolidayMultiplier } from "../craft-style-fee"

/** PO Q8, checklist ALG 3.6 — phí chế tác theo kiểu dáng, đã gồm trong giá; ngày lễ cộng phần chênh. */
describe("phí chế tác theo kiểu dáng", () => {
  const floral = getIndustryPlugin("FLORAL").craftFee!

  it("ngành hoa có 6 kiểu dáng với đơn giá mặc định, hệ số ngày lễ 1,5", () => {
    expect(resolveCraftStyles(floral.styles, {}).map((s) => [s.key, s.feeVnd])).toEqual([
      ["BO_CAM_TAY", 80_000], ["HOP_HOA", 120_000], ["GIO_HOA", 150_000],
      ["BINH_HOA", 180_000], ["LANG_KE", 300_000], ["SU_KIEN", 500_000],
    ])
    expect(resolveHolidayMultiplier(floral.holidayMultiplier, {})).toBe(1.5)
  })

  it("cửa hàng sửa đơn giá và hệ số; giá trị sai bị bỏ, hệ số kẹp trong 1–3", () => {
    const settings = { craft_style_fees: { GIO_HOA: 200_000, HOP_HOA: -5 }, craft_holiday_multiplier: 9 }
    const styles = resolveCraftStyles(floral.styles, settings)
    expect(styles.find((s) => s.key === "GIO_HOA")!.feeVnd).toBe(200_000)
    expect(styles.find((s) => s.key === "HOP_HOA")!.feeVnd).toBe(120_000)
    expect(resolveHolidayMultiplier(floral.holidayMultiplier, settings)).toBe(3)
  })

  it("ngày lễ: giỏ hoa 150.000đ × (1,5 − 1) = +75.000đ; ngày thường không cộng; mẫu chưa gắn kiểu → không áp", () => {
    const styles = resolveCraftStyles(floral.styles, {})
    expect(craftFeeFor("GIO_HOA", styles, 1.5, true)).toMatchObject({ feeVnd: 150_000, holidayExtraVnd: 75_000 })
    expect(craftFeeFor("GIO_HOA", styles, 1.5, false)!.holidayExtraVnd).toBe(0)
    expect(craftFeeFor(null, styles, 1.5, true)).toBeNull()
    expect(craftFeeFor("KHONG_CO", styles, 1.5, true)).toBeNull()
    expect(craftHolidayExtraVnd(80_000, 1.33)).toBe(26_000)
  })

  it("ngành không khai kiểu dáng → không có danh sách", () => {
    expect(resolveCraftStyles(getIndustryPlugin("FASHION").craftFee?.styles, {})).toEqual([])
  })
})
