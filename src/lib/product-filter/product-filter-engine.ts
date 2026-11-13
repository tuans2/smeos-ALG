/**
 * SSOT Engine — Hàm lọc & chấm điểm sản phẩm thuần túy (Pure Functions)
 *
 * Đây là nguồn sự thật duy nhất (SSOT) cho toàn bộ logic tìm kiếm/lọc sản phẩm.
 *
 * Nguyên tắc:
 *   - Pure functions: không phụ thuộc DB, React, browser API, hay side effects
 *   - Mọi context dùng search/filter đều gọi hàm từ file này
 *   - Thêm tiêu chí lọc mới → thêm hàm ở đây + cập nhật maps → tự động áp dụng toàn hệ thống
 *
 * Cách dùng:
 *   import { filterProducts, scoreProduct } from "@/lib/product-filter"
 */

import { normalizeText, lookupNormalized } from "@/lib/normalize-text"
import {
  CATEGORY_CANONICAL,
  categoryCanonical,
  OCCASION_SLUG_MAP,
  OCCASION_NAME_KEYWORDS,
  FLOWER_NAME_KEYWORDS,
  COLOR_SLUG_MAP,
  COLOR_NAME_KEYWORDS,
} from "./product-filter-maps"
import type { FilterableProduct, ProductFilterCriteria, ScoredProduct } from "./product-filter-types"

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: lấy giá từ product (chuẩn hoá 2 field name)
// ─────────────────────────────────────────────────────────────────────────────

