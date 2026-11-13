/**
 * Pure TypeScript Domain Engine cho Bộ Sưu Tập Nhanh (Quick Collection Generator).
 *
 * Lọc & chấm điểm sản phẩm đã được chuyển vào SSOT `@/lib/product-filter`.
 * File này chỉ giữ:
 *   - Types riêng của Quick Collection (QuickCollectionCandidate, QuickCollectionResult…)
 *   - Hàm sinh metadata (tên BST, slug, tin nhắn gửi khách)
 *   - Hàm `generateQuickCollection` — orchestrator gọi SSOT rồi sinh metadata
 */

import { rankProducts, scoreProduct, matchCategory, matchOccasion, matchFlowerType } from "@/lib/product-filter"
import type { ProductFilterCriteria, PriceRange, FilterableProduct } from "@/lib/product-filter"

// ─────────────────────────────────────────────────────────────────────────────
// Types đặc thù của Quick Collection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sản phẩm ứng viên cho Quick Collection.
 * Các optional field dùng `string | null | undefined` (tương thích với mọi caller).
 */
export interface QuickCollectionCandidate {
  id: string
  code: string
  name: string
  /** Giá tham chiếu (VND). null = Liên hệ báo giá. */
  price: number | null
  category?: string | null | undefined
  shape?: string | null | undefined
  colorTheme?: string | null | undefined
  occasions?: string[]
  flowerTypes?: string[]
  imageUrl?: string | null | undefined
  status?: string
  attributes?: Record<string, unknown> | null | undefined
}

export interface QuickCollectionResult {
  selectedProducts: QuickCollectionCandidate[]
  totalMatched: number
  generatedName: string
  suggestedSlug: string
  customerMessage: string
  personalizedGreeting?: string | undefined
}

/** Re-export để các caller không cần import thêm từ lib */
export type { PriceRange }

