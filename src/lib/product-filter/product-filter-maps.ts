/**
 * SSOT Maps — Bảng ánh xạ chuẩn hoá cho hệ thống Lọc & Tìm kiếm ALG
 *
 * Đây là nguồn sự thật duy nhất (SSOT) cho tất cả mapping giữa:
 *   - Nhãn UI tiếng Việt ↔ Mã DB tiếng Anh
 *   - Biến thể có dấu / không dấu / hoa thường ↔ Canonical key
 *
 * Quy tắc mở rộng:
 *   - Thêm dáng hoa mới → thêm vào CATEGORY_CANONICAL
 *   - Thêm dịp tặng mới → thêm vào OCCASION_SLUG_MAP + OCCASION_NAME_KEYWORDS
 *   - Thêm loại hoa mới → thêm vào FLOWER_NAME_KEYWORDS
 *   - Thêm tone màu mới → thêm vào COLOR_SLUG_MAP + COLOR_NAME_KEYWORDS
 *
 * KHÔNG sao chép bảng này sang file khác. Import từ `@/lib/product-filter`.
 */

import { normalizeText } from "@/lib/normalize-text"

// ─────────────────────────────────────────────────────────────────────────────
// DÁNG HOA (Category)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ánh xạ hai chiều: mọi biến thể → canonical key.
 *
 * Key: giá trị sau normalizeText() (không dấu, thường, trim)
 * Value: canonical slug duy nhất cho mỗi dáng hoa
 *
 * Bao gồm:
 *   - Mã DB tiếng Anh (BOUQUET, BASKET…)
 *   - Nhãn UI tiếng Việt (Bó hoa, Giỏ hoa…)
 *   - Shape values (ROUND, TRIANGLE…)
 */
export const CATEGORY_CANONICAL: Record<string, string> = {
  // ── Mã DB (uppercase → normalizeText → lowercase) ──
  bouquet: "bo-hoa",
  basket: "gio-hoa",
  vase: "binh-hoa",
  box: "hop-hoa",
  stand: "ke-hoa",
  arrangement: "lang-hoa",
  // ── Nhãn UI tiếng Việt & biến thể danh mục CSDL (sau normalizeText) ──
  "bo hoa": "bo-hoa",
  "gio hoa": "gio-hoa",
  "binh hoa": "binh-hoa",
  "binh hoa / u hoa de ban": "binh-hoa",
  "binh hoa u hoa de ban": "binh-hoa",
  "u hoa de ban": "binh-hoa",
  "hop hoa": "hop-hoa",
  "ke hoa": "ke-hoa",
  "ke hoa khai truong": "ke-hoa",
  "lang hoa": "lang-hoa",
  "hoa chia buon": "ke-hoa", // Hoặc kệ hoa viếng
  "chau hoa / lan ho diep": "chau-hoa",
  "chau hoa lan ho diep": "chau-hoa",
  "chau hoa": "chau-hoa",
  "lan ho diep": "chau-hoa",
  lang: "lang-hoa",
  // ── Shape values thường gặp ──
  round: "bo-hoa",
  triangle: "gio-hoa",
  cascade: "binh-hoa",
  heart: "hop-hoa",
  vertical: "ke-hoa",
}

/** Trả canonical slug hoặc null nếu không nhận dạng được. */
export function categoryCanonical(value: string | null | undefined): string | null {
  if (!value) return null
  return CATEGORY_CANONICAL[normalizeText(value)] ?? null
}

/**
 * Trả về danh sách tất cả các biến thể category (DB code, UI label...) thuộc cùng canonical slug.
 * Dùng cho truy vấn SQL `category IN (...)` ở tầng repository.
 */
export function getCategoryVariants(canonicalOrLabel: string): string[] {
  const targetSlug = categoryCanonical(canonicalOrLabel) ?? canonicalOrLabel
  const variants: string[] = []
  for (const [key, slug] of Object.entries(CATEGORY_CANONICAL)) {
    if (slug === targetSlug) {
      variants.push(key)
    }
  }
  return Array.from(new Set(variants))
}

// ─────────────────────────────────────────────────────────────────────────────
// DỊP TẶNG (Occasion)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ánh xạ nhãn UI → slug lưu trong `attributes.occasionCodes`.
 * lookupNormalized() cho phép mọi biến thể nhãn đều khớp.
 */
export const OCCASION_SLUG_MAP: Record<string, string> = {
  "Sinh nhật": "sinh-nhat",
  "Khai trương": "khai-truong",
  "Kỷ niệm": "ky-niem",
  "Chúc mừng": "chuc-mung",
  "Cảm ơn": "cam-on",
  "Chia buồn": "chia-buon",
}

/**
 * Từ khoá fallback — dùng để khớp trong TÊN SẢN PHẨM
 * khi `attributes.occasionCodes` chưa được điền đầy đủ.
 */
export const OCCASION_NAME_KEYWORDS: Record<string, string[]> = {
  "Sinh nhật": ["sinh nhat", "birthday", "sinh nhat"],
  "Khai trương": ["khai truong", "khai nghiep", "grand opening"],
  "Kỷ niệm": ["ky niem", "anniversary", "ky niem"],
  "Chúc mừng": ["chuc mung", "congratulation"],
  "Cảm ơn": ["cam on", "thank"],
  "Chia buồn": ["chia buon", "tang le", "condolence"],
}

// ─────────────────────────────────────────────────────────────────────────────
// LOẠI HOA (Flower Type)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Từ khoá tìm kiếm cho từng loại hoa.
 * Khớp trong tên sản phẩm hoặc `attributes.flowerTypes`.
 */
export const FLOWER_NAME_KEYWORDS: Record<string, string[]> = {
  "Hoa hồng": ["hoa hong", "hong", "rose", "ohara"],
  "Lan hồ điệp": ["lan ho diep", "lan", "orchid", "phalaenopsis"],
  "Hướng dương": ["huong duong", "sunflower"],
  "Cẩm tú cầu": ["cam tu cau", "hydrangea"],
  "Baby": ["baby", "gypsophila"],
  "Cúc tana": ["cuc tana", "tana", "chrysanthemum"],
  "Tulip": ["tulip"],
  "Lily": ["lily", "loa ken"],
}

// ─────────────────────────────────────────────────────────────────────────────
// TONE MÀU (Color Tone)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ánh xạ nhãn UI → slug lưu trong `attributes.color`.
 */
export const COLOR_SLUG_MAP: Record<string, string[]> = {
  Pastel: ["pastel"],
  Đỏ: ["do", "red", "do tuoi"],
  "Vàng / Cam": ["vang", "cam", "yellow", "orange", "vang cam"],
  Hồng: ["hong", "pink", "rose"],
  Trắng: ["trang", "white"],
  "Xanh / Tím": ["xanh", "tim", "blue", "purple", "xanh la", "xanh tim"],
}

/**
 * Từ khoá fallback trong tên sản phẩm khi `attributes.color` chưa điền.
 */
export const COLOR_NAME_KEYWORDS: Record<string, string[]> = {
  Pastel: ["pastel", "nhe", "diu"],
  Đỏ: ["do", "red", "cam do"],
  "Vàng / Cam": ["vang", "cam", "yellow", "orange"],
  Hồng: ["hong", "pink", "rose"],
  Trắng: ["trang", "white", "tinh khoi"],
  "Xanh / Tím": ["xanh", "tim", "blue", "purple"],
}
