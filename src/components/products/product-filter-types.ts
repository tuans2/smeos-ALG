/**
 * Định nghĩa các bộ lọc sản phẩm: Giá, Dịp, Danh mục, Sắp xếp
 * và các tiện ích chuẩn hóa tìm kiếm tiếng Việt cho Kho Sản Phẩm Sản Phẩm ALG.
 */

import { productPriceSpan, spanOverlaps } from "./product-price-span"

export type OccasionId =
  | "all"
  | "chia_buon"
  | "khai_truong"
  | "sinh_nhat"
  | "tinh_yeu"
  | "chuc_mung"
  | "tan_gia"
  | "cuoi_hoi"
  | "ngay_phu_nu"
  | "nha_giao"
  | "tot_nghiep"

export interface OccasionDef {
  id: OccasionId
  label: string
  shortLabel: string
  keywords: string[]
}

export const OCCASIONS: readonly OccasionDef[] = [
  {
    id: "all",
    label: "Tất cả các dịp",
    shortLabel: "Tất cả dịp",
    keywords: [],
  },
  {
    id: "chia_buon",
    label: "Chia buồn / Viếng / Tang lễ",
    shortLabel: "Chia buồn",
    keywords: [
      "chia buồn",
      "chia buon",
      "viếng",
      "vieng",
      "tang lễ",
      "tang le",
      "tang",
      "phúng viếng",
      "phung vieng",
      "vòng hoa",
      "vong hoa",
      "kệ hoa viếng",
      "ke hoa vieng",
      "kệ viếng",
      "vòng viếng",
      "hoa tang",
    ],
  },
  {
    id: "khai_truong",
    label: "Khai trương / Khánh thành",
    shortLabel: "Khai trương",
    keywords: [
      "khai trương",
      "khai truong",
      "khánh thành",
      "khanh thanh",
      "hồng phát",
      "hong phat",
      "kệ khai trương",
      "kỷ niệm thành lập",
      "thành lập",
      "đối tác",
    ],
  },
  {
    id: "sinh_nhat",
    label: "Sinh nhật / Tuổi mới",
    shortLabel: "Sinh nhật",
    keywords: [
      "sinh nhật",
      "sinh nhat",
      "tuổi mới",
      "tuoi moi",
      "birthday",
      "sn",
      "mừng sinh nhật",
    ],
  },
  {
    id: "tinh_yeu",
    label: "Tình yêu / Kỷ niệm / Lễ tình nhân",
    shortLabel: "Tình yêu",
    keywords: [
      "tình yêu",
      "tinh yeu",
      "kỷ niệm",
      "ky niem",
      "valentine",
      "14/2",
      "20/10",
      "8/3",
      "người yêu",
      "nguoi yeu",
      "vợ",
      "bạn gái",
      "tỏ tình",
      "lãng mạn",
      "ohara",
      "hồng đỏ",
    ],
  },
  {
    id: "chuc_mung",
    label: "Chúc mừng / Tốt nghiệp / Vinh danh",
    shortLabel: "Chúc mừng",
    keywords: [
      "chúc mừng",
      "chuc mung",
      "tốt nghiệp",
      "tot nghiep",
      "thăng chức",
      "thang chuc",
      "vinh danh",
      "tri ân",
      "khen thưởng",
    ],
  },
  {
    id: "tan_gia",
    label: "Tân gia / Mừng thọ / Chúc Tết",
    shortLabel: "Tân gia / Tết",
    keywords: [
      "tân gia",
      "tan gia",
      "nhà mới",
      "nha moi",
      "mừng thọ",
      "mung tho",
      "chúc thọ",
      "chuc tho",
      "chúc tết",
      "chuc tet",
      "lan hồ điệp",
      "hồ điệp",
      "phú quý",
      "tài lộc",
    ],
  },
  {
    id: "cuoi_hoi",
    label: "Cưới hỏi / Xe hoa / Cầm tay",
    shortLabel: "Cưới hỏi",
    keywords: [
      "cưới",
      "cuoi",
      "cô dâu",
      "co dau",
      "xe hoa",
      "cầm tay",
      "ngày cưới",
      "đám cưới",
    ],
  },
  {
    id: "ngay_phu_nu",
    label: "Ngày 8/3 và 20/10",
    shortLabel: "8/3 & 20/10",
    keywords: [
      "8/3",
      "20/10",
      "phụ nữ",
      "phu nu",
      "quốc tế phụ nữ",
      "phụ nữ việt nam",
      "mẹ",
      "cô giáo",
    ],
  },
  {
    id: "nha_giao",
    label: "Ngày 20/11",
    shortLabel: "20/11",
    keywords: [
      "20/11",
      "nhà giáo",
      "nha giao",
      "thầy cô",
      "thay co",
      "tri ân thầy cô",
    ],
  },
  {
    id: "tot_nghiep",
    label: "Tốt nghiệp",
    shortLabel: "Tốt nghiệp",
    keywords: [
      "tốt nghiệp",
      "tot nghiep",
      "cử nhân",
      "cu nhan",
      "lễ tốt nghiệp",
    ],
  },
]