export interface QuickCollectionCriteria {
  occasion?: string | undefined
  category?: string | undefined
  flowerType?: string | undefined
  colorTone?: string | undefined
  priceMin?: number | undefined
  priceMax?: number | undefined
  priceRanges?: PriceRange[] | undefined
  productLimit?: number | undefined
  customerName?: string | undefined
  customerPhone?: string | undefined
  customTitle?: string | undefined
  /** Tăng giá trị này để shuffle lại kết quả (chọn subset khác trong pool đã lọc). */
  refreshSeed?: number | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers sinh metadata
// ─────────────────────────────────────────────────────────────────────────────

/** Chuẩn hoá chuỗi để tạo slug (không dấu, thường, dấu-gạch). */
function toSlug(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Shuffle mảng theo thuật toán Fisher-Yates với seed đơn giản.
 * Đảm bảo cùng seed → cùng thứ tự; seed khác → thứ tự khác.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

function buildGeneratedName(criteria: QuickCollectionCriteria): string {
  if (criteria.customTitle?.trim()) return criteria.customTitle.trim()
  const parts: string[] = []
  if (criteria.customerName?.trim()) {
    parts.push(`Dành Riêng Cho ${criteria.customerName.trim()}`)
  } else {
    parts.push("Bộ Sưu Tập Hoa")
  }
  if (criteria.occasion) parts.push(criteria.occasion)
  if (criteria.category) parts.push(criteria.category)
  if (criteria.colorTone) parts.push(`Tone ${criteria.colorTone}`)
  return parts.join(" — ")
}

function buildCustomerMessage(
  products: QuickCollectionCandidate[],
  criteria: QuickCollectionCriteria
): string {
  const count = products.length
  const name = criteria.customerName?.trim()
  if (name) {
    return `Dạ em chào ${name} ạ! Tiệm gửi ${name} link xem ${count} sản phẩm chọn riêng cho mình: {URL}\n${name} xem ưng mẫu nào báo em chuẩn bị ngay nhé ạ!`
  }
  return `Dạ tiệm gửi anh/chị link ${count} sản phẩm theo yêu cầu: {URL}\nAnh/chị ưng mẫu nào nhắn tiệm hỗ trợ ngay nhé ạ!`
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: generateQuickCollection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tuyển chọn sản phẩm phù hợp nhất và sinh metadata cho bộ sưu tập nhanh.
 *
 * Lọc + chấm điểm do SSOT `rankProducts()` xử lý.
 * File này chỉ chịu trách nhiệm sinh tên, slug, và tin nhắn gửi khách.
 */
export function generateQuickCollection(
  candidates: QuickCollectionCandidate[],
  criteria: QuickCollectionCriteria
): QuickCollectionResult {
  const limit = Math.max(1, Math.min(20, criteria.productLimit ?? 6))

  // Ánh xạ QuickCollectionCriteria → ProductFilterCriteria (SSOT format)
  const filterCriteria: ProductFilterCriteria = {
    ...(criteria.occasion ? { occasion: criteria.occasion } : {}),
    ...(criteria.category ? { category: criteria.category } : {}),
    ...(criteria.flowerType ? { flowerType: criteria.flowerType } : {}),
    ...(criteria.colorTone ? { colorTone: criteria.colorTone } : {}),
    ...(criteria.priceMin !== undefined ? { priceMin: criteria.priceMin } : {}),
    ...(criteria.priceMax !== undefined ? { priceMax: criteria.priceMax } : {}),
    ...(criteria.priceRanges?.length ? { priceRanges: criteria.priceRanges } : {}),
  }

  const activeCandidates = (candidates as FilterableProduct[]).filter(
    (p) => !p.status || p.status === "ACTIVE"
  )

  /**
   * Chiến lược 2 tầng:
   * 1. Hard-filter theo category/occasion/flowerType
   *    → chỉ hiện sản phẩm đúng loại khi user chọn rõ ràng
   * 2. Nếu không có sản phẩm khớp → trả về rỗng (UI hiện thông báo kho chưa có)
   */
  const hardFiltered = activeCandidates.filter((p) => {
    if (criteria.category && !matchCategory(p, criteria.category)) return false
    if (criteria.occasion && !matchOccasion(p, criteria.occasion)) return false
    if (criteria.flowerType && !matchFlowerType(p, criteria.flowerType)) return false
    return true
  })

  // Nếu không có sản phẩm khớp → trả về rỗng ngay, không fallback
  if (hardFiltered.length === 0 && (
    Boolean(criteria.category) || Boolean(criteria.occasion) || Boolean(criteria.flowerType)
  )) {
    const generatedName = buildGeneratedName(criteria)
    const baseSlug = toSlug(criteria.customerName || criteria.occasion || criteria.category || "bst") || "bst"
    return {
      selectedProducts: [],
      totalMatched: 0,
      generatedName,
      suggestedSlug: `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`,
      customerMessage: buildCustomerMessage([], criteria),
      personalizedGreeting: criteria.customerName?.trim()
        ? `Sản phẩm chọn riêng cho ${criteria.customerName.trim()}`
        : undefined,
    }
  }

  // Áp dụng shuffle nếu có refreshSeed (để chọn subset khác trong pool đã lọc)
  const pool = criteria.refreshSeed !== undefined && criteria.refreshSeed > 0
    ? seededShuffle(hardFiltered, criteria.refreshSeed)
    : hardFiltered

  // Score + sort + giới hạn trong pool đã lọc
  const ranked = rankProducts(pool, filterCriteria, { limit })
  const selectedProducts = ranked.map((s) => s.product as QuickCollectionCandidate)

  // Sinh metadata
  const generatedName = buildGeneratedName(criteria)
  const baseSlug = toSlug(
    criteria.customerName || criteria.occasion || criteria.category || "bst"
  ) || "bst"
  const suggestedSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`
  const customerMessage = buildCustomerMessage(selectedProducts, criteria)
  const personalizedGreeting = criteria.customerName?.trim()
    ? `Sản phẩm chọn riêng cho ${criteria.customerName.trim()}`
    : undefined

  // totalMatched = số sản phẩm thực sự khớp filter cứng
  const totalMatched = hardFiltered.length

  return {
    selectedProducts,
    totalMatched,
    generatedName,
    suggestedSlug,
    customerMessage,
    personalizedGreeting,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export scoring types cho caller cần dùng
// ─────────────────────────────────────────────────────────────────────────────
export type { ScoredProduct } from "@/lib/product-filter"
export { scoreProduct, rankProducts } from "@/lib/product-filter"

/**
 * @deprecated Dùng `scoreProduct` từ `@/lib/product-filter` thay thế.
 * Giữ lại để tương thích ngược với test hiện tại.
 */
export function scoreProductForCollection(
  product: QuickCollectionCandidate,
  criteria: QuickCollectionCriteria
): { score: number; tags: string[] } {
  const filterCriteria: ProductFilterCriteria = {
    ...(criteria.occasion ? { occasion: criteria.occasion } : {}),
    ...(criteria.category ? { category: criteria.category } : {}),
    ...(criteria.flowerType ? { flowerType: criteria.flowerType } : {}),
    ...(criteria.colorTone ? { colorTone: criteria.colorTone } : {}),
    ...(criteria.priceMin !== undefined ? { priceMin: criteria.priceMin } : {}),
    ...(criteria.priceMax !== undefined ? { priceMax: criteria.priceMax } : {}),
    ...(criteria.priceRanges?.length ? { priceRanges: criteria.priceRanges } : {}),
  }
  const scored = scoreProduct(product as FilterableProduct, filterCriteria)
  return { score: scored.score, tags: scored.matchTags }
}
