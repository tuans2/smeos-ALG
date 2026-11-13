import { describe, it, expect } from "vitest"
import { resolveAutoStyleSuggestions } from "../auto-style-resolver"

describe("resolveAutoStyleSuggestions Domain Service", () => {
  it("suggests Dark Cinematic when keywords mention cao cấp, sang trọng, vip", () => {
    const suggestions = resolveAutoStyleSuggestions("Bộ sưu tập cao cấp sang trọng độc bản cho khách VIP")
    expect(suggestions.length).toBeGreaterThanOrEqual(2)
    const top = suggestions[0]!
    expect(top.confidence).toBe("HIGH")
    expect(top.templateId).toBe("T05_DARK_CINEMATIC")
    expect(top.styleId).toBe("S11_DARK_SHOWCASE")
  })

  it("suggests Premium Lookbook when keywords mention cưới, kỷ niệm, lookbook", () => {
    const suggestions = resolveAutoStyleSuggestions("Bộ sưu tập quà tặng cưới kỷ niệm cao cấp lookbook")
    expect(suggestions.length).toBeGreaterThanOrEqual(2)
    const top = suggestions[0]!
    expect(top.confidence).toBe("HIGH")
    expect(top.templateId).toBe("T03_PREMIUM_LOOKBOOK")
    expect(top.styleId).toBe("S03_QUIET_LUXURY")
  })

  it("suggests Dark Cinematic style when keywords mention tối, huyền bí, cinematic", () => {
    const suggestions = resolveAutoStyleSuggestions("Catalog phong cách nền đen huyền bí, spotlight sang trọng")
    const top = suggestions[0]!
    expect(top.confidence).toBe("HIGH")
    expect(top.templateId).toBe("T05_DARK_CINEMATIC")
    expect(top.styleId).toBe("S11_DARK_SHOWCASE")
  })

  it("suggests Bento Showcase style when keywords mention bento, trẻ trung, gen z", () => {
    const suggestions = resolveAutoStyleSuggestions("Thiết kế dạng bento sinh động cho giới trẻ")
    const top = suggestions[0]!
    expect(top.confidence).toBe("HIGH")
    expect(top.templateId).toBe("T04_BENTO_SHOWCASE")
    expect(top.styleId).toBe("S08_BENTO_GALLERY")
  })

  it("suggests Minimal style when keywords mention tối giản, bắc âu", () => {
    const suggestions = resolveAutoStyleSuggestions("Danh mục tối giản phong cách bắc âu gọn gàng")
    const top = suggestions[0]!
    expect(top.confidence).toBe("HIGH")
    expect(top.templateId).toBe("T02_MINIMAL_PRODUCT_LIST")
    expect(top.styleId).toBe("S02_PURE_MINIMAL")
  })

  it("returns default recommended styles when directives are empty or generic", () => {
    const suggestions = resolveAutoStyleSuggestions("")
    expect(suggestions.length).toBeGreaterThanOrEqual(2)
    const top = suggestions[0]!
    expect(top.templateId).toBe("T01_SIGNATURE_COLLECTION")
  })
})
