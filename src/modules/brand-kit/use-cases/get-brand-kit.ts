/**
 * `GET /brand-kit` — trạng thái 3 bước của mục Thương hiệu cho giao diện: tab nào mở, Hồ sơ còn thiếu gì,
 * các phương án Bộ nhận diện / Landing page, giá "Tạo thêm" (Console). Chỉ đọc.
 */
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { readCreditPricing } from "@/modules/usage/infra/credit-pricing-store"
import { BRAND_STEP_LABELS, BRAND_STEPS, brandStepStatuses, currentBrandStep } from "../domain/brand-journey"
import { BRAND_STYLES } from "../domain/brand-styles"
import { recommendStyle, type IdentityOptionContent } from "../domain/identity-option"
import { OFFICIAL_SECTION_LABELS } from "../domain/landing-option"
import { MAX_BATCHES, MAX_OPTIONS_PER_BATCH } from "../domain/option-rules"
import { listFeaturedProducts } from "../infra/featured-products-query"
import { batchStateOf, defaultBrandKitDeps, loadBrandKitContext, type BrandKitDeps } from "./brand-kit-context"

export async function getBrandKit(ctx: TenantContext, deps: BrandKitDeps = defaultBrandKitDeps(), pricing = readCreditPricing) {
  requireCapability(ctx, "F1")
  const [k, price] = await Promise.all([loadBrandKitContext(ctx, deps), pricing()])
  const statuses = brandStepStatuses(k.flags)
  const b = k.business
  const recommended = recommendStyle({ description: b?.description ?? null, brandMessage: b?.brand_message ?? null, targetCustomers: b?.target_customers ?? [] })
  const featured = await listFeaturedProducts(ctx, k.materials.featuredProductIds)
  const identityState = batchStateOf(k.identity, k.identityFingerprint)
  const landingState = batchStateOf(k.landing, k.landingFingerprint)
  const latestIdentity = identityState.batchCount
  const latestLanding = landingState.batchCount

  return {
    steps: BRAND_STEPS.map((key, i) => ({ key, label: BRAND_STEP_LABELS[key], status: statuses[i]! })),
    current_step: currentBrandStep(k.flags),
    shop: {
      name: b?.display_name ?? "",
      phone: b?.phone ?? null,
      email: b?.email ?? null,
      address: b?.address ?? null,
      website: b?.website ?? null,
      slogan: k.brand?.slogan ?? null,
      logo_url: k.uploadedLogo ? k.brand?.logo_url ?? null : null,
    },
    profile: {
      done: k.profile.done,
      items: k.profile.items,
      featured_products: featured.map((p) => ({ id: p.id, name: p.name, active: p.active })),
    },
    identity: {
      recommended_style: recommended,
      selected_id: k.selectedIdentity?.row.id ?? null,
      profile_changed: identityState.profileChanged,
      can_refresh: identityState.profileChanged && identityState.batchCount < MAX_BATCHES,
      can_add: identityState.batchCount > 0 && identityState.latestBatchSize < MAX_OPTIONS_PER_BATCH,
      uses_uploaded_logo: k.uploadedLogo,
      options: k.identity.map(({ row, content }) => ({
        id: row.id,
        batch: row.batch,
        is_latest_batch: row.batch === latestIdentity,
        selected: row.selected_at !== null,
        style_label: BRAND_STYLES[content.style_key].label,
        style_description: BRAND_STYLES[content.style_key].description,
        recommended: content.style_key === recommended && content.variant === 0,
        content: content satisfies IdentityOptionContent,
      })),
    },
    landing: {
      selected_id: k.selectedLanding?.row.id ?? null,
      published_path: k.selectedLanding?.content.published_slug ? `/c/${k.selectedLanding.content.published_slug}` : null,
      profile_changed: landingState.profileChanged,
      can_refresh: landingState.profileChanged && landingState.batchCount < MAX_BATCHES,
      can_add: landingState.batchCount > 0 && landingState.latestBatchSize < MAX_OPTIONS_PER_BATCH,
      sections: OFFICIAL_SECTION_LABELS,
      options: k.landing.map(({ row, content }) => ({
        id: row.id,
        batch: row.batch,
        is_latest_batch: row.batch === latestLanding,
        selected: row.selected_at !== null,
        style_key: content.style_key,
        style_label: BRAND_STYLES[content.style_key].label,
        headline: content.headline,
        sub_headline: content.sub_headline,
        story_title: content.generated_package.story?.title ?? "",
        story_excerpt: content.generated_package.story?.paragraphs?.[0] ?? "",
        perks: (content.generated_package.perks ?? []).slice(0, 3).map((p) => p.title),
        content_source: content.content_source,
      })),
    },
    pricing: { extra_option_credit: price.brandExtraOptionCredit },
  }
}

export type BrandKitView = Awaited<ReturnType<typeof getBrandKit>>