function getPrice(product: FilterableProduct): number {
  return (product.price_vnd ?? product.price) ?? 0
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHER FUNCTIONS — mỗi hàm xử lý 1 tiêu chí, trả true/false
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kiểm tra khoảng giá. Trả true nếu không có filter hoặc sản phẩm nằm trong khoảng.
 * Hỗ trợ cả priceRanges (chọn nhiều khung) lẫn priceMin/priceMax tuỳ nhập.
 */
export function matchPriceRange(
  product: FilterableProduct,
  criteria: Pick<ProductFilterCriteria, "priceRanges" | "priceMin" | "priceMax">
): boolean {
  const price = getPrice(product)
  const { priceRanges, priceMin, priceMax } = criteria

  if (priceRanges && priceRanges.length > 0) {
    return priceRanges.some((r) => price >= r.min && price <= r.max)
  }
  if (priceMin !== undefined && priceMax !== undefined) {
    return price >= priceMin && price <= priceMax
  }
  if (priceMin !== undefined) return price >= priceMin
  if (priceMax !== undefined) return price <= priceMax
  return true
}

/**
 * Kiểm tra dáng hoa bằng canonical key bidirectional matching.
 * Chịu được mọi biến thể: "Bó hoa" / "BOUQUET" / "bo hoa" / "ROUND".
 *
 * Logic:
 *   1. Cả filter và product đều có canonical key → so sánh canonical
 *   2. Filter có canonical nhưng product chưa → fallback khớp tên sản phẩm
 *   3. Filter không có canonical → fallback khớp chuỗi chuẩn hoá
 */
export function matchCategory(
  product: FilterableProduct,
  filterCategory: string | undefined
): boolean {
  if (!filterCategory) return true

  const filterKey = categoryCanonical(filterCategory)
  if (filterKey) {
    const productKey =
      categoryCanonical(product.category) ?? categoryCanonical(product.shape)
    if (productKey !== null) return productKey === filterKey

    // product chưa có category rõ ràng → thử khớp tên
    const normName = normalizeText(product.name)
    return normName.includes(normalizeText(filterCategory))
  }

  // Không có canonical key → fallback chuỗi chuẩn hoá
  const normFilter = normalizeText(filterCategory)
  const normCat = normalizeText(product.category)
  const normShape = normalizeText(product.shape)
  const normName = normalizeText(product.name)
  return (
    normCat.includes(normFilter) ||
    normShape.includes(normFilter) ||
    normName.includes(normFilter)
  )
}

/**
 * Kiểm tra dịp tặng.
 * Ưu tiên khớp attributes.occasionCodes; fallback từ khoá trong tên sản phẩm.
 */
export function matchOccasion(
  product: FilterableProduct,
  filterOccasion: string | undefined
): boolean {
  if (!filterOccasion) return true

  const attrs = (product.attributes as Record<string, unknown>) ?? {}
  const occasionsArr: string[] = Array.isArray(attrs.occasionCodes)
    ? (attrs.occasionCodes as string[])
    : Array.isArray(product.occasions)
      ? (product.occasions as string[])
      : []

  if (occasionsArr.length > 0) {
    const occ = normalizeText(filterOccasion)
    // Khớp slug DB (sinh-nhat) hoặc nhãn UI (sinh nhật)
    const dbSlug = lookupNormalized(OCCASION_SLUG_MAP, filterOccasion)
    return occasionsArr.some((o) => {
      const normO = normalizeText(o)
      return normO.includes(occ) || (dbSlug ? normO.includes(normalizeText(dbSlug)) : false)
    })
  }

  // Fallback: từ khoá trong tên sản phẩm
  const normName = normalizeText(product.name)
  const keywords = lookupNormalized(OCCASION_NAME_KEYWORDS, filterOccasion) ?? []
  return keywords.some((kw) => normName.includes(normalizeText(kw)))
}

/**
 * Kiểm tra loại hoa.
 * Khớp tên sản phẩm hoặc attributes.flowerTypes.
 */
export function matchFlowerType(
  product: FilterableProduct,
  filterFlowerType: string | undefined
): boolean {
  if (!filterFlowerType) return true

  const attrs = (product.attributes as Record<string, unknown>) ?? {}
  const ftArr: string[] = Array.isArray(attrs.flowerTypes)
    ? (attrs.flowerTypes as string[])
    : Array.isArray(product.flowerTypes)
      ? (product.flowerTypes as string[])
      : []

  const keywords = lookupNormalized(FLOWER_NAME_KEYWORDS, filterFlowerType) ?? [
    normalizeText(filterFlowerType),
  ]
  const normName = normalizeText(product.name)

  return (
    keywords.some((kw) => normName.includes(normalizeText(kw))) ||
    ftArr.some((f) => {
      const normF = normalizeText(f)
      return keywords.some((kw) => normF.includes(normalizeText(kw)))
    })
  )
}

/**
 * Kiểm tra tone màu.
 * Khớp attributes.color nếu có; fallback từ khoá trong tên sản phẩm.
 */
export function matchColorTone(
  product: FilterableProduct,
  filterColorTone: string | undefined
): boolean {
  if (!filterColorTone) return true

  const attrs = (product.attributes as Record<string, unknown>) ?? {}
  const rawColor = product.colorTheme
    ?? (attrs.color as string | undefined)
    ?? (attrs.colorTheme as string | undefined)
    ?? ""
  const colorVal = normalizeText(String(rawColor))
  const slugs = lookupNormalized(COLOR_SLUG_MAP, filterColorTone) ?? []
  const keywords = lookupNormalized(COLOR_NAME_KEYWORDS, filterColorTone) ?? [
    normalizeText(filterColorTone),
  ]
  const normName = normalizeText(product.name)

  if (colorVal) {
    return (
      slugs.some((s) => colorVal.includes(normalizeText(s))) ||
      keywords.some((kw) => colorVal.includes(normalizeText(kw)))
    )
  }
  return keywords.some((kw) => normName.includes(normalizeText(kw)))
}


/**
 * Kiểm tra full-text search (tên + mã sản phẩm).
 * Client-side — dùng khi không thể push lên server (vd: danh sách đã fetch về).
 */
export function matchSearch(product: FilterableProduct, search: string | undefined): boolean {
  if (!search) return true
  const q = normalizeText(search)
  return (
    normalizeText(product.name).includes(q) ||
    normalizeText(product.code).includes(q)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER: lọc cứng (true/false) — dùng cho picker, danh sách không cần rank
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lọc danh sách sản phẩm theo tất cả tiêu chí.
 * Trả về mảng đã lọc, không thay đổi thứ tự.
 *
 * @example
 * const results = filterProducts(allProducts, { category: "Bó hoa", priceRanges: [...] })
 */
export function filterProducts<T extends FilterableProduct>(
  products: T[],
  criteria: ProductFilterCriteria
): T[] {
  return products.filter((p) => {
    if (!matchPriceRange(p, criteria)) return false
    if (!matchCategory(p, criteria.category)) return false
    if (!matchOccasion(p, criteria.occasion)) return false
    if (!matchFlowerType(p, criteria.flowerType)) return false
    if (!matchColorTone(p, criteria.colorTone)) return false
    if (!matchSearch(p, criteria.search)) return false
    return true
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE: chấm điểm + rank — dùng cho quick-collection, gợi ý AI
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_BASE = 50
const SCORE_PRICE_EXACT = 30
const SCORE_PRICE_NEAR = 15
const SCORE_PRICE_MISS = -25
const SCORE_OCCASION_HIT = 25
const SCORE_CATEGORY_HIT = 20
const SCORE_CATEGORY_MISS = -30 // sản phẩm có category nhưng sai → bị hạ
const SCORE_FLOWER_HIT = 15
const SCORE_COLOR_HIT = 10
const SCORE_HAS_IMAGE = 5

/**
 * Chấm điểm một sản phẩm theo tiêu chí. Điểm càng cao = càng phù hợp.
 * Dùng để sắp xếp (sort giảm dần) thay vì lọc cứng.
 */
export function scoreProduct<T extends FilterableProduct>(
  product: T,
  criteria: ProductFilterCriteria
): ScoredProduct<T> {
  let score = SCORE_BASE
  const matchTags: string[] = []
  const price = getPrice(product)

  // 1. Khoảng giá
  const { priceRanges, priceMin, priceMax } = criteria
  if (priceRanges && priceRanges.length > 0) {
    const inExact = priceRanges.some((r) => price >= r.min && price <= r.max)
    const inNear = priceRanges.some((r) => price >= r.min * 0.85 && price <= r.max * 1.15)
    if (inExact) { score += SCORE_PRICE_EXACT; matchTags.push("Đúng tầm giá") }
    else if (inNear) { score += SCORE_PRICE_NEAR; matchTags.push("Gần tầm giá") }
    else score += SCORE_PRICE_MISS
  } else if (priceMin !== undefined || priceMax !== undefined) {
    const min = priceMin ?? 0
    const max = priceMax ?? Infinity
    if (price >= min && price <= max) { score += SCORE_PRICE_EXACT; matchTags.push("Đúng tầm giá") }
    else if (price >= min * 0.85 && price <= max * 1.15) { score += SCORE_PRICE_NEAR; matchTags.push("Gần tầm giá") }
    else score += SCORE_PRICE_MISS
  }

  // 2. Dịp tặng
  if (criteria.occasion && matchOccasion(product, criteria.occasion)) {
    score += SCORE_OCCASION_HIT
    matchTags.push(`Dịp ${criteria.occasion}`)
  }

  // 3. Dáng hoa — canonical + penalty nếu sai
  if (criteria.category) {
    const filterKey = categoryCanonical(criteria.category)
    if (filterKey) {
      const productKey =
        categoryCanonical(product.category) ?? categoryCanonical(product.shape)
      if (productKey === filterKey) {
        score += SCORE_CATEGORY_HIT
        matchTags.push(criteria.category)
      } else if (productKey !== null) {
        score += SCORE_CATEGORY_MISS
      }
      // productKey === null: chưa phân loại → không cộng/trừ
    } else if (matchCategory(product, criteria.category)) {
      score += SCORE_CATEGORY_HIT
      matchTags.push(criteria.category)
    }
  }

  // 4. Loại hoa
  if (criteria.flowerType && matchFlowerType(product, criteria.flowerType)) {
    score += SCORE_FLOWER_HIT
    matchTags.push(criteria.flowerType)
  }

  // 5. Tone màu
  if (criteria.colorTone && matchColorTone(product, criteria.colorTone)) {
    score += SCORE_COLOR_HIT
    matchTags.push(`Tone ${criteria.colorTone}`)
  }

  // Bonus: có ảnh
  const hasImage = Boolean(
    (product as FilterableProduct & { imageUrl?: string | null }).imageUrl ??
    (product as FilterableProduct & { masterImageUrl?: string | null }).masterImageUrl
  )
  if (hasImage) score += SCORE_HAS_IMAGE

  return { product, score: Math.max(0, score), matchTags }
}

/**
 * Lọc + chấm điểm + sắp xếp. Dùng cho Quick Collection, gợi ý.
 *
 * @param limit   Tối đa bao nhiêu sản phẩm trả về (mặc định tất cả)
 * @param minScore  Ngưỡng điểm tối thiểu để hiện (mặc định 0 — hiện tất cả nhưng đã sort)
 */
export function rankProducts<T extends FilterableProduct>(
  products: T[],
  criteria: ProductFilterCriteria,
  options: { limit?: number; minScore?: number } = {}
): ScoredProduct<T>[] {
  const { limit, minScore = 0 } = options

  const scored = products
    .filter((p) => !p.status || p.status === "ACTIVE")
    .map((p) => scoreProduct(p, criteria))
    .filter((s) => s.score >= minScore)

  scored.sort((a, b) => b.score - a.score)
  return limit ? scored.slice(0, limit) : scored
}

// Re-export maps & types cần dùng kèm engine
export { CATEGORY_CANONICAL, categoryCanonical }
export type { FilterableProduct, ProductFilterCriteria, ScoredProduct, PriceRange } from "./product-filter-types"
