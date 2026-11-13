import { describe, it, expect } from "vitest"
import {
  coordinatorActionBlocker,
  parseBrochurePaymentConfig,
  resolveProductPriceVnd,
} from "../brochure-commerce-rules"

describe("resolveProductPriceVnd", () => {
  it("ưu tiên attributes.price, rồi price_vnd, rồi biến thể", () => {
    expect(resolveProductPriceVnd({ price: 850000, price_vnd: 1 }, { price: 2 })).toBe(850000)
    expect(resolveProductPriceVnd({ price_vnd: 650000 }, { price: 2 })).toBe(650000)
    expect(resolveProductPriceVnd(null, { price: 450000 })).toBe(450000)
  })

  it("trả null khi chưa có giá — không bịa 500.000đ", () => {
    expect(resolveProductPriceVnd(null)).toBeNull()
    expect(resolveProductPriceVnd({ price: 0 })).toBeNull()
    expect(resolveProductPriceVnd({ price: "500000" })).toBeNull()
    expect(resolveProductPriceVnd({ price: -1 })).toBeNull()
  })
})

describe("parseBrochurePaymentConfig", () => {
  it("đọc cấu hình hợp lệ", () => {
    const config = parseBrochurePaymentConfig({
      brochure_payment: { bank_id: "VCB", bank_name: "Vietcombank", account_no: "0011 2233 44", account_name: "tiem hoa a" },
    })
    expect(config).toEqual({ bankId: "VCB", bankName: "Vietcombank", accountNo: "0011223344", accountName: "TIEM HOA A" })
  })

  it("thiếu hoặc sai → null", () => {
    expect(parseBrochurePaymentConfig(null)).toBeNull()
    expect(parseBrochurePaymentConfig({ brochure_payment: { bank_id: "VCB" } })).toBeNull()
    expect(parseBrochurePaymentConfig({ brochure_payment: { bank_id: "V/C", account_no: "1234", account_name: "A" } })).toBeNull()
  })
})

describe("coordinatorActionBlocker", () => {
  const base = { status: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "PENDING" }

  it("đi đúng thứ tự florist → ảnh thành phẩm → ship → ảnh người nhận", () => {
    expect(coordinatorActionBlocker("assign-florist", base)).toBeNull()
    expect(coordinatorActionBlocker("dispatch-shipping", base)).not.toBeNull()
    expect(coordinatorActionBlocker("recipient-photo", base)).not.toBeNull()
    const ready = { ...base, productionStatus: "READY" }
    expect(coordinatorActionBlocker("dispatch-shipping", ready)).toBeNull()
    expect(coordinatorActionBlocker("assign-florist", ready)).not.toBeNull()
    const shipping = { ...ready, deliveryStatus: "DELIVERING" }
    expect(coordinatorActionBlocker("recipient-photo", shipping)).toBeNull()
    expect(coordinatorActionBlocker("product-photo", shipping)).not.toBeNull()
  })

  it("chặn mọi tác vụ trên đơn đã huỷ hoặc đã giao xong", () => {
    expect(coordinatorActionBlocker("assign-florist", { ...base, status: "CANCELLED" })).toMatch(/huỷ/)
    expect(coordinatorActionBlocker("product-photo", { ...base, deliveryStatus: "DELIVERED" })).not.toBeNull()
  })
})
