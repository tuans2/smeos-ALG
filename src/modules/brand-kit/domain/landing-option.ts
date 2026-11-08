/**
 * Một phương án Landing page chính thức (Thương hiệu bước 3) — trang đóng vai website / hồ sơ doanh nghiệp
 * của cửa hàng. Cấu trúc nội dung cố định cho loại trang này (`OFFICIAL_SECTIONS`); phong cách hiển thị đi
 * theo phong cách của phương án; tiêu đề lấy khẩu hiệu của Bộ nhận diện đã chọn. Thuần — không import hạ tầng.
 */
import type { CatalogStyleId, CatalogTemplateId } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import type { GeneratedLandingPackage } from "@/modules/content-engine/domain/landing-content-generator"
import { BRAND_STYLES, isBrandStyleKey, type BrandStyleKey } from "./brand-styles"

/** Khối của trang chính thức, theo thứ tự hiện trên trang khách. */
export const OFFICIAL_SECTIONS = {
  story: true, products: true, gallery: true, perks: true, process: true, reviews: true, faq: true, lead: true,
} as const

/** Mô tả cấu trúc cho chủ tiệm xem trước khi chọn. */
export const OFFICIAL_SECTION_LABELS: readonly string[] = [
  "Ảnh bìa và khẩu hiệu", "Video giới thiệu", "Câu chuyện cửa hàng", "Sản phẩm chủ đạo",
  "Điểm khác biệt", "Cách đặt hàng", "Ảnh cửa hàng", "Đánh giá của khách", "Hỏi đáp", "Thông tin liên hệ và giờ mở cửa",
]

const BADGE_BY_STYLE: Readonly<Record<BrandStyleKey, string>> = {
  LUXURY: "Trang chính thức",
  YOUTHFUL: "Chào bạn mới",
  RUSTIC: "Ghé chơi nhé",
}

export interface LandingOptionContent {
  readonly style_key: BrandStyleKey
  readonly variant: number
  readonly archetype_id: string
  readonly style_id: CatalogStyleId
  readonly template_id: CatalogTemplateId
  readonly headline: string
  readonly sub_headline: string
  readonly generated_package: GeneratedLandingPackage
  readonly identity_option_id: string
  readonly content_source: "ai" | "template"
  /** Đường dẫn `/c/<slug>` sau khi xuất bản; giữ nguyên khi đổi phương án để link chính thức không đổi */
  readonly published_slug: string | null
}

export interface OfficialLandingContext {
  readonly shopName: string
  readonly slogan: string
  readonly description: string | null
  readonly brandMessage: string | null
}

const firstSentence = (t: string | null): string | null => {
  const s = t?.trim()
  if (!s) return null
  const m = /^(.{20,180}?[.!?…])(\s|$)/.exec(s)
  return (m ? m[1]! : s.slice(0, 180)).trim()
}

/**
 * Ráp gói nội dung của trang chính thức: phần ảnh bìa luôn lấy khẩu hiệu + giới thiệu thật của cửa hàng
 * (không để AI tự đặt tiêu đề kiểu chiến dịch), các khối còn lại giữ nội dung đã viết.
 */
export function composeOfficialPackage(
  base: GeneratedLandingPackage, style: BrandStyleKey, c: OfficialLandingContext, source: "ai" | "template" = "ai"
): GeneratedLandingPackage {
  const sub = firstSentence(c.brandMessage) ?? firstSentence(c.description) ?? base.hero.subHeadline
  // Bản mẫu viết theo dịp lễ — với trang chính thức, câu chuyện lấy nguyên lời giới thiệu thật của cửa hàng
  const own = [c.description?.trim(), c.brandMessage?.trim()].filter((t): t is string => Boolean(t))
  const paragraphs = source === "template" && own.length > 0 ? own : base.story.paragraphs
  return {
    ...base,
    hero: { badge: BADGE_BY_STYLE[style], headline: c.slogan || c.shopName, subHeadline: sub, countdownLabel: "" },
    story: { ...base.story, title: `Về ${c.shopName}`, paragraphs },
  }
}

export function buildLandingOption(input: {
  style: BrandStyleKey
  variant: number
  identityOptionId: string
  pkg: GeneratedLandingPackage
  source: "ai" | "template"
  context: OfficialLandingContext
}): LandingOptionContent {
  const visual = BRAND_STYLES[input.style].landing
  const pkg = composeOfficialPackage(input.pkg, input.style, input.context, input.source)
  return {
    style_key: input.style,
    variant: input.variant,
    archetype_id: visual.archetypeId,
    style_id: visual.styleId,
    template_id: visual.templateId,
    headline: pkg.hero.headline,
    sub_headline: pkg.hero.subHeadline,
    generated_package: pkg,
    identity_option_id: input.identityOptionId,
    content_source: input.source,
    published_slug: null,
  }
}

/** Bộ lọc `catalog_links.filters` cho trang chính thức — `store_official` bật khối thông tin cửa hàng sống. */
export function officialLinkFilters(o: LandingOptionContent, materials: { productIds: readonly string[]; heroImage: string | null; video: string | null }) {
  return {
    store_official: true,
    style_id: o.style_id,
    template_id: o.template_id,
    archetype: o.archetype_id,
    product_ids: [...materials.productIds],
    headline: o.headline,
    ...(materials.heroImage ? { customHeroImageUrl: materials.heroImage } : {}),
    ...(materials.video ? { videoUrl: materials.video } : {}),
    generatedPackage: o.generated_package,
    enabledSections: OFFICIAL_SECTIONS,
  }
}

export function parseLandingContent(raw: unknown): LandingOptionContent | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (!isBrandStyleKey(r.style_key) || typeof r.headline !== "string" || !r.generated_package || typeof r.generated_package !== "object") return null
  const visual = BRAND_STYLES[r.style_key].landing
  return {
    style_key: r.style_key,
    variant: typeof r.variant === "number" ? r.variant : 0,
    archetype_id: typeof r.archetype_id === "string" ? r.archetype_id : visual.archetypeId,
    style_id: (typeof r.style_id === "string" ? r.style_id : visual.styleId) as CatalogStyleId,
    template_id: (typeof r.template_id === "string" ? r.template_id : visual.templateId) as CatalogTemplateId,
    headline: r.headline,
    sub_headline: typeof r.sub_headline === "string" ? r.sub_headline : "",
    generated_package: r.generated_package as GeneratedLandingPackage,
    identity_option_id: typeof r.identity_option_id === "string" ? r.identity_option_id : "",
    content_source: r.content_source === "ai" ? "ai" : "template",
    published_slug: typeof r.published_slug === "string" ? r.published_slug : null,
  }
}