export type PriceRangeId =
  | "all"
  | "under_500k"
  | "500k_1m"
  | "1m_2m"
  | "over_2m"
  | "custom"

export interface PriceRangeDef {
  id: PriceRangeId
  label: string
  shortLabel: string
  min: number | null
  max: number | null
}

export const PRICE_RANGES: readonly PriceRangeDef[] = [
  {
    id: "all",
    label: "Tất cả mức giá",
    shortLabel: "Tất cả giá",
    min: null,
    max: null,
  },
  {
    id: "under_500k",
    label: "Dưới 500.000 ₫",
    shortLabel: "< 500k",
    min: 0,
    max: 500_000,
  },
  {
    id: "500k_1m",
    label: "500.000–1.000.000 ₫",
    shortLabel: "500k - 1tr",
    min: 500_000,
    max: 1_000_000,
  },
  {
    id: "1m_2m",
    label: "1.000.000–2.000.000 ₫",
    shortLabel: "1tr - 2tr",
    min: 1_000_000,
    max: 2_000_000,
  },
  {
    id: "over_2m",
    label: "Trên 2.000.000 ₫",
    shortLabel: "> 2tr",
    min: 2_000_000,
    max: null,
  },
  {
    id: "custom",
    label: "Tùy chọn khoảng giá...",
    shortLabel: "Khoảng giá tùy chọn",
    min: null,
    max: null,
  },
]

export type SortOptionId =
  | "default"
  | "price_asc"
  | "price_desc"
  | "name_asc"

export interface SortOptionDef {
  id: SortOptionId
  label: string
}

export const SORT_OPTIONS: readonly SortOptionDef[] = [
  { id: "default", label: "Mới nhất (Mặc định)" },
  { id: "price_asc", label: "Giá: Thấp đến cao" },
  { id: "price_desc", label: "Giá: Cao đến thấp" },
  { id: "name_asc", label: "Tên sản phẩm: A → Z" },
]

export interface ProductFilterState {
  search: string
  category: string
  occasion: OccasionId
  priceRange: PriceRangeId
  customMinPrice: number | null
  customMaxPrice: number | null
  sortBy: SortOptionId
}

export const DEFAULT_FILTER_STATE: ProductFilterState = {
  search: "",
  category: "Tất cả",
  occasion: "all",
  priceRange: "all",
  customMinPrice: null,
  customMaxPrice: null,
  sortBy: "default",
}

/** Chuẩn hóa chuỗi tiếng Việt bỏ dấu để tìm kiếm không phân biệt dấu. */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

export interface MinimalProductItem {
  id: string
  name: string
  code: string
  category: string | null
  price_vnd: number | null
  attributes?: Record<string, unknown> | null | undefined
}

