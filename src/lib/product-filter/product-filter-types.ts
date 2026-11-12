/**
 * SSOT Types — Hệ thống Lọc & Tìm kiếm Sản phẩm ALG
 *
 * Tất cả interface/type liên quan đến search & filter đều định nghĩa ở đây.
 * Mọi module import từ `@/lib/product-filter`, không tự định nghĩa riêng.
 */

/** Khoảng giá (min inclusive, max inclusive). */
export interface PriceRange {
  min: number
  max: number
  label?: string
}

/**
 * Bộ lọc chuẩn — dùng chung cho mọi context (picker, wizard, quick-collection…).
 * Tất cả trường là optional; không truyền = không lọc theo tiêu chí đó.
 */
export interface ProductFilterCriteria {
  /** Khoảng giá tự nhập (Giá từ / Đến). */
  priceMin?: number
  priceMax?: number
  /** Danh sách khung giá nhanh (chọn nhiều). Ưu tiên hơn priceMin/priceMax khi có. */
  priceRanges?: PriceRange[]
  /** Dịp tặng — nhãn UI tiếng Việt (vd: "Sinh nhật") hoặc slug DB (vd: "sinh-nhat"). */
  occasion?: string
  /** Dáng hoa — nhãn UI tiếng Việt (vd: "Sản phẩm") hoặc mã DB (vd: "BOUQUET"). */
  category?: string
  /** Nguyên liệu — nhãn UI (vd: "Hoa hồng") hoặc từ khoá (vd: "hong"). */
  flowerType?: string
  /** Tone màu — nhãn UI (vd: "Pastel") hoặc slug (vd: "pastel"). */
  colorTone?: string
  /** Tìm kiếm tự do — khớp tên hoặc mã sản phẩm. */
  search?: string
}

/**
 * Sản phẩm tối giản để engine lọc/chấm điểm.
 * Các field là union của những gì API trả về — không phải tất cả đều có.
 */
export interface FilterableProduct {
  id: string
  code: string
  name: string
  /** Giá tham chiếu (VND). null = Liên hệ báo giá. */
  price_vnd?: number | null
  /** Alias cho price_vnd (dùng trong QuickCollectionCandidate). */
  price?: number | null
  /** Mã DB: BOUQUET / BASKET / VASE / BOX / STAND / ARRANGEMENT. */
  category?: string | null
  /** Dáng hoa bổ sung: ROUND / TRIANGLE / CASCADE / HEART / VERTICAL. */
  shape?: string | null
  /** Tone màu từ attributes. */
  colorTheme?: string | null
  /** Dịp tặng — mảng slug (vd: ["sinh-nhat", "khai-truong"]). */
  occasions?: string[]
  /** Nguyên liệu — mảng tên (vd: ["Hoa hồng", "Lan hồ điệp"]). */
  flowerTypes?: string[]
  /** JSONB attributes từ DB — fallback khi các field trên chưa được map. */
  attributes?: Record<string, unknown> | null
  /** Trạng thái sản phẩm. */
  status?: string
  /** URL ảnh chính (từ storage). */
  masterImageUrl?: string
  /** URL ảnh (dùng trong QuickCollection). */
  imageUrl?: string | null
  /** Link Google Drive — fallback thumbnail. */
  driveLink?: string
}

/** Kết quả sau khi lọc + chấm điểm một sản phẩm. */
export interface ScoredProduct<T extends FilterableProduct = FilterableProduct> {
  product: T
  /** Điểm tổng (0–100+). Sắp xếp giảm dần → sản phẩm khớp nhất lên đầu. */
  score: number
  /** Các tag giải thích lý do khớp (vd: ["Đúng tầm giá", "Sản phẩm", "Hoa hồng"]). */
  matchTags: string[]
}
