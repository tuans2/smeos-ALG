import { describe, expect, it } from "vitest"

import { featureFromSlug, PROMOTION_FEATURE_SLUGS, PROMOTION_FEATURES, promotionSummary, splitPromotionLinks } from "./promotion-hub"

describe("Quảng bá sản phẩm — 3 ô chức năng (PO 09/11/2026)", () => {
  it("đúng 3 chức năng, mỗi chức năng một khoá URL riêng", () => {
    expect(PROMOTION_FEATURES).toEqual(["LANDING", "PUBLIC_COLLECTION", "PRIVATE_COLLECTION"])
    for (const f of PROMOTION_FEATURES) expect(featureFromSlug(PROMOTION_FEATURE_SLUGS[f])).toBe(f)
    expect(featureFromSlug("khac")).toBeNull()
    expect(featureFromSlug(null)).toBeNull()
  })

  it("dòng phụ: 0, 1, nhiều, còn trang sau", () => {
    expect(promotionSummary("LANDING", { state: "ready", count: 0 })).toEqual({ text: "Chưa có trang nào", tone: "muted" })
    expect(promotionSummary("LANDING", { state: "ready", count: 2 })).toEqual({ text: "2 trang đang chạy", tone: "ok" })
    expect(promotionSummary("PUBLIC_COLLECTION", { state: "ready", count: 1 }).text).toBe("1 bộ sưu tập đang chạy")
    expect(promotionSummary("PUBLIC_COLLECTION", { state: "ready", count: 0 }).text).toBe("Chưa có bộ sưu tập nào")
    expect(promotionSummary("PRIVATE_COLLECTION", { state: "ready", count: 5 }).text).toBe("5 link đã gửi")
    expect(promotionSummary("PRIVATE_COLLECTION", { state: "ready", count: 100, hasMore: true }).text).toBe("100+ link đã gửi")
    expect(promotionSummary("PRIVATE_COLLECTION", { state: "ready", count: 0 }).text).toBe("Chưa gửi khách nào")
  })

  it("dòng phụ: đang tải, nguồn lỗi, thiếu quyền — nói rõ, không giấu", () => {
    expect(promotionSummary("LANDING", { state: "loading" }).tone).toBe("muted")
    expect(promotionSummary("LANDING", { state: "error" })).toEqual({ text: "Chưa tải được số liệu", tone: "need" })
    for (const f of PROMOTION_FEATURES) {
      expect(promotionSummary(f, { state: "forbidden" }).text).toMatch(/^Bạn chưa có quyền/)
    }
  })

  it("tách link: Landing chỉ nhận landing chiến dịch, Bộ sưu tập chung chỉ nhận bộ sưu tập; số đếm bỏ link đã ngừng", () => {
    const links = [
      { id: "official", filters: { store_official: true, archetype: "a" } },
      { id: "camp", filters: { occasion: "tet" } },
      { id: "camp-revoked", filters: { archetype: "b" }, is_revoked: true },
      { id: "col", filters: { product_ids: ["p"] } },
      { id: "col-revoked", filters: null, revoked_at: "2026-11-01T00:00:00.000Z" },
    ]
    const r = splitPromotionLinks(links)
    expect(r.landings.map((l) => l.id)).toEqual(["camp", "camp-revoked"])
    expect(r.collections.map((l) => l.id)).toEqual(["col", "col-revoked"])
    expect(r.activeLandings).toBe(1)
    expect(r.activeCollections).toBe(1)
  })
})

describe("Ô Landing chỉ tạo trang chiến dịch (PO 09/11/2026, Q1)", () => {
  it("bỏ hai loại trang thương hiệu, giữ loại nằm trong danh mục landing", async () => {
    const { CAMPAIGN_LANDING_TYPES } = await import("./promotion-hub")
    const { LANDING_TYPE_OPTIONS } = await import("@/modules/landing-page/domain/preset-catalog")
    const all = LANDING_TYPE_OPTIONS.map((o) => o.type)
    expect(CAMPAIGN_LANDING_TYPES).toEqual(["CAMPAIGN_SEASONAL", "SHOWCASE_HIGHLIGHT"])
    for (const t of CAMPAIGN_LANDING_TYPES) expect(all).toContain(t)
    expect(CAMPAIGN_LANDING_TYPES).not.toContain("STORE_BRAND")
    expect(CAMPAIGN_LANDING_TYPES).not.toContain("CHAIN_BRAND")
  })
})
