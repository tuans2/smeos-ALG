import { parsePricing, summarizePricing } from "@/modules/products/domain/product-pricing"

/**
 * Khoảng giá thật của một sản phẩm cho bộ lọc/sắp xếp danh sách: Khoảng giá → [thấp nhất, cao nhất];
 * Liên hệ / chưa có giá → null (không khớp bộ lọc giá, xếp cuối).
 */
export function productPriceSpan(p: { price_vnd: number | null; attributes?: Record<string, unknown> | null | undefined }): { min: number; max: number } | null {
  if (p.attributes?.pricing) {
    const s = summarizePricing(parsePricing(p.attributes))
    if (s.mode === "CONTACT" || s.minVnd === null) return null
    return { min: s.minVnd, max: s.maxVnd ?? s.minVnd }
  }
  return p.price_vnd === null ? null : { min: p.price_vnd, max: p.price_vnd }
}

/** Khoảng giá sản phẩm giao với khoảng lọc [min, max] (null = không giới hạn đầu đó). */
export function spanOverlaps(span: { min: number; max: number } | null, min: number | null, max: number | null): boolean {
  if (span === null) return false
  if (min !== null && span.max < min) return false
  if (max !== null && span.min > max) return false
  return true
}

export type PriceModeFilter = "all" | "FIXED" | "RANGE" | "CONTACT"

export const PRICE_MODE_FILTERS: ReadonlyArray<{ id: PriceModeFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "FIXED", label: "Giá xác định" },
  { id: "RANGE", label: "Khoảng giá" },
  { id: "CONTACT", label: "Liên hệ" },
]

/** Kiểu giá của sản phẩm trong danh sách (sản phẩm cũ chưa khai = Giá xác định). */
export function productPriceMode(p: { attributes?: Record<string, unknown> | null | undefined }): Exclude<PriceModeFilter, "all"> {
  return parsePricing(p.attributes ?? {}).mode
}

export function matchPriceMode(p: { attributes?: Record<string, unknown> | null | undefined }, filter: PriceModeFilter): boolean {
  return filter === "all" || productPriceMode(p) === filter
}
