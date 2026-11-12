import { describe, it, expect } from "vitest"
import {
  interpolateTemplate,
  resolveVariablePath,
  extractTemplateVariables,
} from "../interpolation-engine"
import { buildInterpolationContext } from "../variable-catalog"

describe("ALG Template Interpolation Engine", () => {
  it("resolves nested variables correctly with dot notation", () => {
    const ctx = buildInterpolationContext({
      productName: "Bó Hoa Tươi Thắm",
      price: 500000,
      shopName: "Flora Dalat",
    })

    expect(resolveVariablePath(ctx, "product.name")).toBe("Bó Hoa Tươi Thắm")
    expect(resolveVariablePath(ctx, "pricing.selling_price_vnd")).toBe("500.000đ")
    expect(resolveVariablePath(ctx, "shop.name")).toBe("Flora Dalat")
    expect(resolveVariablePath(ctx, "unknown.path")).toBeUndefined()
  })

  it("replaces variables in template strings correctly", () => {
    const ctx = buildInterpolationContext({
      productName: "Bó Hoa Hướng Dương",
      price: 350000,
      shopHotline: "0988 777 666",
    })

    const tmpl = "Mẫu {{ product.name }} có giá {{ pricing.selling_price_vnd }}. Hotline: {{ shop.hotline }}"
    const result = interpolateTemplate(tmpl, ctx)

    expect(result).toBe("Mẫu Bó Hoa Hướng Dương có giá 350.000đ. Hotline: 0988 777 666")
  })

  it("applies default fallback value when variable is missing", () => {
    const ctx = buildInterpolationContext({
      productName: "Hoa Lan Hồ Điệp",
    })

    const tmpl = 'Mã sản phẩm: {{ product.sku | default: "SP-DEFAULT" }}'
    const result = interpolateTemplate(tmpl, ctx)

    expect(result).toBe("Mã sản phẩm: SP-M01") // vì buildInterpolationContext có default sku là SP-M01
  })

  it("falls back to custom default when context has empty variable", () => {
    const emptyCtx = { product: {} }
    const tmpl = 'Sản phẩm: {{ product.name | default: "Sản phẩm tươi" }}'
    const result = interpolateTemplate(tmpl, emptyCtx)

    expect(result).toBe("Sản phẩm: Sản phẩm tươi")
  })

  it("extracts all variable keys from a template string", () => {
    const tmpl = "Mẫu {{ product.name }} giá {{ pricing.selling_price_vnd | default: '0đ' }} tại {{ shop.name }}"
    const vars = extractTemplateVariables(tmpl)

    expect(vars).toEqual(["product.name", "pricing.selling_price_vnd", "shop.name"])
  })
})
