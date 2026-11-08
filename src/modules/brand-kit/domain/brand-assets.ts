/**
 * Đọc/ghi phần "nguyên liệu thương hiệu" trong `brand_profiles.brand_assets` (Json) mà mục Thương hiệu dùng:
 * ảnh cửa hàng, video giới thiệu và sản phẩm chủ đạo. Giữ nguyên mọi khoá khác (mã QR Zalo…) khi ghi.
 * Thuần — không import hạ tầng.
 */

export const MAX_FEATURED_PRODUCTS = 6
export const MAX_STOREFRONT_PHOTOS = 8

export interface BrandMaterials {
  readonly storefrontPhotos: readonly string[]
  readonly introVideo: string | null
  readonly featuredProductIds: readonly string[]
}

const asRecord = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

const strings = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()))].slice(0, max)
    : []

export function readBrandMaterials(raw: unknown): BrandMaterials {
  const r = asRecord(raw)
  const video = typeof r.intro_video === "string" && r.intro_video.trim() ? r.intro_video.trim() : null
  return {
    storefrontPhotos: strings(r.storefront_photos, MAX_STOREFRONT_PHOTOS),
    introVideo: video,
    featuredProductIds: strings(r.featured_product_ids, MAX_FEATURED_PRODUCTS),
  }
}

/** Ghi danh sách sản phẩm chủ đạo vào `brand_assets`, giữ nguyên các khoá khác. */
export function withFeaturedProducts(raw: unknown, ids: readonly string[]): Record<string, unknown> {
  return { ...asRecord(raw), featured_product_ids: strings(ids, MAX_FEATURED_PRODUCTS) }
}
