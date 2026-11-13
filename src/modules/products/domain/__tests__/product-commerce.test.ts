import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  commerceFromRow,
  commerceInputShape,
  normalizeTags,
  pickCommerceInput,
  redactCommerce,
  stripCostPrice,
} from "../product-commerce"

describe("product commerce fields", () => {
  it("normalises tags: trim, collapse spaces, case-insensitive dedupe, cap 20", () => {
    expect(normalizeTags(["  Sinh  nhật ", "sinh nhật", "", "Hồng"])).toEqual(["Sinh nhật", "Hồng"])
    expect(normalizeTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(20)
  })

  it("picks only keys present in the body", () => {
    expect(pickCommerceInput({ name: "x", status: "DRAFT" })).toBeUndefined()
    expect(pickCommerceInput({ barcode: null, vat_percent: 8, tags: ["a", "A"] })).toEqual({
      barcode: null,
      vat_percent: 8,
      tags: ["a"],
    })
  })

  it("validates ranges", () => {
    const schema = z.object(commerceInputShape)
    expect(schema.safeParse({ vat_percent: 101 }).success).toBe(false)
    expect(schema.safeParse({ cost_price_vnd: -1 }).success).toBe(false)
    expect(schema.safeParse({ barcode: "89 3" }).success).toBe(false)
    expect(schema.safeParse({ barcode: "8934567890123", weight_grams: 500 }).success).toBe(true)
  })

  it("hides cost price without L5 and reports it", () => {
    const fields = commerceFromRow({ cost_price_vnd: 120000, tags: ["a"] })
    expect(redactCommerce(fields, true)).toEqual({ commerce: fields, redacted: [] })
    expect(redactCommerce(fields, false)).toEqual({ commerce: { ...fields, cost_price_vnd: null }, redacted: ["cost_price_vnd"] })
    expect(redactCommerce(commerceFromRow({}), false).redacted).toEqual([])
    expect(stripCostPrice({ id: "p", cost_price_vnd: 5 }, false)).toEqual({ id: "p", cost_price_vnd: null })
    expect(stripCostPrice({ id: "p", cost_price_vnd: 5 }, true)).toEqual({ id: "p", cost_price_vnd: 5 })
  })
})
