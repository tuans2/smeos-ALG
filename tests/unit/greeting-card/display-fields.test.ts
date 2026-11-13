import { describe, expect, it } from "vitest"
import {
  DEFAULT_ENABLED_FIELDS,
  enabledFieldsFor,
  readDisplaySettings,
  sanitizeEnabledFields,
} from "@/modules/greeting-card/domain/display-fields"
import { applyDiscountVisibility, applyPriceVisibility, readPriceVisibility } from "@/modules/greeting-card/domain/price-visibility"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { catalogItemToProduct } from "@/modules/greeting-card/domain/catalog-product-price"
import {
  readFlowerNames,
  readOccasions,
  readStyle,
  readWrapStyle,
} from "@/modules/products/domain/master-index-fields"

describe("cấu hình bật/tắt trường hiển thị", () => {
  it("mẫu chưa chỉnh dùng mặc định (bật tất cả)", () => {
    expect(enabledFieldsFor({}, "lookbook-grid")).toEqual(DEFAULT_ENABLED_FIELDS)
  })
  it("bỏ khoá lạ, giữ thứ tự chuẩn", () => {
    expect(sanitizeEnabledFields(["category", "giaVon", "flowers", "flowers"])).toEqual(["flowers", "category"])
  })
  it("đọc theo từng mẫu từ organizations.settings, bỏ qua dữ liệu hỏng", () => {
    const s = readDisplaySettings({ greetingCardDisplay: { "cinematic-dark": ["style"], "lookbook-grid": "hỏng" }, khac: 1 })
    expect(s["cinematic-dark"]).toEqual(["style"])
    expect(s["lookbook-grid"]).toEqual(DEFAULT_ENABLED_FIELDS)
    expect(readDisplaySettings(null)).toEqual({})
  })
})

describe("trường lấy từ Master Index", () => {
  const analysis = {
    identity: { phong_cach: "Hàn Quốc", dip_su_dung: "Sinh nhật" },
    bom: {
      flowers: [{ name: "Hồng Ohara" }, { nhom_hoa: "Cúc Tana" }, { name: "Hồng Ohara" }],
      wrapping: [{ layer: "Lớp trong", material: "Giấy lụa" }, { layer: "Lớp ngoài", material: "Giấy kraft", color: "nâu" }],
    },
  }
  const src = { category: "Bó hoa", attributes: { salesData: { occasions: ["Kỷ niệm"] }, costPrice: 300000 }, analysis }

  it("đọc đúng quy tắc của Master Index", () => {
    expect(readStyle(src)).toBe("Hàn Quốc")
    expect(readOccasions(src)).toEqual(["Kỷ niệm", "Sinh nhật"])
    expect(readFlowerNames(src)).toEqual(["Hồng Ohara", "Cúc Tana"])
    expect(readWrapStyle(src)).toBe("Giấy kraft nâu")
  })

  it("sản phẩm thẻ chào nhận các trường đó, không mang dữ liệu nội bộ", () => {
    const p = catalogItemToProduct({
      sort_order: 0,
      product: { id: "p", code: "ML-1", name: "Bó hồng", category: "Bó hoa", attributes: src.attributes, analyses: [{ raw: analysis }] },
    })
    expect(p).toMatchObject({ style: "Hàn Quốc", flowersSummary: "Hồng Ohara, Cúc Tana", wrapStyle: "Giấy kraft nâu", category: "Bó hoa" })
    expect(JSON.stringify(p)).not.toContain("300000")
  })
})

describe("công tắc giá và thông tin giảm giá (ALG 5.5)", () => {
  const product: GreetingCatalogProduct = {
    id: "p1", code: "M1", name: "Bó hồng", price: 500_000, imageUrl: null, sortOrder: 0, priceMode: "RANGE", priceMaxVnd: 900_000,
    peakPriceVnd: 600_000, variants: [{ id: "v1", name: "Lớn", priceVnd: 900_000 }], priceDimensions: [{ label: "Size", values: ["Lớn"] }],
  }
  it("mặc định hiện giá và giảm giá; dữ liệu hỏng về mặc định", () => {
    expect(readPriceVisibility(null)).toEqual({ hidePrice: false, showDiscounts: true })
    expect(readPriceVisibility({ greetingCardPricing: "x" })).toEqual({ hidePrice: false, showDiscounts: true })
    expect(readPriceVisibility({ greetingCardPricing: { hidePrice: true, showDiscounts: false } })).toEqual({ hidePrice: true, showDiscounts: false })
  })
  it("tắt giá: bỏ mọi con số giá, mẫu đặt được theo luồng chờ báo giá; mẫu chỉ liên hệ giữ nguyên chính sách", () => {
    expect(applyPriceVisibility(product, { hidePrice: false, showDiscounts: true })).toBe(product)
    const hidden = applyPriceVisibility(product, { hidePrice: true, showDiscounts: true })
    expect(hidden).toMatchObject({ price: null, priceMode: "FIXED", priceMaxVnd: null, peakPriceVnd: null, variants: [], priceDimensions: [], priceHidden: true })
    expect(JSON.stringify(hidden)).not.toMatch(/500000|900000|600000/)
    expect(applyPriceVisibility({ ...product, priceMode: "CONTACT" }, { hidePrice: true, showDiscounts: true }).priceMode).toBe("CONTACT")
  })
  it("tắt giảm giá: không danh sách ưu đãi, không băng rôn", () => {
    const applied = {
      promotions: [{ id: "a", title: "Giảm 10%", customerText: "", kind: "PERCENT_OFF" as const, percent: 10 }],
      commitments: [], agreements: [], allowCustomerPromotionChoice: true, intakePromotionCta: { enabled: true, percent: 10 },
    }
    expect(applyDiscountVisibility(applied, { hidePrice: false, showDiscounts: true })).toBe(applied)
    expect(applyDiscountVisibility(applied, { hidePrice: false, showDiscounts: false })).toMatchObject({
      promotions: [], allowCustomerPromotionChoice: false, intakePromotionCta: { enabled: false },
    })
  })
})
