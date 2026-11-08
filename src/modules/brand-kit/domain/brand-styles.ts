/**
 * Ba phong cách của mục Thương hiệu (PO 08/11/2026): mỗi lượt sinh luôn có đủ 3 phương án, mỗi phương án
 * một phong cách. Bảng màu, phông chữ, kiểu logo và kiểu trang landing đi theo phong cách để Bộ nhận diện
 * (bước 2) và Landing page (bước 3) đồng bộ với nhau. Dữ liệu thuần — không import hạ tầng.
 */
import type { CatalogStyleId, CatalogTemplateId } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

export const BRAND_STYLE_KEYS = ["LUXURY", "YOUTHFUL", "RUSTIC"] as const
export type BrandStyleKey = (typeof BRAND_STYLE_KEYS)[number]

export type LogoLayout = "MONOGRAM" | "BADGE" | "WORDMARK"

export interface BrandPalette {
  readonly primary: string
  readonly secondary: string
  readonly accent: string
  readonly background: string
  readonly text: string
}

export interface BrandStyle {
  readonly key: BrandStyleKey
  /** Tên hiện cho chủ tiệm */
  readonly label: string
  readonly description: string
  /** Gợi ý giọng văn cho AI viết khẩu hiệu — không hiện trên màn hình */
  readonly voiceHint: string
  readonly palette: BrandPalette
  readonly fontHeading: string
  readonly fontBody: string
  readonly logoLayout: LogoLayout
  /** Kiểu trang khách xem (`/c/[slug]`) cho Landing page chính thức */
  readonly landing: { readonly archetypeId: string; readonly styleId: CatalogStyleId; readonly templateId: CatalogTemplateId }
  /** Khẩu hiệu dự phòng khi AI không chạy — `{name}` thay bằng tên cửa hàng */
  readonly fallbackSlogans: readonly string[]
}

export const BRAND_STYLES: Readonly<Record<BrandStyleKey, BrandStyle>> = {
  LUXURY: {
    key: "LUXURY",
    label: "Sang trọng tinh tế",
    description: "Tông trầm, phông chữ có chân thanh lịch, tôn sản phẩm cao cấp và khách quà tặng doanh nghiệp.",
    voiceHint: "trang nhã, chắc chắn, ít chữ, gợi sự chỉn chu và đẳng cấp",
    palette: { primary: "#1F2A44", secondary: "#C9A96E", accent: "#B08D57", background: "#FBF8F3", text: "#1A1A1A" },
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    logoLayout: "MONOGRAM",
    landing: { archetypeId: "minimal-luxury", styleId: "S03_QUIET_LUXURY", templateId: "T03_PREMIUM_LOOKBOOK" },
    fallbackSlogans: ["Tinh tế trong từng chi tiết", "Chỉn chu cho những dịp quan trọng", "Món quà nói thay lời trân trọng"],
  },
  YOUTHFUL: {
    key: "YOUTHFUL",
    label: "Tươi trẻ năng động",
    description: "Màu tươi, phông chữ khoẻ khoắn, hợp khách trẻ, mua nhanh trên mạng xã hội.",
    voiceHint: "vui tươi, gần gũi, có nhịp, hợp người trẻ",
    palette: { primary: "#E8505B", secondary: "#FFD166", accent: "#06A77D", background: "#FFFFFF", text: "#1B1B1F" },
    fontHeading: "Montserrat",
    fontBody: "Inter",
    logoLayout: "BADGE",
    landing: { archetypeId: "festive-sale", styleId: "S04_BOLD_POP", templateId: "T04_BENTO_SHOWCASE" },
    fallbackSlogans: ["Tươi mới mỗi ngày", "Vui từ lúc nhận quà", "Chọn nhanh, tặng liền tay"],
  },
  RUSTIC: {
    key: "RUSTIC",
    label: "Mộc mạc gần gũi",
    description: "Tông đất ấm, phông chữ mềm, kể câu chuyện tay nghề và sự chân thành của cửa hàng.",
    voiceHint: "ấm áp, chân thành, mộc mạc, như lời người quen",
    palette: { primary: "#7A5C3E", secondary: "#A3B18A", accent: "#D4A373", background: "#FAF6EE", text: "#2F2A24" },
    fontHeading: "Lora",
    fontBody: "Merriweather",
    logoLayout: "WORDMARK",
    landing: { archetypeId: "warm-artisan", styleId: "S05_ORGANIC_NATURAL", templateId: "T01_SIGNATURE_COLLECTION" },
    fallbackSlogans: ["Làm bằng tay, trao bằng tim", "Mộc mạc mà chân thành", "Gần gũi như người nhà"],
  },
}

export function isBrandStyleKey(v: unknown): v is BrandStyleKey {
  return typeof v === "string" && (BRAND_STYLE_KEYS as readonly string[]).includes(v)
}

/**
 * Phong cách của phương án thứ `index` (0-based) trong một loại: 3 phương án đầu đủ 3 phong cách,
 * phương án tạo thêm xoay vòng lại từ đầu.
 */
export function styleForIndex(index: number): BrandStyleKey {
  return BRAND_STYLE_KEYS[((index % BRAND_STYLE_KEYS.length) + BRAND_STYLE_KEYS.length) % BRAND_STYLE_KEYS.length]!
}

/** Lần lặp lại của cùng phong cách (0 = phương án gốc, 1+ = biến thể tạo thêm). */
export function variantForIndex(index: number): number {
  return Math.floor(Math.max(0, index) / BRAND_STYLE_KEYS.length)
}
