import { describe, expect, it } from "vitest"

import { DEFAULT_SALE_MAX_DISCOUNT_PERCENT, parseSaleMaxDiscountPercent, quotationDiscountError } from "@/modules/sales/domain/quotation-discount"
import { assertQuotationDiscount } from "@/modules/sales/use-cases/quotation-discount-guard"
import type { TenantContext } from "@/core/tenancy/tenant-context"

/** PO 12/11/2026 (audit BL-28): trần 50% tiền hàng cho mọi người; vượt mức Sale tự quyết của tiệm cần Điều hành (C10). */
describe("trần chiết khấu báo giá", () => {
  it("mức Sale tự quyết: mặc định 20%, tiệm đặt 0–50%, giá trị sai về mặc định", () => {
    expect(parseSaleMaxDiscountPercent(null)).toBe(DEFAULT_SALE_MAX_DISCOUNT_PERCENT)
    expect(parseSaleMaxDiscountPercent({ order_discount: { sale_max_percent: 10 } })).toBe(10)
    expect(parseSaleMaxDiscountPercent({ order_discount: { sale_max_percent: 80 } })).toBe(20)
    expect(parseSaleMaxDiscountPercent({ order_discount: { sale_max_percent: 1.5 } })).toBe(20)
  })

  it("trong mức Sale → được; vượt mức Sale mà không có C10 → chặn; có C10 → được tới 50%", () => {
    const base = { subtotalVnd: 1_000_000, saleMaxPercent: 20 }
    expect(quotationDiscountError({ ...base, discountVnd: 200_000, canExceedSaleCap: false })).toBeNull()
    expect(quotationDiscountError({ ...base, discountVnd: 300_000, canExceedSaleCap: false })).toMatch(/Sale được tự quyết 20%/)
    expect(quotationDiscountError({ ...base, discountVnd: 500_000, canExceedSaleCap: true })).toBeNull()
  })

  it("vượt 50% tiền hàng → chặn với cả Điều hành; không giảm → không kiểm", () => {
    const base = { subtotalVnd: 1_000_000, saleMaxPercent: 20 }
    expect(quotationDiscountError({ ...base, discountVnd: 500_001, canExceedSaleCap: true })).toMatch(/trần 50%/)
    expect(quotationDiscountError({ ...base, discountVnd: 0, canExceedSaleCap: false })).toBeNull()
  })

  it("bộ chặn: 422 lý do DISCOUNT_CAP; không giảm thì không đọc cài đặt", async () => {
    const sale: TenantContext = { organizationId: "o", workspaceId: "w", userId: "u", branchId: null, capabilities: new Set(["R2"]) }
    const owner: TenantContext = { ...sale, capabilities: new Set(["R2", "C10"]) }
    const settings = async () => ({ order_discount: { sale_max_percent: 10 } })
    await expect(assertQuotationDiscount(sale, 1_000_000, 150_000, settings)).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY", details: { reason: "DISCOUNT_CAP" } })
    await expect(assertQuotationDiscount(owner, 1_000_000, 150_000, settings)).resolves.toBeUndefined()
    await expect(assertQuotationDiscount(sale, 1_000_000, 0, async () => { throw new Error("không được đọc") })).resolves.toBeUndefined()
  })
})
