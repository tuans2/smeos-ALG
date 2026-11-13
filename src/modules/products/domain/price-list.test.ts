import { describe, expect, it } from "vitest"

import { buildPriceListGroups, parsePriceList, priceListKey, priceListStatus, validatePriceList, type PriceListInput } from "./price-list"

const product = (id: string, name: string, category: string | null, pricing: unknown, status = "ACTIVE") => ({
  id, code: id.toUpperCase(), name, category, status, attributes: { pricing },
})

const products = [
  product("p1", "Bó hồng đỏ", "Bó hoa", { mode: "FIXED", price_vnd: 450000, peak_price_vnd: 550000 }),
  product("p2", "Giỏ lan", "Giỏ hoa", {
    mode: "RANGE",
    dimensions: [{ key: "SIZE", label: "Cỡ", values: ["Nhỏ", "Lớn"] }],
    rows: [
      { values: ["Nhỏ"], price_vnd: 800000, active: true },
      { values: ["Lớn"], price_vnd: 1200000, active: false },
    ],
  }),
  product("p3", "Kệ khai trương", null, { mode: "CONTACT" }),
  product("p4", "Mẫu đã ngừng", "Bó hoa", { mode: "FIXED", price_vnd: 100000 }, "ARCHIVED"),
]

describe("bảng giá sản phẩm", () => {
  it("nhóm theo loại, bỏ sản phẩm ngừng bán và phiên bản đang tắt, nhóm chưa phân loại xếp cuối", () => {
    const groups = buildPriceListGroups({ categories: [], productIds: null, showPeakPrice: true }, products)
    expect(groups.map((g) => g.category)).toEqual(["Bó hoa", "Giỏ hoa", "Sản phẩm khác"])
    // Mã loại lưu kiểu cũ hiện thành tên tiếng Việt, cùng nhóm với nhãn đã gõ
    const coded = buildPriceListGroups({ categories: [], productIds: null, showPeakPrice: true }, [product("p9", "Hộp hồng", "BOX", { mode: "FIXED", price_vnd: 1 })])
    expect(coded[0]!.category).toBe("Hộp hoa")
    expect(groups[0]!.rows.map((r) => r.name)).toEqual(["Bó hồng đỏ"])
    expect(groups[0]!.rows[0]).toMatchObject({ priceVnd: 450000, peakPriceVnd: 550000 })
    expect(groups[1]!.rows[0]!.options).toEqual([{ name: "Nhỏ", priceVnd: 800000, peakPriceVnd: null }])
    expect(groups[2]!.rows[0]).toMatchObject({ mode: "CONTACT", priceVnd: null })
  })

  it("lọc theo loại và ẩn giá cao điểm khi tắt", () => {
    const groups = buildPriceListGroups({ categories: ["Bó hoa"], productIds: null, showPeakPrice: false }, products)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.rows[0]!.peakPriceVnd).toBeNull()
  })

  it("đọc dòng đã lưu, bỏ dòng hỏng", () => {
    expect(parsePriceList(priceListKey("abc"), { name: "Tết", active: false })).toMatchObject({ id: "abc", name: "Tết", active: false, showPromotions: true })
    expect(parsePriceList(priceListKey("abc"), { name: "" })).toBeNull()
    expect(parsePriceList("surcharge_groups", { name: "x" })).toBeNull()
  })

  it("kiểm tên và thời hạn", () => {
    const base: PriceListInput = { name: "Tết", heading: "", note: "", categories: [], productIds: null, validFrom: null, validTo: null, showPeakPrice: true, showPromotions: true, active: true }
    expect(validatePriceList(base)).toEqual({})
    expect(validatePriceList({ ...base, name: "x" }).name).toBeDefined()
    expect(validatePriceList({ ...base, validFrom: "2026-12-01", validTo: "2026-11-01" }).validTo).toBeDefined()
  })

  it("trạng thái theo công tắc và ngày", () => {
    expect(priceListStatus({ active: false, validFrom: null, validTo: null }, "2026-10-30")).toBe("PAUSED")
    expect(priceListStatus({ active: true, validFrom: "2026-11-01", validTo: null }, "2026-10-30")).toBe("SCHEDULED")
    expect(priceListStatus({ active: true, validFrom: null, validTo: "2026-10-29" }, "2026-10-30")).toBe("EXPIRED")
    expect(priceListStatus({ active: true, validFrom: "2026-10-30", validTo: "2026-10-30" }, "2026-10-30")).toBe("ACTIVE")
  })
})
