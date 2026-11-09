/**
 * Nhóm "Quảng bá sản phẩm" trên /cong-cu dạng 3 ô chức năng độc lập (PO 09/11/2026, docs/plan/hoanthien-quangba.md):
 * Landing page (theo chiến dịch/sản phẩm/dịp) · Bộ sưu tập chung (một link cho nhiều khách) · Bộ sưu tập riêng (link
 * gửi đích danh một khách). Không khoá theo thứ tự. Thuần — không import hạ tầng.
 */
import { classifyCatalogLink } from "@/modules/catalog-links/domain/catalog-link-kind"

export const PROMOTION_FEATURES = ["LANDING", "PUBLIC_COLLECTION", "PRIVATE_COLLECTION"] as const
export type PromotionFeature = (typeof PROMOTION_FEATURES)[number]

/** Khoá ô trên URL (`?muc=promotion&o=…`) — tải lại trang vẫn mở đúng ô. */
export const PROMOTION_FEATURE_SLUGS: Readonly<Record<PromotionFeature, string>> = {
  LANDING: "landing",
  PUBLIC_COLLECTION: "chung",
  PRIVATE_COLLECTION: "rieng",
}

export function featureFromSlug(slug: string | null | undefined): PromotionFeature | null {
  return PROMOTION_FEATURES.find((f) => PROMOTION_FEATURE_SLUGS[f] === slug) ?? null
}

/** Trạng thái một nguồn dữ liệu của ô: đang tải, lỗi, thiếu quyền hoặc đã có số. */
export type FeatureSource =
  | { readonly state: "loading" }
  | { readonly state: "error" }
  | { readonly state: "forbidden" }
  | { readonly state: "ready"; readonly count: number; readonly hasMore?: boolean }

export type SummaryTone = "ok" | "muted" | "need"

export interface FeatureSummary {
  readonly text: string
  readonly tone: SummaryTone
}

const NOUN: Readonly<Record<PromotionFeature, { some: (n: string) => string; none: string; forbidden: string }>> = {
  LANDING: {
    some: (n) => `${n} trang đang chạy`,
    none: "Chưa có trang nào",
    forbidden: "Bạn chưa có quyền xem landing",
  },
  PUBLIC_COLLECTION: {
    some: (n) => `${n} bộ sưu tập đang chạy`,
    none: "Chưa có bộ sưu tập nào",
    forbidden: "Bạn chưa có quyền xem bộ sưu tập",
  },
  PRIVATE_COLLECTION: {
    some: (n) => `${n} link đã gửi`,
    none: "Chưa gửi khách nào",
    forbidden: "Bạn chưa có quyền gửi link riêng",
  },
}

/** Dòng phụ trên ô: số đang chạy / chưa có / thiếu quyền / chưa tải được. */
export function promotionSummary(feature: PromotionFeature, source: FeatureSource): FeatureSummary {
  const noun = NOUN[feature]
  switch (source.state) {
    case "loading":
      return { text: "Đang tải…", tone: "muted" }
    case "error":
      return { text: "Chưa tải được số liệu", tone: "need" }
    case "forbidden":
      return { text: noun.forbidden, tone: "muted" }
    case "ready": {
      const n = Math.max(0, Math.floor(source.count))
      if (n === 0) return { text: noun.none, tone: "muted" }
      return { text: noun.some(source.hasMore ? `${n}+` : String(n)), tone: "ok" }
    }
  }
}

interface LinkLike {
  readonly filters: unknown
  readonly is_revoked?: boolean | undefined
  readonly revoked_at?: string | null | undefined
}

function isActive(link: LinkLike): boolean {
  return !link.is_revoked && !link.revoked_at
}

/**
 * Tách danh sách `catalog_links` cho hai ô: Landing chỉ nhận landing chiến dịch (trang chính thức thuộc nhóm
 * Thương hiệu), Bộ sưu tập chung chỉ nhận bộ sưu tập chung. Số đếm chỉ tính link đang mở.
 */
export function splitPromotionLinks<T extends LinkLike>(links: readonly T[]): {
  landings: T[]
  collections: T[]
  activeLandings: number
  activeCollections: number
} {
  const landings = links.filter((l) => classifyCatalogLink(l.filters) === "CAMPAIGN_LANDING")
  const collections = links.filter((l) => classifyCatalogLink(l.filters) === "PUBLIC_COLLECTION")
  return {
    landings,
    collections,
    activeLandings: landings.filter(isActive).length,
    activeCollections: collections.filter(isActive).length,
  }
}

/**
 * Loại trang được tạo từ ô Landing (nhóm Quảng bá): chỉ trang chiến dịch/dịp và trang chào dịch vụ. Hai loại trang
 * thương hiệu (cửa hàng, chuỗi) thuộc trang chính thức ở nhóm Hồ sơ & Thương hiệu (PO 09/11/2026, Q1).
 */
export const CAMPAIGN_LANDING_TYPES = ["CAMPAIGN_SEASONAL", "SHOWCASE_HIGHLIGHT"] as const
export type CampaignLandingType = (typeof CAMPAIGN_LANDING_TYPES)[number]
