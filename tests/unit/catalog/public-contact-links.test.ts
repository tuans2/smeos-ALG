import { describe, expect, it } from "vitest"
import { shopCallUrl, shopZaloUrl } from "@/components/catalog/public/public-contact-links"

/** Trang khách xem chỉ hiện nút Zalo/Gọi khi Hồ sơ tiệm có số điện thoại — không dựng link thiếu số. */
describe("link liên hệ trang công khai", () => {
  it("không có số điện thoại thì không dựng link", () => {
    expect(shopZaloUrl("Tiệm A", null, "Bộ sưu tập")).toBeNull()
    expect(shopZaloUrl("Tiệm A", " - ", "Bộ sưu tập")).toBeNull()
    expect(shopCallUrl(undefined)).toBeNull()
  })

  it("có số thì link Zalo/Gọi mang đúng số đã chuẩn hoá", () => {
    expect(shopZaloUrl("Tiệm A", "0901 234 567", "BST 20/10")).toMatch(/^https:\/\/zalo\.me\/0901234567\?text=/)
    expect(shopCallUrl("0901.234.567")).toBe("tel:0901234567")
  })
})
