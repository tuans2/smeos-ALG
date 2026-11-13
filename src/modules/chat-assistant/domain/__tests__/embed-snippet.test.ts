import { describe, expect, it } from "vitest"
import { buildEmbedSnippet } from "../embed-snippet"

describe("buildEmbedSnippet", () => {
  it("dựng mã nhúng từ slug thật và địa chỉ công khai", () => {
    expect(buildEmbedSnippet({ shopSlug: "hoa-cuc-vang", appUrl: "https://app.example.com/" })).toBe(
      `<script src="https://app.example.com/sdk/smeos-chat.js" data-shop-slug="hoa-cuc-vang" defer></script>`,
    )
  })

  it("không có slug thì trả null", () => {
    expect(buildEmbedSnippet({ shopSlug: null, appUrl: "https://app.example.com" })).toBeNull()
    expect(buildEmbedSnippet({ shopSlug: "  ", appUrl: "https://app.example.com" })).toBeNull()
  })

  it("không có địa chỉ công khai thì trả null", () => {
    expect(buildEmbedSnippet({ shopSlug: "hoa-cuc-vang", appUrl: "" })).toBeNull()
  })

  it("thoát ký tự đặc biệt trong thuộc tính", () => {
    const code = buildEmbedSnippet({ shopSlug: 'a"><x', appUrl: "https://app.example.com" })
    expect(code).toContain('data-shop-slug="a&quot;&gt;&lt;x"')
  })

  it("không còn dữ liệu mẫu", () => {
    const code = buildEmbedSnippet({ shopSlug: "hoa-cuc-vang", appUrl: "https://app.example.com" })
    expect(code).not.toContain("tiem-hoa-moc-lan")
    expect(code).not.toContain("floraos.vn")
  })
})
