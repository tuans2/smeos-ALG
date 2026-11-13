import { describe, expect, it } from "vitest"
import { catalogPublicPath, normalizeLinkCode } from "@/components/greeting-card/journey/use-journey-catalogs"
import { isValidPhone } from "@/components/greeting-card/journey/step-customer"
import { toPublicCatalogFilters } from "@/modules/greeting-card/domain/greeting-template-registry"
import { catalogTemplateId, previewPaneKey } from "@/components/greeting-card/journey/template-section"

describe("normalizeLinkCode", () => {
  it("bỏ dấu tiếng Việt và ký tự lạ thành gạch ngang", () => {
    expect(normalizeLinkCode("  Hoa Đẹp 20/10 ")).toBe("hoa-dep-20-10")
  })
  it("gộp gạch ngang liên tiếp và cắt ở hai đầu", () => {
    expect(normalizeLinkCode("--a__b--")).toBe("a-b")
  })
  it("trả rỗng khi không còn ký tự hợp lệ", () => {
    expect(normalizeLinkCode("!!!")).toBe("")
  })
})

describe("catalogPublicPath", () => {
  const cat = { id: "c1", name: "X", code: "hoa-20-10", itemCount: 1, filters: null }
  it("dùng slug cửa hàng khi đã biết", () => {
    expect(catalogPublicPath("moc-lan", cat)).toBe("bst/moc-lan/hoa-20-10")
  })
  it("không đoán slug cửa hàng khác khi chưa tải được slug", () => {
    expect(catalogPublicPath("", cat)).toBe("g/c1")
  })
})

describe("isValidPhone", () => {
  it.each(["", "0901234567", "0901 234 567", "+84901234567", "84901234567"])("chấp nhận %s", (v) => {
    expect(isValidPhone(v)).toBe(true)
  })
  it.each(["123", "abc0901234567", "090123"])("từ chối %s", (v) => {
    expect(isValidPhone(v)).toBe(false)
  })
})

describe("toPublicCatalogFilters", () => {
  const all = ["flowers", "color", "style", "dimensions", "wrapStyle", "category", "description"]
  it("chỉ gửi mẫu + trường hiển thị, bỏ bộ lọc nội bộ của bộ sưu tập", () => {
    const out = toPublicCatalogFilters({ templateId: "lookbook-grid", priceMax: 500000 })
    expect(out).toMatchObject({ templateId: "lookbook-grid", displayFields: all, requirePaymentProof: true })
    expect(Object.keys(out ?? {}).sort()).toEqual(["appliedPolicies", "displayFields", "requirePaymentProof", "templateId"])
    expect(JSON.stringify(out)).not.toContain("priceMax")
  })
  it("đọc cấu hình bật/tắt của cửa hàng cho đúng mẫu, bỏ khoá cài đặt khác", () => {
    const settings = { cho_phep_tu_duyet: true, greetingCardDisplay: { "lookbook-grid": ["dimensions", "bogus"] } }
    const out = toPublicCatalogFilters({ templateId: "lookbook-grid" }, settings)
    expect(out).toMatchObject({ templateId: "lookbook-grid", displayFields: ["dimensions"] })
    expect(JSON.stringify(out)).not.toContain("cho_phep_tu_duyet")
  })
  it("trả null khi không có templateId và không có cài đặt cửa hàng", () => {
    expect(toPublicCatalogFilters({ priceMax: 1 })).toBeNull()
    expect(toPublicCatalogFilters(null)).toBeNull()
  })
})

describe("catalogTemplateId", () => {
  const base = { id: "c1", name: "X", code: "x", itemCount: 0 }
  it("đọc giao diện đã lưu", () => {
    expect(catalogTemplateId({ ...base, filters: { templateId: "lookbook-grid" } })).toBe("lookbook-grid")
  })
  it("rơi về mặc định khi chưa chọn hoặc id lạ", () => {
    expect(catalogTemplateId({ ...base, filters: null })).toBe("editorial-luxury")
    expect(catalogTemplateId({ ...base, filters: { templateId: "khong-ton-tai" } })).toBe("editorial-luxury")
  })
})

describe("previewPaneKey", () => {
  it("đổi khi thêm mẫu vào bộ sưu tập để khung xem trước tải lại ảnh thật", () => {
    expect(previewPaneKey({ id: "c1", itemCount: 0 })).not.toBe(previewPaneKey({ id: "c1", itemCount: 9 }))
  })
  it("giữ nguyên khi bộ sưu tập và số mẫu không đổi", () => {
    expect(previewPaneKey({ id: "c1", itemCount: 9 })).toBe(previewPaneKey({ id: "c1", itemCount: 9 }))
  })
})
