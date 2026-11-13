import { describe, expect, it } from "vitest"
import { evaluateStoreProfile, isPlausiblePhone, type StoreProfileSnapshot } from "./store-profile-completeness"

const full: StoreProfileSnapshot = {
  business: {
    display_name: "Cửa hàng An",
    phone: "0901 234 567",
    email: "lienhe@cuahang.vn",
    address: "12 Lê Lợi, Quận 1",
    description: "Cửa hàng nhỏ",
    operating_hours: { default: "8:00–21:00" },
    social_links: { facebook: "https://facebook.com/cuahang" },
  },
  brand: { logo_asset_id: "asset-1", primary_color: "#2f6f4e", tone_of_voice: "Thân thiện" },
}

describe("evaluateStoreProfile", () => {
  it("hồ sơ trống: 0%, chưa sẵn sàng, mục thiết yếu đứng đầu danh sách thiếu", () => {
    const r = evaluateStoreProfile({ business: null, brand: null })
    expect(r.percent).toBe(0)
    expect(r.readyToShare).toBe(false)
    expect(r.missing.slice(0, 4).every((i) => i.essential)).toBe(true)
  })

  it("hồ sơ đủ: 100%, sẵn sàng chia sẻ", () => {
    const r = evaluateStoreProfile(full)
    expect(r.percent).toBe(100)
    expect(r.missing).toHaveLength(0)
    expect(r.readyToShare).toBe(true)
  })

  it("chỉ thiếu mục phụ vẫn sẵn sàng chia sẻ", () => {
    const r = evaluateStoreProfile({
      business: { ...full.business!, description: null, email: null },
      brand: full.brand,
    })
    expect(r.readyToShare).toBe(true)
    expect(r.percent).toBeLessThan(100)
  })

  it("thiếu logo thì chưa sẵn sàng chia sẻ", () => {
    const r = evaluateStoreProfile({ business: full.business, brand: { ...full.brand!, logo_asset_id: null } })
    expect(r.readyToShare).toBe(false)
    expect(r.missing[0]?.key).toBe("logo")
  })

  it("giá trị sai định dạng không được tính là đã điền", () => {
    const r = evaluateStoreProfile({
      business: { ...full.business!, phone: "abc", email: "khong-hop-le" },
      brand: { ...full.brand!, primary_color: "xanh" },
    })
    const missingKeys = r.missing.map((i) => i.key)
    expect(missingKeys).toEqual(expect.arrayContaining(["phone", "email", "primary_color"]))
  })

  it("chuỗi chỉ có khoảng trắng và object rỗng tính là chưa điền", () => {
    const r = evaluateStoreProfile({
      business: { ...full.business!, address: "   ", social_links: { facebook: "" }, operating_hours: {} },
      brand: full.brand,
    })
    expect(r.missing.map((i) => i.key)).toEqual(expect.arrayContaining(["address", "social_links", "operating_hours"]))
  })
})

describe("isPlausiblePhone", () => {
  it.each(["0901234567", "+84 901 234 567", "028.3822.1234", "1900-1234"])("chấp nhận %s", (p) => {
    expect(isPlausiblePhone(p)).toBe(true)
  })
  it.each(["123", "abc", "090123456789012"])("từ chối %s", (p) => {
    expect(isPlausiblePhone(p)).toBe(false)
  })
})