/** Khớp dịp phù hợp dựa trên attributes, danh mục và tên sản phẩm. */
export function matchProductOccasion(
  product: MinimalProductItem,
  occasionId: OccasionId
): boolean {
  if (occasionId === "all") return true

  const def = OCCASIONS.find((o) => o.id === occasionId)
  if (!def || def.keywords.length === 0) return true

  // 1. Kiểm tra attributes.occasions hoặc attributes.occasionCodes nếu có
  const attrs = product.attributes ?? {}
  const rawOccasions = String(attrs.occasions || attrs.occasion || attrs.dịp || "")
  if (rawOccasions) {
    const normAttr = removeVietnameseTones(rawOccasions)
    if (def.keywords.some((kw) => normAttr.includes(removeVietnameseTones(kw)))) {
      return true
    }
  }

  // 2. Kiểm tra Category
  const cat = String(product.category ?? "")
  if (cat) {
    const normCat = removeVietnameseTones(cat)
    if (def.keywords.some((kw) => normCat.includes(removeVietnameseTones(kw)))) {
      return true
    }
  }

  // 3. Kiểm tra Tên sản phẩm
  const name = String(product.name ?? "")
  if (name) {
    const normName = removeVietnameseTones(name)
    if (def.keywords.some((kw) => normName.includes(removeVietnameseTones(kw)))) {
      return true
    }
  }

  return false
}

/** Khớp khoảng giá — sản phẩm Khoảng giá khớp khi khoảng của nó giao với khoảng lọc */
export function matchProductPrice(
  price: { min: number; max: number } | number | null,
  priceRangeId: PriceRangeId,
  customMin: number | null,
  customMax: number | null
): boolean {
  if (priceRangeId === "all") return true

  const span = typeof price === "number" ? { min: price, max: price } : price
  if (priceRangeId === "custom") return spanOverlaps(span, customMin, customMax)

  const def = PRICE_RANGES.find((p) => p.id === priceRangeId)
  if (!def) return true

  return spanOverlaps(span, def.min, def.max)
}

/** Lọc và sắp xếp danh sách sản phẩm */
export function filterAndSortProducts<T extends MinimalProductItem>(
  products: T[],
  filters: ProductFilterState
): T[] {
  let result = products

  // 1. Lọc theo từ khóa tìm kiếm (Tên, Mã SKU, Danh mục)
  const query = filters.search.trim()
  if (query) {
    const normQuery = removeVietnameseTones(query)
    result = result.filter((p) => {
      const normName = removeVietnameseTones(p.name || "")
      const normCode = removeVietnameseTones(p.code || "")
      const normCat = removeVietnameseTones(p.category || "")
      return (
        normName.includes(normQuery) ||
        normCode.includes(normQuery) ||
        normCat.includes(normQuery)
      )
    })
  }

  // 2. Lọc theo Danh mục
  if (filters.category && filters.category !== "Tất cả") {
    const normCatFilter = removeVietnameseTones(filters.category)
    result = result.filter((p) => {
      const normCat = removeVietnameseTones(p.category || "")
      return normCat.includes(normCatFilter) || normCatFilter.includes(normCat)
    })
  }

  // 3. Lọc theo Dịp
  if (filters.occasion !== "all") {
    result = result.filter((p) => matchProductOccasion(p, filters.occasion))
  }

  // 4. Lọc theo Khoảng giá
  if (filters.priceRange !== "all") {
    result = result.filter((p) =>
      matchProductPrice(
        productPriceSpan(p),
        filters.priceRange,
        filters.customMinPrice,
        filters.customMaxPrice
      )
    )
  }

  // 5. Sắp xếp
  if (filters.sortBy === "price_asc") {
    result = [...result].sort((a, b) => {
      const pA = productPriceSpan(a)?.min ?? Number.MAX_SAFE_INTEGER
      const pB = productPriceSpan(b)?.min ?? Number.MAX_SAFE_INTEGER
      return pA - pB
    })
  } else if (filters.sortBy === "price_desc") {
    result = [...result].sort((a, b) => {
      // Giá cao → thấp: xếp theo giá cao nhất của khoảng
      const pA = productPriceSpan(a)?.max ?? -1
      const pB = productPriceSpan(b)?.max ?? -1
      return pB - pA
    })
  } else if (filters.sortBy === "name_asc") {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }

  return result
}
