import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"

export interface BudgetTier {
  id: string
  label: string
  min: number
  max: number
}

export const BUDGET_TIERS: BudgetTier[] = [
  { id: "lt600", label: "Dưới 600.000 ₫", min: 0, max: 599_999 },
  { id: "600-1200", label: "600.000 – 1,2 triệu", min: 600_000, max: 1_200_000 },
  { id: "gt1200", label: "Trên 1,2 triệu", min: 1_200_001, max: Number.POSITIVE_INFINITY },
]

/** Các dịp tặng có thật trong bộ sưu tập (theo trường `occasion`), giữ thứ tự xuất hiện. */
export function occasionsOf(products: GreetingCatalogProduct[]): string[] {
  const seen = new Set<string>()
  for (const p of products) {
    for (const o of (p.occasion ?? "").split(/[,;/]/)) {
      const v = o.trim()
      if (v) seen.add(v)
    }
  }
  return [...seen]
}

/** Mức ngân sách có ít nhất một sản phẩm. */
export function budgetsOf(products: GreetingCatalogProduct[]): BudgetTier[] {
  return BUDGET_TIERS.filter((t) => products.some((p) => p.price !== null && p.price >= t.min && p.price <= t.max))
}

export function matchProducts(
  products: GreetingCatalogProduct[],
  occasion: string | null,
  budgetId: string | null,
): GreetingCatalogProduct[] {
  const tier = BUDGET_TIERS.find((t) => t.id === budgetId)
  const occ = occasion?.toLowerCase()
  return products.filter(
    (p) =>
      (!tier || (p.price !== null && p.price >= tier.min && p.price <= tier.max)) &&
      (!occ || (p.occasion ?? "").toLowerCase().includes(occ)),
  )
}

export interface ColorMood {
  id: string
  label: string
  swatch: string
  keywords: string[]
}

export const COLOR_MOODS: ColorMood[] = [
  { id: "red", label: "Đỏ rực rỡ", swatch: "#c81e3a", keywords: ["đỏ", "red"] },
  { id: "pink", label: "Hồng ngọt ngào", swatch: "#f4a6bd",
    // "hồng" một mình là tên hoa (hoa hồng), không phải màu
    keywords: ["màu hồng", "hồng phấn", "hồng pastel", "hồng nhạt", "pink", "pastel"] },
  { id: "white", label: "Trắng tinh khôi", swatch: "#f3f1ea", keywords: ["trắng", "white", "kem"] },
  { id: "warm", label: "Cam & vàng", swatch: "#f2a03d", keywords: ["cam", "vàng", "orange", "yellow", "hướng dương"] },
  { id: "purple", label: "Tím mộng mơ", swatch: "#8e6bbf", keywords: ["tím", "purple", "lavender", "oải hương"] },
  { id: "green", label: "Xanh tươi mát", swatch: "#5f8f4e", keywords: ["xanh lá", "xanh mát", "green"] },
]

function colorText(p: GreetingCatalogProduct): string {
  return [p.color, p.name, p.style, p.description, p.flowersSummary].filter(Boolean).join(" ").toLowerCase()
}

export function matchesMood(p: GreetingCatalogProduct, mood: ColorMood): boolean {
  const text = colorText(p)
  return mood.keywords.some((k) => text.includes(k))
}

/** Chỉ các tông màu thực sự có sản phẩm (dựa trên tên, phong cách, mô tả, thành phần). */
export function moodsOf(products: GreetingCatalogProduct[]): ColorMood[] {
  return COLOR_MOODS.filter((m) => products.some((p) => matchesMood(p, m)))
}

export function findMood(id: string | null): ColorMood | null {
  return COLOR_MOODS.find((m) => m.id === id) ?? null
}

/** Mẫu vuốt (ALG 5.9): lọc theo tông màu và khoảng giá cùng lúc; điều kiện trống thì bỏ qua. */
export function filterSwipeDeck(
  products: GreetingCatalogProduct[],
  filters: { mood: ColorMood | null; inRange: ((p: GreetingCatalogProduct) => boolean) | null },
): GreetingCatalogProduct[] {
  const { mood, inRange } = filters
  if (!mood && !inRange) return products
  return products.filter((p) => (!mood || matchesMood(p, mood)) && (!inRange || inRange(p)))
}

/** Vòng màu cho ô "Tất cả" */
export const ALL_MOODS_SWATCH = "conic-gradient(#c81e3a,#f4a6bd,#f2a03d,#5f8f4e,#8e6bbf,#c81e3a)"
