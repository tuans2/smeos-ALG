import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Đợt 4 D4-10 (WCAG 2.5.3): tên truy cập phải chứa chữ nhìn thấy trên nút.
const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("nhãn truy cập chứa chữ hiển thị", () => {
  it("menu tài khoản: nhãn có chữ viết tắt tên đang hiện trên nút", () => {
    expect(src("src/components/layout/user-menu.tsx")).toContain("aria-label={`Menu tài khoản ${initials}`}")
  })

  it("thẻ sản phẩm: nhãn trạng thái nằm ngoài nút ảnh", () => {
    const card = src("src/components/products/product-card.tsx")
    const buttonEnd = card.indexOf("</Button>")
    expect(buttonEnd).toBeGreaterThan(0)
    expect(card.indexOf("<StatusBadge")).toBeGreaterThan(buttonEnd)
  })

  it("ô thay ảnh trong nút là trang trí (aria-hidden)", () => {
    expect(src("src/components/products/product-thumb.tsx")).toMatch(/<div aria-hidden="true"[^>]*>\s*<ImageOff size=\{28\}/)
  })
})
