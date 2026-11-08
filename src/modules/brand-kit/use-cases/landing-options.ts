/**
 * Bước 3 — Landing page chính thức. Nội dung dựng từ Hồ sơ cửa hàng + Bộ nhận diện đã chọn (không nhận nội
 * dung từ trình duyệt). Chọn phương án = chủ tiệm tự bấm xuất bản (AI không tự xuất bản): trang ra ở `/c/<slug>`
 * và đổi phương án sau này vẫn giữ nguyên đường dẫn.
 */
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { getCatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { updateCatalogLink } from "@/modules/catalog-links/use-cases/update-catalog-link"
import { generateLandingPageContent, type GeneratedLandingPackage, type LandingContentInput } from "@/modules/content-engine/domain/landing-content-generator"
import { executeGenerateLandingContent } from "@/modules/content-engine/use-cases/generate-landing-page-content.use-case"
import { listActiveShopPromotions, shopDiscountPercent } from "@/modules/greeting-card/use-cases/active-shop-promotions"
import { LANDING_TYPE_OPTIONS } from "@/modules/landing-page/domain/preset-catalog"
import { saveLandingPage } from "@/modules/landing-page/use-cases/save-landing-page"
import { getApprovedSellingNotes } from "@/modules/product-copies/use-cases/get-approved-selling-notes"
import { lockedReason } from "../domain/brand-journey"
import { BRAND_STYLES } from "../domain/brand-styles"
import { buildLandingOption, officialLinkFilters, parseLandingContent, type LandingOptionContent } from "../domain/landing-option"
import { planGeneration, type GenerationMode } from "../domain/option-rules"
import { listFeaturedProducts } from "../infra/featured-products-query"
import { batchStateOf, defaultBrandKitDeps, loadBrandKitContext, type BrandKitContext, type BrandKitDeps } from "./brand-kit-context"
import { runPaidOption, type PaidOptionUsage } from "./paid-option-job"

export type LandingWriter = (ctx: TenantContext, input: LandingContentInput) => Promise<{ pkg: GeneratedLandingPackage; aiRan: boolean }>

/** Writer → Critic của Công cụ 08; bản trả về trùng bản mẫu nghĩa là AI không chạy được. */
export const writeLandingWithAi: LandingWriter = async (ctx, input) => {
  const pkg = await executeGenerateLandingContent(input, ctx)
  return { pkg, aiRan: JSON.stringify(pkg) !== JSON.stringify(generateLandingPageContent(input)) }
}

export interface LandingDeps extends BrandKitDeps {
  readonly writeLanding: LandingWriter
}

export const defaultLandingDeps = (): LandingDeps => ({ ...defaultBrandKitDeps(), writeLanding: writeLandingWithAi })

const STORE_PAGE_GOAL = LANDING_TYPE_OPTIONS.find((o) => o.type === "STORE_BRAND")

/** Khẩu hiệu đang dùng: bản ở Hồ sơ thương hiệu (có thể đã sửa ở Cài đặt) trước, rồi bản của phương án đã chọn. */
const currentSlogan = (k: BrandKitContext) => k.brand?.slogan?.trim() || k.selectedIdentity?.content.slogan || ""

async function writerInput(ctx: TenantContext, k: BrandKitContext, styleLabel: string, archetypeId: string): Promise<LandingContentInput> {
  const b = k.business!
  const ids = k.materials.featuredProductIds
  const [products, notes, promotions] = await Promise.all([
    listFeaturedProducts(ctx, ids),
    getApprovedSellingNotes(ctx, [...ids]).catch(() => new Map<string, string>()),
    listActiveShopPromotions(ctx.organizationId).catch(() => []),
  ])
  return {
    shopName: b.display_name,
    shopTone: k.brand?.tone_of_voice ?? undefined,
    occasionId: "store-official",
    occasionLabel: "Giới thiệu cửa hàng",
    archetypeId,
    selectedProducts: products.map((p) => ({ name: p.name, code: p.code, price: p.price, category: p.category, sellingNote: notes.get(p.id) })),
    // Ưu đãi chỉ lấy từ Hồ sơ tiệm đang bật — không mặc định
    discountPercent: shopDiscountPercent(promotions),
    targetAudience: b.target_customers.join(", ") || undefined,
    designDirection: styleLabel,
    pageGoal: STORE_PAGE_GOAL ? `${STORE_PAGE_GOAL.title} — ${STORE_PAGE_GOAL.subTitle}` : undefined,
    userDirectives: [b.description, b.brand_message].filter(Boolean).join(" ") || undefined,
  }
}

export interface GenerateLandingResult {
  readonly created: readonly { id: string; content: LandingOptionContent }[]
  readonly usage: PaidOptionUsage | null
}

export async function generateLandingOptions(
  ctx: TenantContext,
  input: { mode: GenerationMode; idempotencyKey: string | null },
  deps: LandingDeps = defaultLandingDeps()
): Promise<GenerateLandingResult> {
  requireCapability(ctx, "J7")
  const k = await loadBrandKitContext(ctx, deps)
  const locked = lockedReason("LANDING", k.flags)
  if (locked) throw validationFailed({ step: locked })
  const identity = k.selectedIdentity!
  const plan = planGeneration(batchStateOf(k.landing, k.landingFingerprint), input.mode)
  if (!plan.ok) throw conflict(plan.reason)

  const save = async (jobId: string | null) => {
    const first = BRAND_STYLES[plan.slots[0]!.style]
    // Một lượt viết cho cả lượt sinh; mỗi phương án khác nhau ở phong cách hiển thị và phần mở đầu
    const { pkg, aiRan } = await deps.writeLanding(ctx, await writerInput(ctx, k, first.label, first.landing.archetypeId))
    const context = { shopName: k.business!.display_name, slogan: currentSlogan(k), description: k.business!.description, brandMessage: k.business!.brand_message }
    const options = plan.slots.map((s) => buildLandingOption({ style: s.style, variant: s.variant, identityOptionId: identity.row.id, pkg, source: aiRan ? "ai" : "template", context }))
    const rows = await deps.repo.createMany(ctx, options.map((content) => ({
      kind: "LANDING" as const, style_key: content.style_key, batch: plan.batch, content,
      profile_fingerprint: k.landingFingerprint, job_id: jobId,
    })))
    return { value: rows.map((r, i) => ({ id: r.id, content: options[i]! })), aiRan }
  }

  if (!plan.paid) return { created: (await save(null)).value, usage: null }
  if (!input.idempotencyKey) throw validationFailed({ "idempotency-key": "Bắt buộc khi tạo thêm phương án" })
  const paid = await runPaidOption(ctx, { kind: "LANDING", idempotencyKey: input.idempotencyKey, payload: { batch: plan.batch } }, save, async (jobId) => {
    const rows = (await deps.repo.list(ctx, "LANDING")).filter((r) => r.job_id === jobId)
    const parsed = rows.flatMap((r) => { const c = parseLandingContent(r.content); return c ? [{ id: r.id, content: c }] : [] })
    return parsed.length > 0 ? parsed : null
  })
  return { created: paid.value, usage: paid.usage }
}

/** Chọn phương án → xuất bản trang chính thức (cập nhật link cũ nếu còn hiệu lực, không thì tạo link mới). */
export async function selectLandingOption(ctx: TenantContext, optionId: string, deps: LandingDeps = defaultLandingDeps()) {
  requireCapability(ctx, "J1")
  const k = await loadBrandKitContext(ctx, deps)
  const locked = lockedReason("LANDING", k.flags)
  if (locked) throw validationFailed({ step: locked })
  const option = k.landing.find((o) => o.row.id === optionId)
  if (!option) throw notFound()

  const b = k.business!
  const filters = officialLinkFilters(option.content, {
    productIds: k.materials.featuredProductIds,
    heroImage: k.materials.storefrontPhotos[0] ?? null,
    video: k.materials.introVideo,
  })
  const meta = { name: b.display_name, description: currentSlogan(k) || null, filters }
  const previous = k.landing.map((o) => o.content.published_slug).find((s): s is string => Boolean(s)) ?? null
  const live = previous ? await getCatalogLinkRepository().findBySlugInOrg(ctx, previous) : null
  const slug = live && !live.is_revoked
    ? (await updateCatalogLink(ctx, live.slug, meta), live.slug)
    : (await createCatalogLink(ctx, meta)).slug

  const content: LandingOptionContent = { ...option.content, published_slug: slug }
  await deps.repo.updateContent(ctx, optionId, content)
  if (!(await deps.repo.select(ctx, "LANDING", optionId, new Date()))) throw notFound()
  await saveLandingPage(ctx, { title: content.headline, pageType: "STORE_BRAND", occasionLabel: null, input: { source: "brand_kit", option_id: optionId }, content: content.generated_package })
  return { id: optionId, slug, path: `/c/${slug}` }
}
