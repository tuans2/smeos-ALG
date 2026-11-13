/**
 * Trợ giúp lướt bộ sưu tập phía khách: khoảng giá, mẫu tương tự, tin nhắn hỏi tiệm kèm mẫu.
 * Pure TypeScript.
 */

export interface BrowseProduct {
  id: string
  code: string
  name: string
  price: number | null
  category?: string | null | undefined
  occasion?: string | null | undefined
  color?: string | null | undefined
  available?: boolean | undefined
}

export interface PriceRange {
  key: string
  label: string
  min: number
  /** `null` = không giới hạn trên */
  max: number | null
}

const RANGES: readonly PriceRange[] = [
  { key: "duoi-500", label: "Dưới 500.000đ", min: 0, max: 500_000 },
  { key: "500-1tr", label: "500.000đ – 1 triệu", min: 500_000, max: 1_000_000 },
  { key: "1-2tr", label: "1 – 2 triệu", min: 1_000_000, max: 2_000_000 },
  { key: "tren-2tr", label: "Trên 2 triệu", min: 2_000_000, max: null },
]

export function inPriceRange(price: number | null, range: PriceRange): boolean {
  if (price === null) return false
  return price >= range.min && (range.max === null || price < range.max)
}

/** Các khoảng giá có ít nhất một mẫu, kèm số mẫu. */
export function priceRangesOf(products: readonly BrowseProduct[]): Array<PriceRange & { count: number }> {
  return RANGES.map((r) => ({ ...r, count: products.filter((p) => inPriceRange(p.price, r)).length })).filter((r) => r.count > 0)
}

export function findPriceRange(key: string | null | undefined): PriceRange | null {
  return RANGES.find((r) => r.key === key) ?? null
}

/** Mẫu còn hàng giống nhất (cùng loại / dịp / màu, giá gần) — dùng khi mẫu đang xem tạm hết. */
export function similarProducts<T extends BrowseProduct>(target: BrowseProduct, products: readonly T[], limit = 3): T[] {
  const score = (p: BrowseProduct) => {
    let s = 0
    if (target.category && p.category === target.category) s += 3
    if (target.occasion && p.occasion === target.occasion) s += 2
    if (target.color && p.color === target.color) s += 1
    if (target.price !== null && p.price !== null) s += Math.max(0, 2 - Math.abs(p.price - target.price) / Math.max(target.price, 1) * 4)
    return s
  }
  return products
    .filter((p) => p.id !== target.id && p.available !== false)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p)
}

export function formatPriceVnd(price: number | null): string {
  return price === null || price <= 0 ? "giá liên hệ" : `${price.toLocaleString("vi-VN")}đ`
}

/** Tin nhắn Zalo soạn sẵn: "Tôi muốn hỏi về mẫu FL-8075 – 650.000đ." */
export function productInquiryMessage(product: Pick<BrowseProduct, "code" | "name" | "price">): string {
  const label = product.code ? `${product.code} (${product.name})` : product.name
  return `Tôi muốn hỏi về mẫu ${label} – ${formatPriceVnd(product.price)}.`
}

export function customDesignMessage(collectionName: string): string {
  return `Tôi đã xem bộ sưu tập "${collectionName}" nhưng chưa chọn được mẫu. Shop có nhận thiết kế riêng theo yêu cầu không?`
}
