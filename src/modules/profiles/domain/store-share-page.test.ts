import { describe, expect, it } from "vitest"
import { buildPublicStoreProfile, generateStoreShareSlug, safeHttpUrl, type PublicStoreSource } from "./store-share-page"

const src: PublicStoreSource = {
  orgName: "Tổ chức A",
  business: {
    display_name: "Cửa hàng An",
    phone: "+84 901 234 567",
    email: "lienhe@cuahang.vn",
    address: "12 Lê Lợi, Quận 1",
    website: "cuahang.vn",
    description: "Cửa hàng nhỏ",
    social_links: { facebook: "https://facebook.com/cuahang", tiktok: "javascript:alert(1)", zalo: 42 },
    operating_hours: { default: "8:00–21:00" },
  },
  primaryColor: "#2f6f4e",
  logoUrl: "https://cdn.example/logo.png",
}

describe("buildPublicStoreProfile", () => {
  it("dựng đủ nút liên hệ từ dữ liệu thật", () => {
    const p = buildPublicStoreProfile(src)
    expect(p.actions.map((a) => a.kind)).toEqual(["CALL", "ZALO", "DIRECTIONS", "EMAIL", "WEBSITE"])
    expect(p.actions[0]?.href).toBe("tel:0901234567")
    expect(p.actions[1]?.href).toBe("https://zalo.me/0901234567")
    expect(p.actions[2]?.href).toContain(encodeURIComponent("12 Lê Lợi, Quận 1"))
    expect(p.hours).toBe("8:00–21:00")
  })

  it("bỏ liên kết mạng xã hội không an toàn hoặc sai kiểu", () => {
    const p = buildPublicStoreProfile(src)
    expect(p.socials).toEqual([{ network: "facebook", label: "Facebook", href: "https://facebook.com/cuahang" }])
  })

  it("thiếu dữ liệu thì ẩn khối, không điền giá trị mẫu", () => {
    const p = buildPublicStoreProfile({ orgName: "Tổ chức A", business: null, primaryColor: "đỏ", logoUrl: null })
    expect(p.name).toBe("Tổ chức A")
    expect(p.actions).toEqual([])
    expect(p.phone).toBeNull()
    expect(p.primaryColor).toBeNull()
  })

  it("số điện thoại sai định dạng không tạo nút gọi", () => {
    const p = buildPublicStoreProfile({ ...src, business: { ...src.business!, phone: "abc" } })
    expect(p.actions.some((a) => a.kind === "CALL" || a.kind === "ZALO")).toBe(false)
  })
})

describe("safeHttpUrl", () => {
  it.each([["cuahang.vn", "https://cuahang.vn/"], ["http://a.vn/x", "http://a.vn/x"]])("%s → %s", (i, o) => {
    expect(safeHttpUrl(i)).toBe(o)
  })
  it.each(["javascript:alert(1)", "", "   ", "data:text/html,x"])("từ chối %s", (i) => {
    expect(safeHttpUrl(i)).toBeNull()
  })
})

describe("generateStoreShareSlug", () => {
  it("slug không dấu, chữ thường, có hậu tố ngẫu nhiên", () => {
    expect(generateStoreShareSlug("Cửa Hàng Đồ Gỗ")).toMatch(/^cua-hang-do-go-[a-z0-9]+$/)
  })
})
