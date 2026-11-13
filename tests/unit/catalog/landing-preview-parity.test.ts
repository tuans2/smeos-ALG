import { describe, expect, it } from "vitest"
import { buildLandingPreview, buildLandingPublishBody, type LandingDraft } from "@/components/catalog/landing-publish-payload"
import { LANDING_ARCHETYPE_VISUAL, landingVisualFor } from "@/modules/landing-page/domain/archetype-style"
import { CAMPAIGN_ARCHETYPES } from "@/components/catalog/landing-campaign-constants"
import { CATALOG_STYLES } from "@/modules/catalog-studio/domain/styles/style-registry"

const draft: LandingDraft = {
  headline: "Hồng đỏ cho mẹ", occasionId: "20-10", archetypeId: "festive-sale",
  products: [{ id: "p1", code: "HO-01", name: "Bó hồng", status: "ACTIVE", price: 500000, imageUrl: "/a.jpg" }],
  generatedPackage: null,
  enabledSections: { story: true, products: true, perks: true, process: true, reviews: true, faq: true, lead: true },
}
const shop = { name: "Tiệm A", legalName: null, phone: null, email: null, address: null, website: null, primaryColor: "#000", logoUrl: null }

describe("landing: xem trước trùng trang khách", () => {
  it("mỗi phong cách trên bộ chọn có phong cách catalog riêng, tồn tại trong registry", () => {
    const styles = CAMPAIGN_ARCHETYPES.map((a) => LANDING_ARCHETYPE_VISUAL[a.id]?.styleId)
    expect(styles.every((s) => s && s in CATALOG_STYLES)).toBe(true)
    expect(new Set(styles).size).toBe(CAMPAIGN_ARCHETYPES.length)
  })

  it("bản xem trước và bản xuất bản dùng cùng phong cách, mẫu và sản phẩm", () => {
    const body = buildLandingPublishBody(draft)
    const preview = buildLandingPreview(draft, shop)
    if (preview.status !== "ACTIVE") throw new Error("phải ACTIVE")
    expect(preview.styleId).toBe(body.filters.style_id)
    expect(preview.templateId).toBe(body.filters.template_id)
    expect(preview.styleId).toBe(landingVisualFor("festive-sale").styleId)
    expect(preview.products.map((p) => p.id)).toEqual(body.filters.product_ids)
  })

  it("mô tả khi chia sẻ link không chứa mã kỹ thuật", () => {
    expect(buildLandingPublishBody(draft).description).toBeNull()
    expect(JSON.stringify(buildLandingPublishBody(draft).description)).not.toMatch(/festive|minimal|archetype/)
  })
})

describe("quyền J7 — sinh nội dung AI landing/catalog (PO 30/10/2026)", () => {
  it("mặc định cho Điều hành, Điều phối, Marketing, Sale; không trần cứng", async () => {
    const { capability, hardCapOf } = await import("@/core/rbac/capability-catalog")
    expect([...capability("J7").defaultRoles].sort()).toEqual(["dieu_hanh", "dieu_phoi", "marketing", "sale"])
    expect(hardCapOf("J7")).toBeNull()
  })
})
