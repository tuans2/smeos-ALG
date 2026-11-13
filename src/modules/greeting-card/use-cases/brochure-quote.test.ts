import { describe, expect, it, vi } from "vitest"

vi.mock("../infra/brochure-checkout-repository", () => ({ BrochureCheckoutRepository: class {} }))
vi.mock("../infra/tier-peak-facts-repository", () => ({
  TierPeakFactsRepository: class { latestRules = async () => ({ tierDiscount: null, peakHours: null }); customerTierByPhone = async () => null },
}))
import { quoteForProduct } from "./brochure-quote"
import type { GreetingCatalogProduct } from "../domain/greeting-card-types"
import type { BrochureCheckoutRepository } from "../infra/brochure-checkout-repository"

const checkout = {
  findVoucher: async () => null,
  findCustomerIdByPhone: async () => null,
  countPaymentCodeUses: async () => 0,
} as unknown as BrochureCheckoutRepository

const settings = { brochure_holidays: { days: [{ name: "Phụ nữ Việt Nam 20/10", date: "10-20", surcharge_vnd: 50000 }] } }
const catalogFilters = { appliedPolicies: { applyHolidaySurcharge: true } }

const base: GreetingCatalogProduct = { id: "p1", code: "B1", name: "Bó hồng", price: 300000, imageUrl: null, sortOrder: 0 }

const quote = (product: GreetingCatalogProduct, req: Record<string, string>) =>
  quoteForProduct("org", product, req, settings, checkout, null, catalogFilters)

describe("quoteForProduct — kiểu giá", () => {
  const ranged: GreetingCatalogProduct = {
    ...base,
    priceMode: "RANGE",
    variants: [{ id: "opt:nho", name: "Nhỏ", priceVnd: 300000, peakPriceVnd: 400000 }],
  }

  it("theo phiên bản: bắt buộc chọn phiên bản", async () => {
    expect((await quote(ranged, {})).errors.variantId).toBeTruthy()
  })

  it("ngày lễ dùng giá cao điểm và không cộng thêm phụ phí ngày lễ", async () => {
    const r = await quote(ranged, { variantId: "opt:nho", deliveryDate: "2026-10-20" })
    expect(r.quote.subtotalVnd).toBe(400000)
    expect(r.quote.totalVnd).toBe(400000)
  })

  it("ngày thường dùng giá thường", async () => {
    expect((await quote(ranged, { variantId: "opt:nho", deliveryDate: "2026-10-21" })).quote.subtotalVnd).toBe(300000)
  })

  it("cuối tuần là cao điểm khi sản phẩm bật", async () => {
    const r = await quote({ ...base, peakPriceVnd: 350000, weekendIsPeak: true }, { deliveryDate: "2026-10-24" })
    expect(r.quote.subtotalVnd).toBe(350000)
  })

  it("sản phẩm không có giá cao điểm vẫn cộng phụ phí ngày lễ như cũ", async () => {
    const r = await quote(base, { deliveryDate: "2026-10-20" })
    expect(r.quote.totalVnd).toBe(350000)
  })

  it("liên hệ: không nhận đặt online", async () => {
    expect((await quote({ ...base, price: null, priceMode: "CONTACT" }, {})).errors.product).toBeTruthy()
  })
})
