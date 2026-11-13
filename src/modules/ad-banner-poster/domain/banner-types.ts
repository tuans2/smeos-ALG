/**
 * banner-types.ts — Định nghĩa kiểu dữ liệu cho Công cụ 05: Tạo poster và banner quảng cáo.
 * Tuân thủ chuẩn Đa ngành (Multi-Industry First) và Clean Architecture.
 */

export type BannerAspectRatio =
  | "1:1"    // Vuông (Feed Post, Instagram, Zalo Shop)
  | "4:5"    // Đứng Portrait Feed (Facebook, Instagram)
  | "9:16"   // Dọc Full-Screen (Story, Reels, TikTok)
  | "16:9"   // Ngang Landscape (Web Banner, Facebook Cover)
  | "A4"     // Khổ đứng in ấn (Poster, Standee, Flyer A4/A3)

export interface BannerFormatSpec {
  readonly id: BannerAspectRatio
  readonly name: string
  readonly description: string
  readonly recommendedPx: string
  readonly ratioValue: number
  readonly isPrintable?: boolean | undefined
}

export const BANNER_FORMATS: readonly BannerFormatSpec[] = [
  {
    id: "1:1",
    name: "Vuông 1:1",
    description: "Bài đăng mạng xã hội (Facebook, Instagram, Zalo)",
    recommendedPx: "1080 × 1080 px",
    ratioValue: 1,
  },
  {
    id: "4:5",
    name: "Dọc Feed 4:5",
    description: "Tối ưu hiển thị di động trên Facebook & Instagram",
    recommendedPx: "1080 × 1350 px",
    ratioValue: 4 / 5,
  },
  {
    id: "9:16",
    name: "Story / Video 9:16",
    description: "Khung dọc cho Story, Reels, TikTok",
    recommendedPx: "1080 × 1920 px",
    ratioValue: 9 / 16,
  },
  {
    id: "16:9",
    name: "Banner ngang 16:9",
    description: "Ảnh bìa Facebook, Banner website, Newsletter",
    recommendedPx: "1920 × 1080 px",
    ratioValue: 16 / 9,
  },
  {
    id: "A4",
    name: "Poster in ấn A4",
    description: "Standee để bàn, poster dán cửa tiệm, ấn phẩm in",
    recommendedPx: "Khổ A4 (210 × 297 mm)",
    ratioValue: 1 / 1.414,
    isPrintable: true,
  },
] as const

export type BannerStylePresetId =
  | "MODERN_MINIMAL"
  | "VIBRANT_SALE"
  | "ELEGANT_LUXURY"
  | "FESTIVE_SEASON"
  | "BRAND_ACCENT"

export interface BannerCopyPayload {
  readonly headline: string
  readonly subHeadline: string
  readonly promotionBadge: string
  readonly ctaText: string
  readonly validityText?: string | undefined
}

export interface BannerBrandInfo {
  readonly shopName: string
  readonly hotline?: string | undefined
  readonly address?: string | undefined
  readonly logoUrl?: string | undefined
  readonly primaryColor?: string | undefined
}

export interface BannerProjectInput {
  readonly occasionKey: string
  readonly occasionLabel: string
  readonly industryKey: string
  readonly copy: BannerCopyPayload
  readonly productImageUrl?: string | undefined
  readonly brandInfo: BannerBrandInfo
  readonly stylePresetId: BannerStylePresetId
  readonly targetFormats: readonly BannerAspectRatio[]
}

export type BannerGenerationMode = "SINGLE_CALL_AI" | "TEMPLATE_LAYOUT"
