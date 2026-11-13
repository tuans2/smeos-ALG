import { describe, expect, it } from "vitest"
import {
  DEFAULT_HOLIDAY_MAX_ORDERS,
  holidayCapacityError,
  holidayOn,
  holidaySurcharge,
  parseHolidayPolicy,
  scheduleForDate,
} from "../holiday-policy"
import { computeQuote, type ShippingConfig } from "../brochure-pricing"
import { deliveryScheduleError } from "../delivery-schedule"

const SETTINGS = {
  brochure_holidays: {
    days: [
      { id: "vday", name: "Valentine", date: "02-14", cutoff_hour: 12, surcharge_vnd: 50000 },
      { id: "tet", name: "Mùng 1 Tết", date: "2027-02-06", max_orders: 80 },
      { name: "Hỏng", date: "13-40" },
      { name: "Trùng", date: "02-14" },
    ],
  },
}
const SHIP: ShippingConfig = { zones: [], freeShippingOverVnd: null, sameDayCutoffHour: 18 }

describe("parseHolidayPolicy / holidayOn", () => {
  it("bỏ mục hỏng/trùng, mặc định 500 đơn/ngày", () => {
    const days = parseHolidayPolicy(SETTINGS)
    expect(days.map((d) => d.id)).toEqual(["vday", "tet"])
    expect(days[0]?.maxOrders).toBe(DEFAULT_HOLIDAY_MAX_ORDERS)
    expect(days[1]?.maxOrders).toBe(80)
    expect(parseHolidayPolicy(null)).toEqual([])
  })

  it("ngày lặp hằng năm khớp mọi năm; ngày cụ thể chỉ khớp đúng ngày", () => {
    const days = parseHolidayPolicy(SETTINGS)
    expect(holidayOn("2027-02-14", days)?.name).toBe("Valentine")
    expect(holidayOn("2027-02-06", days)?.name).toBe("Mùng 1 Tết")
    expect(holidayOn("2028-02-06", days)).toBeNull()
    expect(holidayOn("không-phải-ngày", days)).toBeNull()
  })
})

describe("giờ chốt + số đơn tối đa (áp cả tiệm)", () => {
  it("ngày lễ có giờ chốt riêng thay giờ chốt thường", () => {
    const vday = holidayOn("2027-02-14", parseHolidayPolicy(SETTINGS))
    const cfg = scheduleForDate(SHIP, vday)
    expect(cfg.sameDayCutoffHour).toBe(12)
    // 13:00 ngày 14/02 giờ VN: ngày thường còn nhận (chốt 18h), ngày lễ đã qua giờ chốt 12h
    const now = new Date("2027-02-14T06:00:00Z")
    expect(deliveryScheduleError("2027-02-14", undefined, SHIP, now)).toBeNull()
    expect(deliveryScheduleError("2027-02-14", undefined, cfg, now)).toMatch(/12h/)
    expect(scheduleForDate(SHIP, null)).toBe(SHIP)
  })

  it("đủ số đơn tối đa thì báo lỗi", () => {
    const tet = holidayOn("2027-02-06", parseHolidayPolicy(SETTINGS))
    expect(holidayCapacityError(tet, 79)).toBeNull()
    expect(holidayCapacityError(tet, 80)).toMatch(/đã nhận đủ đơn/)
    expect(holidayCapacityError(null, 9999)).toBeNull()
  })
})

describe("phụ phí ngày lễ (theo bộ sưu tập)", () => {
  const vday = holidayOn("2027-02-14", parseHolidayPolicy(SETTINGS))
  const on = { appliedPolicies: { applyHolidaySurcharge: true } }

  it("chỉ áp khi bộ sưu tập bật và ngày lễ có phụ phí", () => {
    expect(holidaySurcharge(vday, on)).toEqual({ vnd: 50000, name: "Valentine" })
    expect(holidaySurcharge(vday, {})).toBeNull()
    expect(holidaySurcharge(holidayOn("2027-02-06", parseHolidayPolicy(SETTINGS)), on)).toBeNull()
  })

  it("cộng vào tổng, không bị mã giảm giá trừ", () => {
    const q = computeQuote({
      unitPriceVnd: 500_000, quantity: 1, zone: null, shipping: SHIP,
      voucher: { id: "v", code: "GIAM10", discountType: "PERCENTAGE", discountValue: 10, minOrderVnd: 0, maxDiscountVnd: null, expiresAt: null, isUsed: false, customerId: null },
      surcharge: holidaySurcharge(vday, on),
    })
    expect(q).toMatchObject({ discountVnd: 50_000, holidaySurchargeVnd: 50_000, holidayName: "Valentine", totalVnd: 500_000 })
    expect(computeQuote({ unitPriceVnd: 500_000, quantity: 1, zone: null, shipping: SHIP, voucher: null }).holidaySurchargeVnd).toBeUndefined()
  })
})
