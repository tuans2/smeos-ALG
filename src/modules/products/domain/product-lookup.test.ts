import { describe, expect, it } from "vitest"

import { filterProductLookup, type ProductLookupRaw } from "./product-lookup"
import type { PricingRuleRow } from "./pricing-rules"

const PRODUCT: ProductLookupRaw = {
  id: "p1",
  code: "BHBB0001",
  name: "Bó hoa baby Giấc Mơ Nhỏ",
  category: "Bó hoa",
  shape: "Tròn",
  facing: "Một mặt",
  container: "Giấy gói",
  status: "ACTIVE",
  branch_id: null,
  masterImageUrl: undefined,
  price_vnd: null,
}

const RULE_ROWS: PricingRuleRow[] = [
  { key: "optimal_price_ratio", value: 0.6, branch_id: null },
]

describe("filterProductLookup", () => {
  it("có L5 (canReadPricing) thì thấy khối pricing, không trường nào bị cắt", () => {
    const result = filterProductLookup(PRODUCT, RULE_ROWS, { canReadPricing: true, branchId: null })
    expect(result.pricing).not.toBeNull()
    expect(result.pricing?.optimal_price_ratio).toBe(0.6)
    expect(result.redacted_fields).toEqual([])
  })

  it("không có L5 thì khối pricing là null và bị kê vào redacted_fields", () => {
    const result = filterProductLookup(PRODUCT, RULE_ROWS, { canReadPricing: false, branchId: null })
    expect(result.pricing).toBeNull()
    expect(result.redacted_fields).toContain("pricing")
  })

  it("cắt khối pricing không kéo theo mất thông tin nhận dạng sản phẩm", () => {
    const result = filterProductLookup(PRODUCT, RULE_ROWS, { canReadPricing: false, branchId: null })
    expect(result.code).toBe("BHBB0001")
    expect(result.name).toBe(PRODUCT.name)
    expect(result.category).toBe("Bó hoa")
  })

  it("không nguyên liệu tính toán nội bộ nào lọt ra ngoài kê tên", () => {
    const result = filterProductLookup(PRODUCT, RULE_ROWS, { canReadPricing: true, branchId: null })
    const serialized = JSON.stringify(result)
    // Chỉ những khoá đã kê tên trong ProductLookupResult mới có trong bản trả
    // ra — thêm một trường lạ vào PRODUCT không kéo nó ra ngoài.
    expect(Object.keys(result).sort()).toEqual(
      [
        "id",
        "code",
        "name",
        "category",
        "shape",
        "facing",
        "container",
        "status",
        "branch_id",
        "masterImageUrl",
        "driveLink",
        "price_vnd",
        "pricing",
        "redacted_fields",
        "attributes",
        // Cấu hình kiểm tra khả dụng theo ngành (tồn kho/lịch/khung giờ) — không chứa giá vốn
        "availability_config",
        // Cột bán hàng chuẩn — giá vốn bị cắt khi thiếu L5 (test riêng bên dưới)
        "commerce",
      ].sort()
    )
    expect(serialized).toBeDefined()
  })
  it("không có L5: giá vốn trong commerce bị cắt và ghi vào redacted_fields; có L5 thì giữ", () => {
    const raw: ProductLookupRaw = { ...PRODUCT, commerce: { barcode: "8930001", cost_price_vnd: 150_000, vat_percent: 8, weight_grams: 900, tags: ["Sinh nhật"] } }
    const hidden = filterProductLookup(raw, RULE_ROWS, { canReadPricing: false, branchId: null })
    expect(hidden.commerce).toEqual({ barcode: "8930001", cost_price_vnd: null, vat_percent: 8, weight_grams: 900, tags: ["Sinh nhật"] })
    expect(hidden.redacted_fields).toContain("cost_price_vnd")
    const shown = filterProductLookup(raw, RULE_ROWS, { canReadPricing: true, branchId: null })
    expect(shown.commerce.cost_price_vnd).toBe(150_000)
    expect(shown.redacted_fields).not.toContain("cost_price_vnd")
  })
  it("không có L5: ẩn BOM, giá sàn/trần và phí làm thay trong attributes, vẫn giữ giá bán niêm yết", () => {
    const withAttrs: ProductLookupRaw = {
      ...PRODUCT,
      attributes: { price: 450_000, color: "Hồng", bom: { flowers: [{ name: "Hồng", quantity: 10 }] }, priceGuard: { floorVnd: 1, ceilingVnd: 2 }, craft_fee_vnd: 200_000, craft_complexity: "HARD" },
    }
    const hidden = filterProductLookup(withAttrs, RULE_ROWS, { canReadPricing: false, branchId: null })
    expect(hidden.attributes).toEqual({ price: 450_000, color: "Hồng", craft_complexity: "HARD" })
    expect(hidden.price_vnd).toBe(450_000)
    expect(hidden.redacted_fields).toEqual(expect.arrayContaining(["pricing", "bom", "priceGuard", "craft_fee_vnd"]))

    const full = filterProductLookup(withAttrs, RULE_ROWS, { canReadPricing: true, branchId: null })
    expect(full.attributes).toHaveProperty("bom")
    expect(full.attributes).toHaveProperty("priceGuard")
    expect(full.attributes).toHaveProperty("craft_fee_vnd")
  })
})
