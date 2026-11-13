import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { entryOf } from "@/components/catalog/public/public-entry"
import { PublicStickyActions } from "@/components/catalog/public/public-sticky-actions"
import { CardOrderAction } from "@/components/catalog/cards/card-order-action"
import { buildLandingPreview } from "@/components/catalog/landing-publish-payload"
import { CATALOG_STYLES } from "@/modules/catalog-studio/domain/styles/style-registry"
import type { PublicCatalogResult } from "@/modules/catalog-links/use-cases/get-public-catalog"

/** Trang khách Landing/Catalog theo cài đặt nút Đặt hàng / Liên hệ của Điều hành (Đơn hàng đa nguồn §3.2). */
const style = CATALOG_STYLES.S01_EDITORIAL_MAGAZINE
const shop = { name: "Tiệm A", legalName: null, phone: "0901234567", email: null, address: null, website: null, primaryColor: "#000", logoUrl: null }
const product = { id: "p1", code: "HO-1", name: "Bó hồng", category: null, shape: null, container: null, price: 500000, imageUrl: null, stemCount: null, occasions: [], description: null }
const bar = (order: boolean, contact: boolean, phone: string | null = shop.phone) =>
  renderToStaticMarkup(createElement(PublicStickyActions, { shopName: "Tiệm A", phone, topic: "BST", style, entry: { order, contact }, productsAnchorId: "bo-suu-tap" }))
const card = (order: boolean, contact: boolean) =>
  renderToStaticMarkup(createElement(CardOrderAction, { product, shop, entry: { order, contact }, onOrderProduct: () => {}, ctaBg: "#000", ctaText: "#fff" }))

describe("nút trang khách theo cài đặt Điều hành", () => {
  it("thiếu cài đặt → mặc định hệ thống của nguồn (bật cả hai)", () => {
    const active = { status: "ACTIVE", products: [], campaignConfig: { occasion: "20-10" } } as unknown as PublicCatalogResult
    expect(entryOf(active)).toEqual({ order: true, contact: true })
    expect(entryOf({ ...active, entryActions: { order: false, contact: true } } as PublicCatalogResult)).toEqual({ order: false, contact: true })
  })

  it("thanh đáy: bật Đặt hàng → nút chính chọn mẫu; tắt Liên hệ → không Zalo/Gọi", () => {
    const both = bar(true, true)
    expect(both).toContain("Chọn mẫu để đặt hàng")
    expect(both).toContain("zalo.me/0901234567")
    const orderOnly = bar(true, false)
    expect(orderOnly).toContain("Chọn mẫu để đặt hàng")
    expect(orderOnly).not.toContain("zalo.me")
    expect(orderOnly).not.toContain("tel:")
    const contactOnly = bar(false, true)
    expect(contactOnly).toContain("Nhắn Zalo đặt hoa")
    expect(contactOnly).not.toContain("Chọn mẫu để đặt hàng")
    expect(bar(false, true, null)).toBe("")
  })

  it("thẻ sản phẩm: Đặt hàng mở form; chỉ Liên hệ → Zalo", () => {
    expect(card(true, true)).toContain("Đặt hàng Bó hồng")
    expect(card(true, true)).not.toContain("zalo.me")
    expect(card(false, true)).toContain("zalo.me/0901234567")
  })

  it("bản xem trước landing mang đúng cài đặt của nguồn Landing", () => {
    const draft = { headline: "H", occasionId: "20-10", archetypeId: "festive-sale", products: [], generatedPackage: null,
      enabledSections: { story: true, products: true, perks: true, process: true, reviews: true, faq: true, lead: true } }
    const preview = buildLandingPreview(draft, shop, [], { order: true, contact: false })
    expect(entryOf(preview)).toEqual({ order: true, contact: false })
  })
})
