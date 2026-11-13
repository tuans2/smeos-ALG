/**
 * Dữ liệu landing (Công cụ 08) dùng chung cho XUẤT BẢN và XEM TRƯỚC — một nguồn, để bản xem trước
 * trùng với trang khách `/c/[slug]`. Thuần — không gọi mạng.
 */

import type { GeneratedLandingPackage } from "@/modules/content-engine/domain/landing-content-generator"
import type { PublicCatalogResult, PublicCatalogShop } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { landingVisualFor } from "@/modules/landing-page/domain/archetype-style"
import type { PublicShopReview } from "@/modules/shop-reviews/domain/review-rules"
import type { EntryActions } from "@/modules/orders/domain/entry-actions"
import type { CatalogProduct } from "./catalog-management-tab"
import type { EnabledSectionsConfig } from "./landing-campaign-preview"

export interface LandingDraft {
  headline: string
  occasionId: string
  archetypeId: string
  products: CatalogProduct[]
  customHeroImageUrl?: string | undefined
  videoUrl?: string | undefined
  generatedPackage: GeneratedLandingPackage | null | undefined
  enabledSections: EnabledSectionsConfig
}

/** Thân yêu cầu POST /api/v1/catalog-links. Mô tả không chứa mã kỹ thuật (hiện khi chia sẻ link). */
export function buildLandingPublishBody(d: LandingDraft) {
  const visual = landingVisualFor(d.archetypeId)
  return {
    name: d.headline || `Chiến dịch ${d.occasionId}`,
    description: d.generatedPackage?.hero?.subHeadline || null,
    filters: {
      style_id: visual.styleId,
      template_id: visual.templateId,
      product_ids: d.products.map((p) => p.id),
      occasion: d.occasionId,
      archetype: d.archetypeId,
      headline: d.headline,
      customHeroImageUrl: d.customHeroImageUrl || undefined,
      videoUrl: d.videoUrl || undefined,
      generatedPackage: d.generatedPackage,
      enabledSections: d.enabledSections,
    },
  }
}

/** Dựng đúng dữ liệu trang khách sẽ nhận sau khi xuất bản, để vẽ bản xem trước bằng chính trang đó. */
export function buildLandingPreview(
  d: LandingDraft,
  shop: PublicCatalogShop,
  reviews: PublicShopReview[] = [],
  /** Cài đặt nút Đặt hàng / Liên hệ của nguồn LANDING; không có thì trang dùng mặc định hệ thống */
  entryActions?: EntryActions | undefined
): PublicCatalogResult {
  const body = buildLandingPublishBody(d)
  return {
    status: "ACTIVE",
    catalog: { slug: "xem-truoc", name: body.name, description: body.description, createdAt: new Date(0).toISOString() },
    shop,
    products: d.products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category ?? null,
      shape: null,
      container: null,
      price: p.price ?? null,
      imageUrl: p.imageUrl ?? null,
      stemCount: null,
      occasions: p.occasion_code ? [p.occasion_code] : [],
      description: null,
    })),
    campaignConfig: {
      occasion: d.occasionId,
      archetype: d.archetypeId,
      customHeroImageUrl: d.customHeroImageUrl || undefined,
      videoUrl: d.videoUrl || undefined,
      generatedPackage: (d.generatedPackage ?? undefined) as Record<string, unknown> | undefined,
      enabledSections: d.enabledSections as unknown as Record<string, boolean>,
    },
    reviews,
    ...(entryActions ? { entryActions } : {}),
    templateId: body.filters.template_id,
    styleId: body.filters.style_id,
  }
}
