import { describe, expect, it } from "vitest"

import { FACET_DEFS, facetValues } from "../partner-marketplace-facets"
import { maskAddress, maskCode, maskEmail, maskLink, maskMarketplaceStore, maskPersonName, maskPhone } from "../partner-marketplace-mask"
import { rowToProfile } from "../partner-marketplace-row-mapper"

describe("che một phần — vẫn thấy có dữ liệu, không dùng được", () => {
  it("SĐT giữ 4 số đầu + 3 số cuối", () => {
    expect(maskPhone("0903456789")).toBe("0903 ••• 789")
    expect(maskPhone("0903.456.789")).toBe("0903 ••• 789")
    expect(maskPhone("12345")).toBe("•••45")
    expect(maskPhone("")).toBe("")
  })

  it("tên giữ họ, các chữ sau chỉ còn chữ cái đầu", () => {
    expect(maskPersonName("Nguyễn Văn An")).toBe("Nguyễn V•• A••")
    expect(maskPersonName("Lan")).toBe("L••")
    expect(maskPersonName("không")).toBe("không")
  })

  it("email, mã số thuế, link", () => {
    expect(maskEmail("nguyenan@gmail.com")).toBe("ng•••@gmail.com")
    expect(maskCode("0101234567")).toBe("010•••••67")
    expect(maskLink("https://www.facebook.com/hoa.an")).toBe("facebook.com/•••")
    expect(maskLink("không có")).toBe("không có")
    expect(maskLink("Chưa có")).toBe("Chưa có")
    expect(maskEmail("Chưa có")).toBe("Chưa có")
    expect(maskPhone("Không cung cấp")).toBe("Không cung cấp")
    expect(maskLink(undefined)).toBeUndefined()
  })

  it("địa chỉ che số nhà + tên đường, thêm quận suy từ bản gốc", () => {
    expect(maskAddress("49 nguyễn phong sắc", ["Cầu Giấy"])).toBe("•• n•• p•• s•• · Cầu Giấy")
    expect(maskAddress("12 phố lạ", ["Khác / chưa rõ"])).toBe("•• p•• l••")
  })
})

describe("maskMarketplaceStore", () => {
  const r = Array.from({ length: 75 }, () => "")
  r[5] = "Hoa An"
  r[15] = "49 nguyễn phong sắc"
  const store = { ...rowToProfile(r)!, id: "s1" }
  const original = {
    ...store,
    identity: { ...store.identity, ownerName: "Trần Thị Bình", contactPerson: "Lê Minh" },
    contact: { ...store.contact, phone: "0911609118", email: "binh@gmail.com" },
  }
  const masked = maskMarketplaceStore(original)
  const district = FACET_DEFS.find((d) => d.kind === "district")!

  it("không còn chuỗi gốc nhạy cảm nào trong hồ sơ trả về", () => {
    const json = JSON.stringify(masked)
    for (const secret of ["0911609118", "Thị Bình", "binh@", "nguyễn phong sắc", "Minh"]) expect(json).not.toContain(secret)
    expect(masked.identity.shopName).toBe("Hoa An")
  })

  it("bộ lọc quận vẫn ra đúng sau khi che", () => {
    expect(facetValues(masked, district)).toEqual(facetValues(original, district))
  })
})
